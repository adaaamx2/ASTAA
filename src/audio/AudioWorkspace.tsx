import { useEffect, useRef, useState } from "react"
import { api } from "../motion-lab/api"
import { useStudioSession } from "../workspace/Session"
import { saveBlob, type DownloadFile } from "../media/files"
import { mixMp4, mixWav } from "../media/mux"
import { activationGuide } from "./guide"
import { voiceCategory } from "../motion-lab/voice-tools"
import { validVoiceId } from "../motion-lab/voice-tools"
import AudioPanel, { type CatalogVoice } from "./AudioPanel"
import { runAudioBatch, AudioBatchError } from "./batch"
import { pausePreview, useMixedPreview } from "./playback"
import { currentExportCaptions } from "../media/caption-export"
import "./audio.css"
import {
  decodeClip,
  defaultState,
  labels,
  putAudio,
  readAudioState,
  renderTrack,
  saveAudioState,
  tracksForExport,
  sfxAudibility,
  wav,
  type AudioState,
  type Clip,
  type Kind,
} from "./engine"

type SceneInput = {
  id: string | number
  start: number
  end: number
  voice: string
  visual?: string
}
type Props = {
  id: string
  channel: string
  duration: number
  scenes: SceneInput[]
  sources: DownloadFile[]
  soundDesign?: string
  musicPrompt?: string
}
type Voice = CatalogVoice
type Generated = {
  id: string
  url: string
  words: Clip["words"]
  timingSource: string
  cacheHit: boolean
  persistencePending?: boolean
}
function seed(scenes: SceneInput[]): Clip[] {
  return scenes.flatMap((s, i) => [
    {
      id: `voice-${s.id}`,
      sceneId: String(s.id),
      kind: "voice" as const,
      start: s.start,
      duration: s.end - s.start,
      text: s.voice,
      description: s.voice,
    },
    ...(i
      ? [
          {
            id: `transition-${s.id}`,
            sceneId: String(s.id),
            sceneOffset: 0,
            kind: "sfx" as const,
            start: s.start,
            duration: 0.5,
            description: "Transición suave de aire, breve, sin voces ni música",
          },
        ]
      : []),
    {
      id: `event-${s.id}`,
      sceneId: String(s.id),
      sceneOffset: Math.min(0.6, (s.end - s.start) / 2),
      kind: "sfx" as const,
      start: s.start + Math.min(0.6, (s.end - s.start) / 2),
      duration: 0.7,
      description:
        `Acento sonoro sutil para ${s.visual || "la acción principal"}, sin voces ni música`.slice(
          0,
          1900,
        ),
    },
  ])
}
interface WaveProps {
  state: AudioState
  kind: Kind
}
function Wave({ state, kind }: WaveProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const assets = state.clips
    .filter((c) => c.kind === kind && c.asset)
    .map((c) => `${c.asset}:${c.start}:${c.duration}`)
    .join("|")
  useEffect(() => {
    let cancelled = false
    const context = new AudioContext()
    void (async () => {
      const element = canvas.current,
        graphics = element?.getContext("2d")
      if (!element || !graphics) return
      graphics.clearRect(0, 0, element.width, element.height)
      graphics.strokeStyle = getComputedStyle(element).color
      for (const clip of state.clips.filter(
        (c) => c.kind === kind && c.asset,
      )) {
        const buffer = await decodeClip(context, clip)
        if (!buffer || cancelled) continue
        const data = buffer.getChannelData(0)
        for (let x = 0; x < element.width; x += 2) {
          const time = (x / element.width) * state.duration - clip.start
          if (time < 0 || time >= clip.duration) continue
          const sample = Math.floor(
            (time % buffer.duration) * buffer.sampleRate,
          )
          let peak = 0
          for (let j = sample; j < Math.min(sample + 400, data.length); j++)
            peak = Math.max(peak, Math.abs(data[j]))
          graphics.beginPath()
          graphics.moveTo(x, 24 - peak * 24)
          graphics.lineTo(x, 24 + peak * 24)
          graphics.stroke()
        }
      }
    })()
      .catch(() => {})
      .finally(() => void context.close())
    return () => {
      cancelled = true
    }
  }, [assets, state.duration, kind])
  return (
    <canvas
      ref={canvas}
      width={600}
      height={48}
      className="audio-wave"
      aria-label={`Onda real de ${labels[kind]}`}
    />
  )
}
export default function AudioWorkspace({
  id,
  channel,
  duration,
  scenes,
  sources,
  soundDesign,
  musicPrompt,
}: Props) {
  const { token } = useStudioSession()
  const [state, setState] = useState<AudioState>(() => ({
    ...(readAudioState(id) || {
      ...defaultState(duration, seed(scenes)),
      ...(readAudioState(`channel:${channel}`)
        ? {
            strips: readAudioState(`channel:${channel}`)!.strips,
            voiceId: readAudioState(`channel:${channel}`)!.voiceId,
            voiceName: readAudioState(`channel:${channel}`)!.voiceName,
            mood: readAudioState(`channel:${channel}`)!.mood,
          }
        : {}),
      ...(musicPrompt ? { mood: musicPrompt } : {}),
    }),
    soundDesign,
  }))
  const [status, setStatus] = useState<Record<string, string>>({})
  const [voices, setVoices] = useState<Voice[]>([])
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")
  const [technical, setTechnical] = useState("")
  const [selectedVideo, setSelectedVideo] = useState(0)
  const preview = useMixedPreview(id)
  const generationBusy = useRef(false)
  const [dirty, setDirty] = useState(false)
  const current = useRef(state)
  current.current = state
  const initialLocal = useRef(Boolean(readAudioState(id)))
  const changed = useRef(false)
  function update(fn: (previous: AudioState) => AudioState) {
    changed.current = true
    setDirty(true)
    setState(fn)
  }
  useEffect(() => {
    void api<{ state: AudioState | null }>(
      `/audio/state/${encodeURIComponent(id)}`,
      undefined,
      token,
    )
      .then((result) => {
        if (result.state && !initialLocal.current && !changed.current)
          setState(result.state)
      })
      .catch((error) =>
        setMessage(`Ajustes en copia local; nube pendiente: ${error.message}`),
      )
  }, [id, token])
  useEffect(() => {
    saveAudioState(id, state)
  }, [id, state])
  async function check() {
    setBusy("check")
    try {
      const saved = await api<{
        configured: boolean
        last4: string
        revision: number
      }>("/audio/status", undefined, token)
      if (!saved.revision)
        throw new Error("Backend antiguo: publica server desde Make.")
      setStatus((s) => ({
        ...s,
        key: saved.configured
          ? `ok:Guardada · …${saved.last4}`
          : "Falta ELEVENLABS_API_KEY en los secretos de Supabase.",
      }))
      if (!saved.configured) return
      const catalog = await api<{ voices: Voice[] }>(
        "/audio/voices",
        undefined,
        token,
      )
      setVoices(catalog.voices)
      setStatus((s) => ({ ...s, connection: "ok:Catálogo de voces conectado" }))
      // Subscription-read permission is optional, not a prerequisite for TTS.
      void api<{ tier: string }>("/audio/connection", undefined, token)
        .then((connection) =>
          setStatus((s) => ({ ...s, plan: `Plan ${connection.tier}` })),
        )
        .catch(() =>
          setStatus((s) => ({
            ...s,
            plan: "No se pudo consultar el plan. Esto no bloquea la generación; sus permisos se comprueban al solicitar cada audio.",
          })),
        )
      const selected = catalog.voices.find(
        (v) => v.id === current.current.voiceId,
      )
      const best =
        selected ||
        catalog.voices.find((v) => voiceCategory(v) === "España") ||
        catalog.voices.find(
          (v) => voiceCategory(v) === "Español · otros o sin acento",
        ) ||
        catalog.voices[0]
      if (current.current.voiceId && !selected) {
        setStatus((s) => ({
          ...s,
          voice: "Voice ID personalizado conservado.",
        }))
      } else if (best) {
        update((s) => ({ ...s, voiceId: best.id, voiceName: best.name }))
        setStatus((s) => ({
          ...s,
          voice: `${best.name} seleccionada · ${
            voiceCategory(best) === "España"
              ? "etiquetada España"
              : "alternativa accesible; acento de España no confirmado"
          }. Escucha su muestra gratuita antes de generar.`,
        }))
      } else
        setStatus((s) => ({
          ...s,
          voice:
            "Selecciona una voz del catálogo; no hay una voz de España verificable automáticamente.",
        }))
    } catch (error) {
      setStatus((s) => ({
        ...s,
        connection:
          error instanceof Error ? error.message : "No se pudo conectar.",
      }))
    } finally {
      setBusy("")
    }
  }
  useEffect(() => {
    void check()
  }, [token])
  async function resolveVoice(voiceId: string) {
    if (busy || !validVoiceId(voiceId)) return
    setBusy("voice")
    setMessage("")
    try {
      const result = await api<{ voice: Voice }>(
        `/audio/voices/${encodeURIComponent(voiceId)}`,
        undefined,
        token,
      )
      setVoices((previous) => [
        ...previous.filter((v) => v.id !== result.voice.id),
        result.voice,
      ])
      update((s) => ({
        ...s,
        voiceId: result.voice.id,
        voiceName: result.voice.name,
      }))
      setMessage(
        result.voice.previewUrl
          ? "Voz encontrada. Puedes escuchar la muestra del catálogo sin generar audio."
          : "Voz encontrada, pero no tiene una muestra disponible. No se ha generado ninguna prueba de pago.",
      )
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo buscar esa voz.",
      )
    } finally {
      setBusy("")
    }
  }
  async function persist() {
    setBusy("save")
    try {
      await api(
        `/audio/state/${encodeURIComponent(id)}`,
        current.current,
        token,
      )
      setDirty(false)
      setMessage(
        "Ajustes de audio guardados en la nube. Los datos originales del vídeo no se modificaron.",
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.")
    } finally {
      setBusy("")
    }
  }
  async function generateAll(only?: Kind) {
    if (busy || generationBusy.current) return
    generationBusy.current = true
    pausePreview(id)
    setMessage("")
    setTechnical("")
    let stage = only ? labels[only] : "voz"
    let completed = 0
    try {
      setBusy("generation-check")
      setMessage(
        "Comprobando escritura de audio y almacenamiento, sin consumir créditos…",
      )
      const preflight = await api<{ ready: boolean }>(
        "/audio/preflight",
        {},
        token,
      )
      if (preflight.ready !== true)
        throw new Error(
          "El servidor no confirmó el almacenamiento. No se envió audio a ElevenLabs.",
        )
      await runAudioBatch(
        {
          ...current.current,
          soundDesign,
          duration: Math.max(duration, current.current.duration),
          visualDuration: duration,
        },
        async (body, clip) => {
          const result = await api<Generated>("/audio/generate", body, token)
          let blob: Blob
          try {
            const response = await fetch(result.url, {
              signal: AbortSignal.timeout(30000),
            })
            if (!response.ok) throw new Error("download")
            blob = await response.blob()
          } catch {
            throw Object.assign(
              new Error(
                "El audio ya se generó, pero no se pudo descargar. La misma solicitud recupera su caché sin regenerarlo.",
              ),
              { code: "audio_download_failed" },
            )
          }
          const context = new AudioContext()
          let seconds: number
          let silent = false
          try {
            const decoded = await context.decodeAudioData(
              await blob.arrayBuffer(),
            )
            seconds = decoded.duration
            if (clip.kind !== "voice") silent = sfxAudibility(decoded).silent
          } catch {
            throw Object.assign(
              new Error(
                "El proveedor entregó un archivo que el navegador no puede decodificar. No se repitió la generación.",
              ),
              { code: "audio_decode_failed" },
            )
          } finally {
            await context.close()
          }
          if (!Number.isFinite(seconds) || seconds <= 0)
            throw new Error("El proveedor no entregó audio reproducible.")
          await putAudio(result.id, blob)
          setStatus((s) => ({
            ...s,
            [`generation:${clip.kind}`]: `${
              silent
                ? "Recibido sin señal audible"
                : result.cacheHit
                  ? "Recuperado de caché"
                  : "Generado"
            } · ${seconds.toFixed(1)} s`,
          }))
          if (result.persistencePending) setTechnical("persistence_pending")
          return {
            ...clip,
            asset: result.id,
            duration: seconds,
            words: result.words,
            silent,
          }
        },
        (next) => {
          completed++
          changed.current = true
          setDirty(true)
          current.current = next
          saveAudioState(id, next)
          setState(next)
        },
        (kind, cached) => {
          stage = labels[kind]
          setBusy(`generation-${kind}`)
          setMessage(
            `${
              cached ? "Reutilizando" : "Generando"
            } ${labels[kind]}… Las pistas completadas se conservan.`,
          )
          setStatus((s) => ({
            ...s,
            [`generation:${kind}`]: cached
              ? "Reutilizado: no se solicitó una generación nueva."
              : "Solicitando al servidor…",
          }))
        },
        {
          only,
          onFailure: ({ kind, error }) => {
            const diagnostic = [
              error.code || "audio_stage_failed",
              error.status ? `HTTP ${error.status}` : "",
              error.operation || "",
            ]
              .filter(Boolean)
              .join(" · ")
            setStatus((s) => ({
              ...s,
              [`generation:${kind}`]: `Error: ${error.message} · ${diagnostic}`,
            }))
          },
        },
      )
      try {
        await api(
          `/audio/state/${encodeURIComponent(id)}`,
          current.current,
          token,
        )
        setDirty(false)
        setMessage(
          only
            ? `${labels[only]} lista. No se han solicitado las demás pistas. Los controles de silencio y volumen se conservan.`
            : current.current.clips.some(
                  (clip) => clip.kind === "sfx" && clip.silent,
                )
              ? "Voz y música listas. El archivo SFX recibido contiene silencio: no se ha regenerado ni cobrado otra solicitud. Descarga la pista para revisarla o sustituye solo el SFX."
              : "Voz, SFX y música listos. Pulsa Reproducir en el vídeo: escucharás esta mezcla. Puedes ajustar volúmenes sin generar otra vez.",
        )
      } catch {
        setMessage(
          `${
            only ? labels[only] : "Las pistas solicitadas"
          } disponible en este navegador. No se pudo guardar su configuración en la nube; conserva o exporta los audios antes de cerrar.`,
        )
      }
    } catch (error) {
      if (completed) {
        try {
          await api(
            `/audio/state/${encodeURIComponent(id)}`,
            current.current,
            token,
          )
        } catch {
          /* Keep the completed tracks locally even if the cloud is unavailable. */
        }
      }
      setMessage(
        error instanceof AudioBatchError
          ? `Generación parcial. ${error.message} Las otras etapas completadas se conservan; no se reintentó ningún cobro.`
          : `Se detuvo en ${stage}: ${
              error instanceof Error
                ? error.message
                : "no se completó la generación"
            }. Las pistas anteriores y las etapas completadas se conservan. No se reintentó ningún cobro.`,
      )
      setTechnical(
        String((error as { code?: string }).code || "audio_batch_failed"),
      )
    } finally {
      generationBusy.current = false
      setBusy("")
    }
  }
  async function listen() {
    preview.toggle()
  }
  async function upload(kind: Kind, file?: File) {
    if (!file) return
    pausePreview(id)
    setBusy("upload")
    try {
      if (file.size > 50000000)
        throw new Error("El archivo debe ocupar menos de 50 MB.")
      const context = new AudioContext()
      let seconds: number
      try {
        seconds = (await context.decodeAudioData(await file.arrayBuffer()))
          .duration
      } finally {
        await context.close()
      }
      const asset = crypto.randomUUID()
      await putAudio(asset, file)
      update((s) => ({
        ...s,
        clips: [
          ...s.clips.filter((c) => c.kind !== kind),
          {
            id: `upload-${kind}`,
            kind,
            start: 0,
            duration: kind === "music" ? s.duration : seconds,
            description: file.name,
            asset,
          },
        ],
        duration: kind === "voice" ? seconds : s.duration,
      }))
      setMessage(
        "Archivo guardado en este navegador. Conserva tu original: las subidas locales no se alojan automáticamente en la nube.",
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Archivo no válido.")
    } finally {
      setBusy("")
    }
  }
  async function exportFile(kind?: Kind, mp4 = false) {
    if (busy) return
    setBusy("export")
    let release = () => {}
    try {
      const latest = current.current
      if (kind) {
        saveBlob(wav(await renderTrack(latest, kind)), `${id}-${kind}.wav`)
        setMessage(`Pista ${labels[kind]} descargada sin volumen de mezcla.`)
        return
      }
      const result = await tracksForExport(latest)
      release = result.release
      if (mp4) {
        const source = sources[selectedVideo]
        if (!source)
          throw new Error(
            "No hay un MP4 visual disponible para esta variante. No se fabricará un render.",
          )
        const blob = await mixMp4(
          source,
          result.tracks,
          latest.duration,
          setMessage,
          currentExportCaptions(id),
          { normalize: latest.normalize },
        )
        saveBlob(blob, `${source.filename.replace(/\.mp4$/i, "")}-mezcla.mp4`)
      } else
        saveBlob(
          await mixWav(
            result.tracks,
            latest.duration,
            latest.normalize,
            setMessage,
          ),
          `${id}-mezcla.wav`,
        )
      setMessage(
        `Exportado: ${result.summary}${
          latest.normalize ? " · normalización a −14 LUFS solicitada" : ""
        }. ${
          !mp4
            ? "Mezcla WAV PCM descargada."
            : currentExportCaptions(id)
              ? "Captions grabadas en el vídeo."
              : "Imagen original copiada."
        }`,
      )
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Exportación fallida.",
      )
    } finally {
      release()
      setBusy("")
    }
  }
  function strip(kind: Kind, patch: Partial<AudioState["strips"][Kind]>) {
    update((s) => ({
      ...s,
      strips: { ...s.strips, [kind]: { ...s.strips[kind], ...patch } },
    }))
  }
  return (
    <AudioPanel
      projectId={id}
      state={state}
      voices={voices}
      busy={busy}
      status={status}
      message={preview.error || message}
      technical={technical}
      dirty={dirty}
      playing={preview.playing}
      sources={sources}
      selectedVideo={selectedVideo}
      setSelectedVideo={setSelectedVideo}
      update={update}
      strip={strip}
      generateAll={generateAll}
      resolveVoice={resolveVoice}
      check={check}
      listen={listen}
      persist={persist}
      upload={upload}
      exportFile={exportFile}
      wave={(kind) => <Wave state={state} kind={kind} />}
      guide={activationGuide}
      saveChannel={async () => {
        setBusy("channel")
        try {
          const defaults = { ...current.current, clips: [] }
          saveAudioState(`channel:${channel}`, defaults)
          await api(
            `/audio/state/${encodeURIComponent(`channel:${channel}`)}`,
            defaults,
            token,
          )
          setMessage(
            "Voz y mezclador guardados como valores de audio del canal.",
          )
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No se pudo guardar en nube.",
          )
        } finally {
          setBusy("")
        }
      }}
    />
  )
}
