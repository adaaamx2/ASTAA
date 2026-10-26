import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "@fontsource-variable/manrope"
import StudyCanvas from "./StudyCanvas"
import {
  readAudioState,
  tracksForExport,
  type AudioState,
} from "../audio/engine"
import { useMixedPreview } from "../audio/playback"
import { useStudioSession } from "../workspace/Session"
import { cloud, type CloudProject } from "../workspace/cloud"
import DownloadButton from "../media/DownloadButton"
import { publicAssetUrl, saveBlob, type DownloadFile } from "../media/files"
import { mixMp4, type MixTrack } from "../media/mux"
import SyncPanel from "./SyncPanel"
import { verifySync, type ClockSamples } from "./sync"
import { studies, type StudyId } from "./studies"
import { brandSpec } from "./brand-spec"
import { type Generation } from "./api"
import Captions from "../production/Captions"
import { activePacks, estimateWords } from "../production/timing"
import { audioCaptionWords } from "../audio/caption-timeline"
import type { CaptionExportRequest } from "../media/caption-export"
import "./motion-lab.css"

type Artifact = {
  id: StudyId
  url: string
  width: number
  height: number
  fps: number
  duration: number
  bytes: number
  sha256: string
}

interface Props {
  embedded?: boolean
  initialId?: StudyId
  projectId?: string
  projectTitle?: string
  cloudProject?: CloudProject | null
}
export default function MotionLab({
  embedded = false,
  initialId = "enbu",
  projectId,
  projectTitle,
  cloudProject,
}: Props) {
  const [id, setId] = useState<StudyId>(initialId)
  const { token, session } = useStudioSession()
  const study = studies.find((study) => study.id === id)!
  const reviewOnly =
    (id === "brand-strategy" && !brandSpec.visualApproval) ||
    id === "laboral-clothing"
  const visualKey = `${id}:${id === "brand-strategy" ? brandSpec.version : 1}`
  const [readyStudy, setReadyStudy] = useState<string | null>(null)
  const visualReady =
    (id !== "brand-strategy" && id !== "laboral-clothing") ||
    readyStudy === visualKey
  const onVisualReady = useCallback(() => setReadyStudy(visualKey), [visualKey])
  const [time, setTime] = useState(0)
  const mixedPreview = useMixedPreview(projectId || id)
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  useEffect(() => {
    if (!mixedPreview.hasAudio) return
    setTime(mixedPreview.time)
    setPlaying(mixedPreview.playing)
  }, [mixedPreview.hasAudio, mixedPreview.time, mixedPreview.playing])
  const [pack, setPack] = useState("karaoke")
  const [captions, setCaptions] = useState(false)
  const exportLabel = reviewOnly
    ? "Exportar MP4 de revisión"
    : captions
      ? "Exportar MP4"
      : "Exportar MP4 final"
  const [audioByStudy, setAudio] =
    useState<Partial<Record<StudyId, Generation>>>({})
  const [newAudio, setNewAudio] = useState<AudioState | null>(() =>
    readAudioState(projectId || id),
  )
  useEffect(() => {
    let signature = ""
    const receive = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail.id !== (projectId || id)) return
      const next = JSON.stringify([detail.state.clips, detail.state.duration])
      if (next === signature) return
      signature = next
      setNewAudio(detail.state)
    }
    window.addEventListener("audio-state-updated", receive)
    return () => window.removeEventListener("audio-state-updated", receive)
  }, [projectId, id])
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [filesState, setFilesState] = useState("")
  const [settingsMessage, setSettingsMessage] = useState("")
  const [mixMessage, setMixMessage] = useState("")
  const [mixing, setMixing] = useState(false)
  const [audioError, setAudioError] = useState("")
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(true)
  const music = useRef<HTMLAudioElement>(null)
  const [waitingForVoice, setWaitingForVoice] = useState(false)
  const [playbackVersion, setPlaybackVersion] = useState(0)
  const [clockSamples, setClockSamples] = useState<ClockSamples>({
    count: 0,
    maxDriftMs: 0,
  })
  const clockData = useRef<ClockSamples>({ count: 0, maxDriftMs: 0 })
  const voice = useRef<HTMLAudioElement>(null),
    sfx = useRef<HTMLAudioElement>(null)
  const atmosphere = useRef<HTMLAudioElement>(null)
  const current = useRef(time)
  current.current = time
  const audio = session?.authenticated ? audioByStudy[id] : undefined
  const activeSfx = session?.authenticated
    ? audio?.sfx || cloudProject?.media?.sfx
    : undefined
  const activeMusic = session?.authenticated
    ? audio?.music || cloudProject?.media?.music
    : undefined
  const viewSettings = useMemo(
    () => ({ captionPack: pack, captions, soundEnabled, musicEnabled }),
    [pack, captions, soundEnabled, musicEnabled],
  )
  useEffect(() => {
    const saved = cloudProject?.settings
    if (
      saved &&
      typeof saved.captionPack === "string" &&
      activePacks.includes(saved.captionPack as typeof activePacks[number])
    )
      setPack(saved.captionPack)
    if (typeof saved?.captions === "boolean") setCaptions(saved.captions)
    if (typeof saved?.musicEnabled === "boolean")
      setMusicEnabled(saved.musicEnabled)
    if (typeof saved?.soundEnabled === "boolean")
      setSoundEnabled(saved.soundEnabled)
  }, [cloudProject?.id, cloudProject?.settings])
  async function saveViewSettings() {
    if (!session?.authorized) {
      setSettingsMessage(
        "Inicia sesión y autoriza tu cuenta para guardar estos ajustes en Supabase.",
      )
      return
    }
    setSettingsMessage("Guardando ajustes…")
    try {
      const latest = (await cloud.load(projectId || id, token)).project
      await cloud.save(
        projectId || id,
        {
          title: projectTitle || study.title,
          kind: "study",
          template: id,
          settings: { ...(latest?.settings || {}), ...viewSettings },
        },
        latest?.revision || 0,
        token,
      )
      persistedView.current = JSON.stringify(viewSettings)
      setSettingsMessage("Ajustes guardados en Supabase.")
      window.dispatchEvent(
        new CustomEvent("studio-project-updated", { detail: projectId || id }),
      )
    } catch (error) {
      setSettingsMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los ajustes.",
      )
    }
  }
  const persistedView = useRef("")
  useEffect(() => {
    const collect = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail.id === (projectId || id))
        Object.assign(detail.settings, viewSettings)
    }
    window.addEventListener("studio-capture-settings", collect)
    return () => window.removeEventListener("studio-capture-settings", collect)
  }, [projectId, id, viewSettings])
  useEffect(() => {
    if (!session?.authorized || !cloudProject) return
    const serialized = JSON.stringify(viewSettings)
    if (persistedView.current === serialized) return
    const timer = setTimeout(() => {
      void saveViewSettings()
    }, 1400)
    return () => clearTimeout(timer)
  }, [viewSettings, cloudProject?.id, session?.authorized, token])
  const syncReport = useMemo(
    () =>
      audio ? verifySync(audio.text, audio.voice.words, voiceDuration) : null,
    [audio, voiceDuration],
  )
  const artifact = artifacts.find((artifact) => artifact.id === id)
  const duration = newAudio?.clips.some((c) => c.kind === "voice" && c.asset)
    ? newAudio.duration
    : Math.max(study.duration, voiceDuration)
  async function exportMix() {
    if (!artifact || mixing) return
    setMixing(true)
    let release = () => {}
    try {
      const latestAudio = readAudioState(projectId || id)
      const hasLocalMix = latestAudio?.clips.some((clip) => clip.asset)
      const fresh =
        !hasLocalMix && audio?.hosted !== false && token && cloudProject
          ? (await cloud.load(projectId || id, token)).project
          : null
      const tracks: MixTrack[] = []
      const add = (
        asset: Generation["voice"] | null | undefined,
        volume: number,
        loop = false,
      ) => {
        if (asset)
          tracks.push({
            file: {
              url: asset.url,
              filename: asset.name || `${asset.id}.mp3`,
              mime: (asset.mimeType || "audio/mpeg") as DownloadFile["mime"],
              bytes: asset.bytes,
              sha256: asset.sha256,
            },
            volume,
            loop,
          })
      }
      add(fresh?.media?.voice || audio?.voice, 1)
      if (soundEnabled) {
        const effect = fresh?.media?.sfx || activeSfx
        if (effect) add(effect, 0.35)
        else if (id === "enbu" || id === "blue-hour")
          tracks.push({
            file: {
              url: publicAssetUrl(`/exports/study-${id}-atmosphere.wav`),
              filename: "atmosphere.wav",
              mime: "audio/wav",
            },
            volume: 0.35,
            loop: true,
          })
      }
      if (musicEnabled) add(fresh?.media?.music || activeMusic, 0.18, true)
      const currentMix =
        hasLocalMix && latestAudio ? await tracksForExport(latestAudio) : null
      if (currentMix) release = currentMix.release
      const blob = await mixMp4(
        {
          url: publicAssetUrl(artifact.url),
          filename: `${id}.mp4`,
          mime: "video/mp4",
          sha256: artifact.sha256,
          bytes: artifact.bytes,
        },
        currentMix?.tracks || tracks,
        latestAudio?.duration || duration,
        setMixMessage,
        captions
          ? {
              words,
              pack,
              width: study.width,
              height: study.height,
              fps: artifact.fps,
              viewport: { width: study.width / 2, height: study.height / 2 },
              accent: id === "enbu" ? "#ffd18a" : "#c5e5ff",
            }
          : undefined,
        { normalize: latestAudio?.normalize },
      )
      saveBlob(
        blob,
        `${projectTitle || id}${reviewOnly ? "-revision" : ""}-con-audio.mp4`,
      )
      setMixMessage(
        `MP4${
          reviewOnly ? " de revisión" : ""
        } descargado. ${currentMix?.summary || "Pistas anteriores activas"}. ${
          captions
            ? "La grabación de captions requiere composición visual; para no repetirla usa el MP4 ya renderizado en Voz y audio."
            : "El vídeo base no se ha modificado."
        }`,
      )
    } catch (error) {
      setMixMessage(
        error instanceof Error ? error.message : "No se pudo mezclar el audio.",
      )
    } finally {
      release()
      setMixing(false)
    }
  }
  const words = useMemo(
    () =>
      newAudio?.clips.some((c) => c.kind === "voice" && c.asset)
        ? audioCaptionWords(newAudio, [])
        : audio?.voice.words?.length
          ? audio.voice.words
          : estimateWords([
              {
                id: 1,
                title: study.title,
                start: 0,
                end: duration,
                voice: audio?.text || study.narration,
                visual: "",
              },
            ]),
    [audio, study, duration, newAudio],
  )
  useEffect(() => {
    const collect = (event: Event) => {
      const detail = (event as CustomEvent<CaptionExportRequest>).detail
      if (detail.id !== (projectId || id) || !captions) return
      detail.captions = {
        words,
        pack,
        width: study.width,
        height: study.height,
        viewport: { width: study.width / 2, height: study.height / 2 },
        fps: artifact?.fps || 30,
        accent: id === "enbu" ? "#ffd18a" : "#c5e5ff",
      }
    }
    window.addEventListener("studio-export-captions", collect)
    return () => window.removeEventListener("studio-export-captions", collect)
  }, [projectId, id, captions, words, pack, study, artifact?.fps])
  const onGenerated = useCallback(
    (generation: Generation) => {
      setAudio((previous) => ({
        ...previous,
        [id]:
          generation.hosted === false
            ? {
                ...generation,
                sfx: generation.sfx || previous[id]?.sfx || null,
                music: generation.music || previous[id]?.music || null,
              }
            : generation,
      }))
      setPlaying(false)
      setTime(0)
      setCaptions(true)
      setVoiceDuration(0)
      if (generation.hosted !== false) {
        setSoundEnabled(Boolean(generation.sfx))
        window.dispatchEvent(
          new CustomEvent("studio-project-updated", {
            detail: projectId || id,
          }),
        )
      }
    },
    [id, projectId],
  )
  useEffect(() => {
    if (cloudProject?.generation) {
      setAudio((previous) =>
        previous[id]?.hosted === false &&
        previous[id]?.voice.id !== cloudProject.generation!.voice.id
          ? previous
          : { ...previous, [id]: cloudProject.generation! },
      )
      setPlaying(false)
      setTime(0)
      setVoiceDuration(0)
      setCaptions(
        typeof cloudProject.settings?.captions === "boolean"
          ? cloudProject.settings.captions
          : true,
      )
    } else if (cloudProject) {
      setAudio((previous) =>
        previous[id]?.hosted === false
          ? previous
          : { ...previous, [id]: undefined },
      )
    }
    if (
      cloudProject &&
      typeof cloudProject.settings?.soundEnabled !== "boolean"
    )
      setSoundEnabled(Boolean(cloudProject.media?.sfx))
  }, [
    cloudProject?.id,
    cloudProject?.generation?.voice.id,
    cloudProject?.generation?.sfx?.id,
    cloudProject?.generation?.music?.id,
    id,
  ])
  const wasAuthenticated = useRef(Boolean(session?.authenticated))
  useEffect(() => {
    if (session?.authenticated) {
      wasAuthenticated.current = true
    } else {
      setAudio({})
      setVoiceDuration(0)
      // Public visual previews may autoplay; an actual sign-out must stop
      // private playback. Media selectors also gate access synchronously.
      if (wasAuthenticated.current) setPlaying(false)
      wasAuthenticated.current = false
    }
  }, [session?.authenticated, session?.userId])
  useEffect(() => {
    const track = music.current
    if (
      mixedPreview.hasAudio ||
      !track ||
      !playing ||
      !musicEnabled ||
      !visualReady
    ) {
      track?.pause()
      return
    }
    let frame = 0,
      stopped = false,
      pending = false,
      failed = false
    track.loop = true
    track.volume = 0.12
    const tick = () => {
      if (stopped) return
      const main = voice.current
      if (audio && main && !main.ended && (main.paused || main.readyState < 3))
        track.pause()
      else {
        if (Number.isFinite(track.duration) && track.duration > 0) {
          const target = current.current % track.duration
          if (Math.abs(track.currentTime - target) > 0.15)
            track.currentTime = target
        }
        if (track.paused && !pending && !failed) {
          pending = true
          void track
            .play()
            .catch(() => {
              failed = true
              if (!stopped)
                setAudioError("No se pudo reproducir la música guardada.")
            })
            .finally(() => {
              pending = false
            })
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      track.pause()
    }
  }, [
    mixedPreview.hasAudio,
    activeMusic?.url,
    playing,
    musicEnabled,
    playbackVersion,
    audio,
    visualReady,
  ])
  async function loadFiles() {
    setFilesState("Comprobando archivos…")
    try {
      const response = await fetch(publicAssetUrl("/exports/studies.json"), {
        cache: "no-store",
      })
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.artifacts)) throw new Error()
      const valid = data.artifacts.filter(
        (artifact: Artifact) =>
          studies.some(
            (study) => study.id === artifact.id && study.url === artifact.url,
          ) && artifact.bytes > 0,
      )
      setArtifacts(valid)
      setFilesState(`${valid.length} de ${studies.length} MP4 disponibles`)
    } catch {
      setFilesState(
        "Render MP4 pendiente; la animación ya funciona en directo.",
      )
    }
  }
  useEffect(() => {
    void loadFiles()
    document.title = "Motion Lab · YT Automation"
  }, [])
  useEffect(() => {
    clockData.current = { count: 0, maxDriftMs: 0 }
    setClockSamples({ ...clockData.current })
  }, [id, audio?.voice.id])
  useEffect(() => {
    const track = voice.current
    if (
      !playing ||
      !audio ||
      !track ||
      track.paused ||
      track.seeking ||
      track.ended ||
      track.readyState < 3
    )
      return
    clockData.current = {
      count: clockData.current.count + 1,
      maxDriftMs: Math.max(
        clockData.current.maxDriftMs,
        Math.abs(time - track.currentTime) * 1000,
      ),
    }
    if (clockData.current.count % 15 === 0)
      setClockSamples({ ...clockData.current })
  }, [time, playing, audio])
  useEffect(() => {
    if (mixedPreview.hasAudio || !playing || !visualReady) {
      setWaitingForVoice(false)
      voice.current?.pause()
      sfx.current?.pause()
      atmosphere.current?.pause()
      return
    }
    let frame = 0,
      stopped = false,
      effectsFailed = false,
      effectPending = false
    const from = current.current
    const start = performance.now()
    let tailStart: number | null = null
    let tailBase = from
    setAudioError("")
    const voiceTrack = voice.current,
      sfxTrack = soundEnabled
        ? activeSfx
          ? sfx.current
          : atmosphere.current
        : null
    function syncEffects(position: number) {
      if (!sfxTrack || effectsFailed) return
      sfxTrack.volume = activeSfx ? 0.16 : 0.55
      sfxTrack.loop = true
      if (Number.isFinite(sfxTrack.duration) && sfxTrack.duration > 0) {
        const desired = position % sfxTrack.duration
        if (sfxTrack.paused || Math.abs(sfxTrack.currentTime - desired) > 0.12)
          sfxTrack.currentTime = desired
      }
      if (sfxTrack.paused && !effectPending) {
        effectPending = true
        void sfxTrack
          .play()
          .catch(() => {
            if (!stopped) {
              effectsFailed = true
              setAudioError(
                "No se pudieron reproducir los SFX. La voz sigue siendo el reloj de los subtítulos.",
              )
            }
          })
          .finally(() => {
            effectPending = false
          })
      }
    }
    if (voiceTrack && audio) {
      setWaitingForVoice(true)
      const finiteDuration =
        Number.isFinite(voiceTrack.duration) && voiceTrack.duration > 0
          ? voiceTrack.duration
          : null
      voiceTrack.currentTime = finiteDuration
        ? Math.min(from, finiteDuration)
        : from
      voiceTrack.volume = 1
      if (finiteDuration && from >= finiteDuration) {
        setWaitingForVoice(false)
        tailStart = start
        tailBase = from
        syncEffects(from)
      } else
        void voiceTrack
          .play()
          .then(() => {
            if (!stopped) {
              setWaitingForVoice(false)
              syncEffects(voiceTrack.currentTime)
            }
          })
          .catch(() => {
            if (!stopped) {
              setAudioError(
                "No se pudo reproducir la voz. Los subtítulos se han detenido; revisa el enlace del audio.",
              )
              setPlaying(false)
            }
          })
    } else syncEffects(from)
    const onMetadata = () =>
      syncEffects(
        voiceTrack && audio ? voiceTrack.currentTime : current.current,
      )
    sfxTrack?.addEventListener("loadedmetadata", onMetadata)
    const onWaiting = () => {
      if (!stopped) setWaitingForVoice(true)
      sfxTrack?.pause()
    }
    const onVoicePlaying = () => {
      if (!stopped) setWaitingForVoice(false)
    }
    const onVoicePaused = () => {
      if (!stopped && !voiceTrack?.ended) setWaitingForVoice(true)
    }
    const onVoiceEnded = () => {
      if (!stopped) setWaitingForVoice(false)
    }
    voiceTrack?.addEventListener("waiting", onWaiting)
    voiceTrack?.addEventListener("stalled", onWaiting)
    voiceTrack?.addEventListener("playing", onVoicePlaying)
    voiceTrack?.addEventListener("pause", onVoicePaused)
    voiceTrack?.addEventListener("ended", onVoiceEnded)
    function positionAt(now: number) {
      if (!audio || !voiceTrack) return from + (now - start) / 1000
      if (tailStart !== null) return tailBase + (now - tailStart) / 1000
      if (voiceTrack.ended) {
        tailStart = now
        tailBase = Number.isFinite(voiceTrack.duration)
          ? voiceTrack.duration
          : voiceTrack.currentTime
        return tailBase
      }
      return voiceTrack.currentTime
    }
    const tick = (now: number) => {
      if (stopped) return
      const elapsed = positionAt(now)
      if (
        voiceTrack &&
        audio &&
        !voiceTrack.ended &&
        (voiceTrack.paused || voiceTrack.readyState < 3)
      )
        sfxTrack?.pause()
      else syncEffects(elapsed)
      if (elapsed >= duration) {
        if (audio) {
          setTime(0)
          setPlaying(false)
          return
        }
        setTime(Math.floor((elapsed % duration) * 60) / 60)
      } else setTime(Math.floor(elapsed * 60) / 60)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      voiceTrack?.pause()
      sfxTrack?.pause()
      sfxTrack?.removeEventListener("loadedmetadata", onMetadata)
      voiceTrack?.removeEventListener("waiting", onWaiting)
      voiceTrack?.removeEventListener("stalled", onWaiting)
      voiceTrack?.removeEventListener("playing", onVoicePlaying)
      voiceTrack?.removeEventListener("pause", onVoicePaused)
      voiceTrack?.removeEventListener("ended", onVoiceEnded)
    }
  }, [
    mixedPreview.hasAudio,
    playing,
    visualReady,
    id,
    duration,
    audio,
    soundEnabled,
    playbackVersion,
    artifact?.url,
    activeSfx?.url,
  ])
  function select(next: StudyId) {
    mixedPreview.pause()
    voice.current?.pause()
    sfx.current?.pause()
    atmosphere.current?.pause()
    setPlaying(false)
    setId(next)
    setTime(0)
    setVoiceDuration(0)
    setAudioError("")
  }
  function seek(value: number, resume = false) {
    const next = Math.max(0, Math.min(duration - 1 / 60, value))
    if (mixedPreview.hasAudio) {
      mixedPreview.seek(next, resume)
      return
    }
    if (voice.current && audio)
      voice.current.currentTime = Number.isFinite(voice.current.duration)
        ? Math.min(next, voice.current.duration)
        : next
    const effects = activeSfx ? sfx.current : atmosphere.current
    if (effects && Number.isFinite(effects.duration) && effects.duration > 0)
      effects.currentTime = next % effects.duration
    setPlaying(resume)
    setTime(next)
    setPlaybackVersion((value) => value + 1)
  }
  const viewport = { width: study.width / 2, height: study.height / 2 }
  return (
    <div className={`ml-shell ${embedded ? "ml-embedded" : ""}`}>
      {!embedded && (
        <header className="ml-topbar">
          <a className="ml-brand" href="#motion-lab">
            <svg viewBox="0 0 28 28" aria-hidden="true">
              <path d="M3 4h16v16H3zM9 10h16v16H9z" />
            </svg>
            <span>
              yt automation<small>MOTION LAB / VOL. 01</small>
            </span>
          </a>
          <nav aria-label="Espacios de trabajo">
            <a className="active" href="#motion-lab" aria-current="page">
              Estudio visual
            </a>
            <a href="#workspace">Finn Lab</a>
            <a href="#library">Biblioteca</a>
          </nav>
          <span className="ml-status-dot">FRAME BY FRAME</span>
        </header>
      )}
      <main className="ml-main">
        {!embedded && (
          <>
            <section className="ml-intro">
              <div>
                <p className="ml-kicker">
                  REFERENCIAS REALES. ESTILOS REUTILIZABLES.
                </p>
                <h1>
                  No es un frame.
                  <br />
                  <span>Es lo que pasa después.</span>
                </h1>
                <p>
                  Fuego que sigue al filo. Un lago que respira.
                  <br />
                  Dos recreaciones procedurales, dibujadas y animadas desde
                  cero.
                </p>
              </div>
              <div className="ml-edition">
                <b>{String(studies.length).padStart(2, "0")}</b>
                <span>
                  ESTUDIOS
                  <br />
                  DE MOVIMIENTO
                </span>
              </div>
            </section>
            <div
              className="ml-study-tabs"
              role="tablist"
              aria-label="Estudios de animación"
            >
              {studies.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={id === item.id}
                  className={`ml-study-tab ${id === item.id ? "selected" : ""}`}
                  onClick={() => select(item.id)}
                >
                  <div className="ml-miniature">
                    <StudyCanvas
                      id={item.id}
                      time={
                        item.id === "enbu"
                          ? 5.2
                          : item.id === "blue-hour"
                            ? 10.5
                            : 1.8
                      }
                    />
                  </div>
                  <span className="ml-study-number">{item.number}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  <span className="ml-study-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="ml-workbench">
          <section
            className={`ml-stage ${id !== "enbu" ? "ml-portrait" : ""}`}
            aria-label={`Vídeo ${study.number}: ${study.title}`}
            data-playback-clock={audio ? "voice" : "preview"}
            data-playhead={time}
            data-visual-ready={visualReady ? "true" : "false"}
          >
            <div className="ml-stage-heading">
              <div>
                <span className="ml-kicker">{study.category}</span>
                <h2>
                  {study.title}
                  <em>{study.subtitle}</em>
                </h2>
              </div>
              <span className="ml-live">
                {!visualReady
                  ? "CARGANDO ESCENA"
                  : playing
                    ? waitingForVoice
                      ? "ESPERANDO AUDIO"
                      : "EN MOVIMIENTO"
                    : "EN PAUSA"}
              </span>
            </div>
            <div className="ml-canvas-room">
              <div className="ml-canvas-slot">
                <StudyCanvas
                  id={id}
                  time={
                    newAudio?.clips.some((c) => c.kind === "voice" && c.asset)
                      ? (time / duration) * study.duration
                      : time
                  }
                  onReady={onVisualReady}
                  playing={playing && visualReady}
                  speed={newAudio?.clips.some(c => c.kind === "voice" && c.asset) ? study.duration / duration : 1}
                />
                {captions && (
                  <svg
                    className="ml-captions"
                    viewBox={`0 0 ${viewport.width} ${viewport.height}`}
                    aria-label="Subtítulos"
                  >
                    <Captions
                      time={time}
                      words={words}
                      pack={pack}
                      accent={id === "enbu" ? "#ffd18a" : "#c5e5ff"}
                      width={viewport.width}
                      height={viewport.height}
                    />
                  </svg>
                )}
              </div>
            </div>
            <div className="ml-playback">
              <button
                className="ml-play"
                onClick={() => {
                  if (mixedPreview.hasAudio) {
                    mixedPreview.toggle()
                    return
                  }
                  if (time >= duration - 0.05) setTime(0)
                  setPlaying((value) => !value)
                }}
                aria-label={playing ? "Pausar estudio" : "Reproducir estudio"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {playing ? (
                    <path d="M8 5h3v14H8zM15 5h3v14h-3z" />
                  ) : (
                    <path d="m8 5 11 7-11 7z" />
                  )}
                </svg>
              </button>
              <span className="ml-time">
                {time.toFixed(1)} <i>/ {duration.toFixed(1)} s</i>
              </span>
              <input
                aria-label="Posición del estudio"
                type="range"
                min="0"
                max={duration - 1 / 60}
                step={1 / 60}
                value={time}
                onChange={(event) => seek(Number(event.target.value))}
              />
              <button className="ml-text-button" onClick={() => seek(0)}>
                Reiniciar
              </button>
              <span className="ml-playback-format">
                {study.width} × {study.height}
              </span>
            </div>
            {audio && (
              <>
                <audio
                  ref={voice}
                  data-audio-track="voice"
                  src={audio.voice.url}
                  preload="auto"
                  onLoadedMetadata={() => {
                    const value = voice.current?.duration
                    setVoiceDuration(
                      value && Number.isFinite(value) ? value : 0,
                    )
                  }}
                  onDurationChange={() => {
                    const value = voice.current?.duration
                    if (value && Number.isFinite(value)) setVoiceDuration(value)
                  }}
                  onError={() => {
                    setPlaying(false)
                    setVoiceDuration(0)
                    setAudioError(
                      "No se pudo cargar la voz. Su enlace puede haber caducado; no se aprueba la sincronía.",
                    )
                  }}
                />
              </>
            )}
            {activeSfx && (
              <audio ref={sfx} src={activeSfx.url} preload="auto" />
            )}
            {activeMusic && (
              <audio
                ref={music}
                src={activeMusic.url}
                preload="auto"
                data-audio-track="music"
              />
            )}
            {artifact && (id === "enbu" || id === "blue-hour") && (
              <audio
                ref={atmosphere}
                src={publicAssetUrl(`/exports/study-${id}-atmosphere.wav`)}
                preload="none"
                onLoadedMetadata={() => {
                  if (atmosphere.current?.duration)
                    atmosphere.current.currentTime =
                      current.current % atmosphere.current.duration
                }}
              />
            )}
            {!mixedPreview.hasAudio && (
              <label className="ml-sound-switch">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  disabled={
                    !activeSfx &&
                    (!artifact || (id !== "enbu" && id !== "blue-hour"))
                  }
                  onChange={(event) => {
                    setSoundEnabled(event.target.checked)
                    if (event.target.checked && playing)
                      void (activeSfx ? sfx.current : atmosphere.current)
                        ?.play()
                        .catch(() =>
                          setAudioError("No se pudo reproducir la atmósfera."),
                        )
                  }}
                />{" "}
                Escuchar atmósfera{" "}
                <small>
                  {activeSfx
                    ? activeSfx.origin === "elevenlabs"
                      ? "ElevenLabs"
                      : "SFX guardados en el proyecto"
                    : id === "enbu" || id === "blue-hour"
                      ? "Diseño procedural · no ElevenLabs"
                      : "Sin SFX nuevos · genera o recupera una pista"}
                </small>
              </label>
            )}
            {mixedPreview.hasAudio && (
              <p className="ml-footnote">
                Audio del vídeo conectado al mezclador de Voz y audio. Volumen y
                silencio se aplican en directo.
              </p>
            )}
            {!mixedPreview.hasAudio && activeMusic && (
              <label className="ml-sound-switch">
                <input
                  type="checkbox"
                  checked={musicEnabled}
                  onChange={(event) => setMusicEnabled(event.target.checked)}
                />{" "}
                Escuchar música guardada
              </label>
            )}
            {(audioError || mixedPreview.error) && (
              <p className="ml-error" role="alert">
                {mixedPreview.error || audioError}
              </p>
            )}
            <div className="ml-caption-toolbar">
              <label>
                <input
                  type="checkbox"
                  checked={captions}
                  onChange={(event) => setCaptions(event.target.checked)}
                />{" "}
                Subtítulos
              </label>
              <div role="group" aria-label="Estilo de subtítulos">
                {activePacks.map((option) => (
                  <button
                    key={option}
                    aria-pressed={captions && pack === option}
                    className={captions && pack === option ? "active" : ""}
                    onClick={() => {
                      setPack(option)
                      setCaptions(true)
                    }}
                  >
                    {option === "comic"
                      ? "Cómic"
                      : option[0].toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
              <small>
                {syncReport?.status === "checked"
                  ? "Tiempos reales comprobados · escucha pendiente"
                  : audio?.voice.words.length
                    ? "Alineación recibida · comprueba el audio"
                    : audio
                      ? "Sin alineación · tiempos estimados"
                      : "Timing estimado · todavía sin voz"}
              </small>
              <small>
                Los ajustes se guardan automáticamente al iniciar sesión.
              </small>
              {settingsMessage && (
                <small role="status">{settingsMessage}</small>
              )}
            </div>
            {audio && (
              <SyncPanel
                key={audio.voice.id}
                audio={audio}
                duration={voiceDuration}
                clock={clockSamples}
                onSeek={seek}
                onReload={() => {
                  setPlaying(false)
                  voice.current?.load()
                }}
                onRecheck={() => {
                  clockData.current = { count: 0, maxDriftMs: 0 }
                  setClockSamples({ ...clockData.current })
                  seek(0, true)
                }}
              />
            )}
            <div className="ml-stage-footer">
              <p>{study.description}</p>
              <div>
                {artifact && (
                  <button
                    className="ml-button ml-button-download"
                    disabled={mixing}
                    onClick={() => void exportMix()}
                  >
                    {mixing
                      ? "Exportando…"
                      : `${exportLabel}${
                          captions ? " · audio + captions" : ""
                        }`}
                  </button>
                )}
                {mixMessage && <small role="status">{mixMessage}</small>}
                {artifact ? (
                  <DownloadButton
                    className="ml-button ml-button-download"
                    file={async () => {
                      const saved =
                        token && projectId && cloudProject?.renderFiles?.master
                          ? (await cloud.load(projectId, token)).project
                              ?.renderFiles?.master
                          : null
                      return saved && saved.sha256 === artifact.sha256
                        ? {
                            url: saved.url,
                            filename: saved.name || `study-${id}.mp4`,
                            mime: "video/mp4",
                            sha256: saved.sha256,
                            bytes: saved.bytes,
                          }
                        : {
                            url: publicAssetUrl(artifact.url),
                            filename: `study-${id}.mp4`,
                            mime: "video/mp4",
                            sha256: artifact.sha256,
                            bytes: artifact.bytes,
                          }
                    }}
                  >
                    Base sin captions ni voz{" "}
                    <span>{(artifact.bytes / 1048576).toFixed(1)} MB</span>
                  </DownloadButton>
                ) : (
                  <button className="ml-button" disabled>
                    MP4 en preparación
                  </button>
                )}
                <small>
                  {artifact
                    ? `${artifact.fps} fps · render nativo · ${
                        id === "enbu" || id === "blue-hour"
                          ? "SFX procedurales · sin voz personalizada"
                          : "capas reconstruidas · sin audio personalizado"
                      }`
                    : filesState}
                </small>
                <button
                  className="ml-text-button"
                  onClick={() => void loadFiles()}
                >
                  Actualizar archivos
                </button>
              </div>
            </div>
            {study.reference && (
              <details className="ml-reference">
                <summary>
                  Comparar con tu referencia original{" "}
                  <span>{study.title} · archivo original</span>
                </summary>
                <video
                  key={study.reference}
                  controls
                  muted
                  playsInline
                  preload="none"
                  src={publicAssetUrl(study.reference)}
                />
                <p>
                  Referencia proporcionada por ti. La pieza de arriba es una
                  recreación procedural independiente; no es el archivo original
                  reproducido como un render nuevo.
                </p>
              </details>
            )}
          </section>
          <aside className="ml-voice">
            <p className="ml-kicker">VOZ Y AUDIO</p>
            <p>
              La generación y el mezclador de tres pistas están debajo de la
              documentación, en Voz y audio. Tus archivos anteriores se
              conservan.
            </p>
          </aside>
        </div>
        {!embedded && (
          <section className="ml-craft">
            <p className="ml-kicker">LO QUE NO SE VE EN UNA CAPTURA</p>
            <div>
              <article>
                <span>01 / ACTUACIÓN</span>
                <h3>El movimiento tiene peso.</h3>
                <p>
                  Articulaciones, anticipación y seguimiento de las estelas. El
                  fuego nace de las posiciones anteriores de la katana.
                </p>
              </article>
              <article>
                <span>02 / VIDA</span>
                <h3>Lo pequeño lo cambia todo.</h3>
                <p>
                  Respiración, parpadeos, reflejos, hojas y una barca que nunca
                  está del todo quieta. Sin mover una imagen plana.
                </p>
              </article>
              <article>
                <span>03 / TIEMPO</span>
                <h3>Un único reloj.</h3>
                <p>
                  Preview y Remotion dibujan la misma escena. Los subtítulos
                  usan tiempo global y aceptan alineación real, no intervalos
                  idénticos.
                </p>
              </article>
            </div>
          </section>
        )}
        {!embedded && (
          <footer className="ml-footer">
            <span>YT AUTOMATION / MOTION STUDIES</span>
            <span>Hecho de capas, intención y tiempo.</span>
            <a href="#workspace">Abrir Finn Lab →</a>
          </footer>
        )}
      </main>
    </div>
  )
}
