import { useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Button,
  Disclosure,
  Field,
  Heading,
  Input,
  Option,
  Section,
  Select,
  Strong,
  Text,
  Textarea,
} from "../audio/controls"
import { useStudioSession } from "../workspace/Session"
import { api, type Voice } from "../motion-lab/api"
import {
  defaultState,
  getAudio,
  putAudio,
  readAudioState,
  saveAudioState,
  tracksForExport,
  type AudioState,
  type Kind,
} from "../audio/engine"
import { mixMp4 } from "../media/mux"
import Export4kButton from "../media/Export4kButton"
import { saveBlob, type DownloadFile } from "../media/files"
import { labRequest, uploadLabFile, type Library } from "./api"
import {
  autoTag,
  prepareScenes,
  spokenText,
  tagGroups,
  timelineWords,
  type Character,
  type LabAudio,
  type LabProject,
} from "./model"
import { AudioPlayer, CharacterImage } from "./media"
import ActorPreview from "./ActorPreview"
import { palette, renderCharacterBase } from "./character-video"
import "./voice-lab.css"
import "../audio/audio.css"
import "../workspace/workspace.css"

const empty: Library = { characters: [], audio: [], projects: [], jobs: [] }
interface GeneratedBed {
  id: string
  url: string
  persistencePending?: boolean
}
interface MixPatch {
  mute?: boolean
  volume?: number
}
export default function VoiceLabPage() {
  const { token, session } = useStudioSession()
  const [library, setLibrary] = useState<Library>(empty)
  const [connected, setConnected] = useState(false)
  const [tab, setTab] = useState("studio")
  const [message, setMessage] = useState("")
  const [working, setWorking] = useState("")
  const lock = useRef(false)
  const [voices, setVoices] = useState<Voice[]>([])
  const [voiceId, setVoiceId] = useState("")
  const [characterId, setCharacterId] = useState("")
  const [characterName, setCharacterName] = useState("")
  const [characterDescription, setCharacterDescription] = useState("")
  const [characterFile, setCharacterFile] = useState<File>()
  const [name, setName] = useState("")
  const [script, setScript] = useState("")
  const [taggedScript, setTaggedScript] = useState("")
  const [tone, setTone] = useState("cercano")
  const [authorized, setAuthorized] = useState(false)
  const [audioId, setAudioId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [upload, setUpload] = useState<File>()
  const [search, setSearch] = useState("")
  const [lastJob, setLastJob] = useState("")
  const [render, setRender] = useState<DownloadFile>()
  const [mix, setMix] = useState<AudioState>()
  const renderAbort = useRef<AbortController | null>(null)
  const pendingUrls = useRef<string[]>([])
  const pendingKey = `voice-lab:pending-audio:${session?.userId}`
  const audio = library.audio.find((item) => item.id === audioId)
  const project = library.projects.find((item) => item.id === projectId)
  const character = library.characters.find(
    (item) => item.id === (project?.characterId || characterId),
  )
  const previewAudio = project
    ? library.audio.find((item) => item.id === project.audioId)
    : audio
  const selectedVoice = voices.find((item) => item.id === voiceId)
  const previewPlan = useMemo<LabProject | undefined>(() => {
    if (project) return project
    if (!audio || !audio.duration) return undefined
    const words = timelineWords(audio)
    return {
      id: "preview",
      title: audio.name,
      audioId: audio.id,
      characterId,
      duration: audio.duration,
      words,
      scenes: prepareScenes(words),
      timingSource: audio.words.length ? audio.timingSource : "estimated",
      sfx: "",
      music: "",
      tracks: {},
      revision: 0,
      createdAt: "",
    }
  }, [project, audio, characterId])
  async function refresh() {
    const data = await labRequest<Library & { revision: number }>(
      token,
      "/bootstrap",
    )
    if (data.revision !== 1 || !Array.isArray(data.audio))
      throw new Error(
        "El backend no confirmó la biblioteca nueva. Los proyectos anteriores no se han modificado.",
      )
    setLibrary((previous) => ({
      ...data,
      audio: [
        ...data.audio,
        ...previous.audio.filter(
          (item) =>
            item.persistencePending &&
            !data.audio.some((saved) => saved.id === item.id),
        ),
      ],
    }))
    setConnected(true)
    setLastJob(
      (previous) =>
        previous ||
        [...data.jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
          ?.id ||
        "",
    )
    return data
  }
  useEffect(() => {
    let live = true
    document.title = "YT Automation · Personajes y voces"
    void refresh().catch((error) => {
      setConnected(false)
      setMessage(error.message)
    })
    void (async () => {
      let records: LabAudio[] = []
      try {
        records = JSON.parse(localStorage.getItem(pendingKey) || "[]")
      } catch {}
      for (const record of records) {
        const blob = await getAudio(`voice-lab:${record.id}`)
        if (!live) return
        if (!blob) continue
        const url = URL.createObjectURL(blob)
        pendingUrls.current.push(url)
        setLibrary((previous) =>
          previous.audio.some((item) => item.id === record.id)
            ? previous
            : {
                ...previous,
                audio: [
                  { ...record, url, persistencePending: true },
                  ...previous.audio,
                ],
              },
        )
      }
    })().catch(() => {})
    try {
      setLastJob(
        localStorage.getItem(`voice-lab:last-job:${session?.userId}`) || "",
      )
    } catch {}
    return () => {
      live = false
      renderAbort.current?.abort()
      pendingUrls.current.forEach((url) => URL.revokeObjectURL(url))
      pendingUrls.current = []
    }
  }, [token])
  useEffect(
    () => () => {
      if (render?.url.startsWith("blob:")) URL.revokeObjectURL(render.url)
    },
    [render?.url],
  )
  useEffect(() => {
    if (!project || !previewAudio) {
      setMix(undefined)
      return
    }
    const saved = readAudioState(`voice-lab-video:${project.id}`)
    const state = saved || {
      ...defaultState(project.duration),
      clips: [
        {
          id: "selected-voice",
          kind: "voice" as const,
          asset: `voice-lab:${previewAudio.id}`,
          start: 0,
          duration: project.duration,
          text: previewAudio.script,
          description: previewAudio.name,
          words: project.words,
        },
        ...(["sfx", "music"] as const).flatMap((kind) =>
          project.tracks[kind]
            ? [
                {
                  id: `lab-${kind}`,
                  kind,
                  asset: project.tracks[kind]!.id,
                  start: 0,
                  duration:
                    kind === "music"
                      ? project.duration
                      : project.tracks[kind]!.duration,
                  description: project[kind],
                },
              ]
            : [],
        ),
      ],
    }
    saveAudioState(`voice-lab-video:${project.id}`, state)
    setMix(state)
    const capture = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail.id === `voice-lab-video:${project.id}`)
        detail.captions = project.words.length
          ? captionOptions(project)
          : undefined
    }
    window.addEventListener("studio-export-captions", capture)
    return () => window.removeEventListener("studio-export-captions", capture)
  }, [project, previewAudio])
  function captionOptions(doc: LabProject) {
    return {
      words: doc.words.map((word) => ({
        ...word,
        sceneId: 0,
        source:
          doc.timingSource === "estimated"
            ? "estimated" as const
            : "provider-character-alignment" as const,
      })),
      pack: "karaoke",
      width: 1080,
      height: 1920,
      viewport: { width: 540, height: 960 },
      fps: 30,
    }
  }
  async function operate(label: string, fn: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setWorking(label)
    setMessage("")
    try {
      await fn()
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se completó la operación.",
      )
    } finally {
      lock.current = false
      setWorking("")
    }
  }
  async function loadVoices() {
    const result = await api<{ voices: Voice[] }>(
      "/audio/voices",
      undefined,
      token,
    )
    setVoices(result.voices)
    setMessage(
      "Catálogo de tu cuenta cargado. Escuchar muestras existentes no genera voz.",
    )
  }
  function publishAudio(record: LabAudio) {
    setLibrary((previous) => ({
      ...previous,
      audio: [
        record,
        ...previous.audio.filter((item) => item.id !== record.id),
      ],
    }))
    setAudioId(record.id)
    if (project?.audioId !== record.id) {
      setProjectId("")
      setRender(undefined)
    }
  }
  async function rememberAudio(record: LabAudio) {
    if (record.url) {
      const response = await fetch(record.url, {
        signal: AbortSignal.timeout(30000),
      })
      if (!response.ok)
        throw new Error(
          "Se recibió la toma, pero no se pudo descargar. Actualiza o recupera el guardado; no repitas la generación.",
        )
      const blob = await response.blob()
      const context = new AudioContext()
      try {
        const decoded = await context.decodeAudioData(await blob.arrayBuffer())
        record = { ...record, duration: decoded.duration }
        // Keep a playable/downloadable take visible even if later caching fails.
        publishAudio(record)
        if (!record.persistencePending)
          await labRequest(token, `/audio/${record.id}/duration`, {
            duration: decoded.duration,
          })
        await putAudio(`voice-lab:${record.id}`, blob)
        try {
          const old: LabAudio[] = JSON.parse(
            localStorage.getItem(pendingKey) || "[]",
          )
          const without = old.filter((item) => item.id !== record.id)
          const { url, ...metadata } = record
          localStorage.setItem(
            pendingKey,
            JSON.stringify(
              record.persistencePending ? [...without, metadata] : without,
            ),
          )
        } catch {}
      } finally {
        await context.close()
      }
    }
    publishAudio(record)
    return record
  }
  async function generateTwo() {
    if (!authorized)
      throw new Error("Autoriza las dos solicitudes antes de generar.")
    const jobId = crypto.randomUUID()
    const response = await labRequest<{ job: { id: string } }>(token, "/jobs", {
      jobId,
      script,
      taggedScript: taggedScript || script,
      voiceId,
      characterId,
      name: name || character?.name || "Narración",
    })
    setLastJob(response.job.id)
    setAuthorized(false)
    localStorage.setItem(
      `voice-lab:last-job:${session?.userId}`,
      response.job.id,
    )
    const completed: LabAudio[] = []
    for (const take of [0, 1]) {
      setMessage(
        `Solicitando toma ${take + 1}/2 · se conservará cada resultado antes de continuar…`,
      )
      try {
        const result = await labRequest<{ audio: LabAudio }>(
          token,
          `/jobs/${response.job.id}/takes/${take}`,
          {},
        )
        completed.push(await rememberAudio(result.audio))
        if (result.audio.persistencePending)
          throw new Error(
            "La toma se recibió, pero no se confirmó su guardado. Descárgala ahora y usa Recuperar guardado; no se solicitará otra toma automáticamente.",
          )
      } catch (error) {
        throw new Error(
          `${
            completed.length ? "La primera toma recibida se conserva. " : ""
          }${(error as Error).message} No se repitió ningún cobro.`,
        )
      }
    }
    setAuthorized(false)
    await refresh()
    setMessage(
      "Dos tomas guardadas. Escúchalas y elige qué interpretación usará el vídeo.",
    )
  }
  async function saveCharacter() {
    let imageId: string | undefined
    if (characterFile) {
      const verified = await createImageBitmap(characterFile)
      verified.close()
      imageId = (await uploadLabFile(token, characterFile, { kind: "image" }))
        .record.id
    }
    const result = await labRequest<{ character: Character }>(
      token,
      "/characters",
      {
        name: characterName,
        description: characterDescription,
        voiceId,
        imageId,
      },
    )
    await refresh()
    setCharacterId(result.character.id)
    setCharacterName("")
    setCharacterDescription("")
    setCharacterFile(undefined)
    setMessage(
      "Personaje guardado en tu biblioteca privada; podrás reutilizarlo sin recrearlo.",
    )
  }
  async function uploadAudio() {
    if (!upload) throw new Error("Selecciona primero un archivo de audio.")
    const context = new AudioContext()
    let duration
    try {
      duration = (await context.decodeAudioData(await upload.arrayBuffer()))
        .duration
    } finally {
      await context.close()
    }
    const result = await uploadLabFile(token, upload, {
      name: name || upload.name,
      script: spokenText(script),
      duration: String(duration),
      characterId,
    })
    await rememberAudio(result.record)
    setUpload(undefined)
    setTab("library")
    setMessage(
      "Audio original guardado en Supabase. No se ha llamado a ElevenLabs ni generado otra voz.",
    )
  }
  async function alignAudio() {
    if (!audio) return
    const result = await labRequest<{ audio: LabAudio }>(
      token,
      `/audio/${audio.id}/align`,
      { script: spokenText(script || audio.script), authorized: true },
    )
    await rememberAudio(result.audio)
    if (project?.audioId === result.audio.id) {
      const updated = await labRequest<{ project: LabProject }>(
        token,
        "/projects",
        project,
      )
      setLibrary((previous) => ({
        ...previous,
        projects: previous.projects.map((row) =>
          row.id === project.id ? updated.project : row,
        ),
      }))
    }
    setMessage(
      "Alineación del archivo y su transcripción guardada. No se ha regenerado la voz.",
    )
  }
  async function prepareVideo() {
    if (!audio || !characterId)
      throw new Error(
        "Elige un audio y un personaje antes de preparar el vídeo.",
      )
    if (audio.persistencePending)
      throw new Error(
        "Confirma primero el guardado del audio antes de vincularlo a un vídeo.",
      )
    if (!audio.script.trim())
      throw new Error("Añade el guion y guarda la transcripción del audio.")
    const words = timelineWords(audio)
    const scenes = prepareScenes(words)
    const result = await labRequest<{ project: LabProject }>(
      token,
      "/projects",
      {
        title: name || audio.name,
        characterId,
        audioId: audio.id,
        scenes,
        sfx: `Tactile sound design for ${character?.description || character?.name}. ${scenes
          .slice(0, 4)
          .map((scene) => `${scene.start.toFixed(1)}s: soft gesture accent`)
          .join("; ")}. No music or voices.`.slice(0, 450),
        music: `Instrumental accompaniment for ${character?.description || "a character-led narrated video"}. ${audio.script.slice(0, 350)}. No vocals; support speech, no dramatic final cadence.`,
      },
    )
    // Estimates are explicitly marked; provider-aligned timings are retained verbatim.
    setLibrary((previous) => ({
      ...previous,
      projects: [
        result.project,
        ...previous.projects.filter((doc) => doc.id !== result.project.id),
      ],
    }))
    setProjectId(result.project.id)
    setRender(undefined)
    setTab("projects")
    setMessage(
      "Vídeo preparado con la duración de la voz y sus escenas. SFX y música solo se generarán cuando pulses sus botones.",
    )
  }
  async function createBase() {
    if (!project || !previewAudio) return
    const response = await fetch(previewAudio.url, {
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok)
      throw new Error("No se pudo recuperar la voz seleccionada.")
    const context = new AudioContext()
    let buffer: AudioBuffer
    try {
      buffer = await context.decodeAudioData(await response.arrayBuffer())
    } finally {
      await context.close()
    }
    const controller = new AbortController()
    renderAbort.current = controller
    try {
      const element = document.querySelector<HTMLElement>(".vl-page")!
      const blob = await renderCharacterBase(
        project,
        character,
        buffer,
        palette(element),
        controller.signal,
        setMessage,
      )
      setRender({
        url: URL.createObjectURL(blob),
        filename: `${project.title}-personaje.mp4`,
        mime: "video/mp4",
      })
      setMessage(
        "Composición visual renderizada en este navegador. Ya puedes exportarla con tu voz, captions y mezcla, sin regenerar audio.",
      )
    } finally {
      renderAbort.current = null
    }
  }
  async function generateBed(kind: "sfx" | "music") {
    if (!project || !mix) return
    const result = await api<GeneratedBed>(
      "/audio/generate",
      {
        kind,
        text: project[kind],
        duration:
          kind === "sfx"
            ? Math.min(30, Math.max(0.5, project.duration))
            : Math.max(3, project.duration),
      },
      token,
    )
    const response = await fetch(result.url, {
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok)
      throw new Error(
        "La pista se generó, pero no se pudo descargar. No vuelvas a generarla con otros parámetros para recuperar el archivo.",
      )
    const blob = await response.blob()
    const context = new AudioContext()
    let duration
    try {
      duration = (await context.decodeAudioData(await blob.arrayBuffer()))
        .duration
    } finally {
      await context.close()
    }
    await putAudio(result.id, blob)
    const next = {
      ...mix,
      clips: [
        ...mix.clips.filter((clip) => clip.kind !== kind),
        {
          id: `lab-${kind}`,
          kind,
          asset: result.id,
          start: 0,
          duration: kind === "music" ? project.duration : duration,
          description: project[kind],
        },
      ],
    }
    saveAudioState(`voice-lab-video:${project.id}`, next)
    setMix(next)
    if (result.persistencePending) {
      setMessage(
        "Pista lista localmente, guardado remoto pendiente. Conserva o descarga el audio.",
      )
      return
    }
    const saved = await labRequest<{ project: LabProject }>(
      token,
      `/projects/${project.id}/tracks`,
      { kind, assetId: result.id, duration },
    )
    setLibrary((previous) => ({
      ...previous,
      projects: previous.projects.map((doc) =>
        doc.id === project.id ? saved.project : doc,
      ),
    }))
    setMessage(
      `${
        kind === "sfx" ? "SFX" : "Música"
      } guardada. La voz seleccionada no se ha regenerado.`,
    )
  }
  function editProject(field: "sfx" | "music", value: string) {
    setLibrary((previous) => ({
      ...previous,
      projects: previous.projects.map((doc) =>
        doc.id === projectId ? { ...doc, [field]: value } : doc,
      ),
    }))
  }
  function strip(kind: Kind, patch: MixPatch) {
    if (!mix || !project) return
    const next = {
      ...mix,
      strips: { ...mix.strips, [kind]: { ...mix.strips[kind], ...patch } },
    }
    saveAudioState(`voice-lab-video:${project.id}`, next)
    setMix(next)
  }
  async function exportVideo() {
    if (!render || !mix || !project) return
    const tracks = await tracksForExport(mix)
    try {
      const blob = await mixMp4(
        render,
        tracks.tracks,
        project.duration,
        setMessage,
        project.words.length ? captionOptions(project) : undefined,
        { normalize: mix.normalize },
      )
      saveBlob(blob, `${project.title}-voz-captions.mp4`)
      setMessage("Vídeo con la voz seleccionada, mezcla y captions descargado.")
    } finally {
      tracks.release()
    }
  }
  const disabled = Boolean(working)
  const catalog = library.audio.filter((item) =>
    `${item.name} ${item.script}`.toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <Box className="wg-shell vl-page" aria-busy={Boolean(working)}>
      <Box className="vl-shell">
        <Box className="vl-topbar">
          <Strong>
            YT AUTOMATION <Text>PERSONAJES Y VOCES</Text>
          </Strong>
          <Button
            onClick={() => {
              location.hash = "library"
            }}
          >
            Volver a mis vídeos
          </Button>
        </Box>
        <Box className="vl-heading">
          <Text className="vl-eyebrow">UN PERSONAJE. MUCHAS HISTORIAS.</Text>
          <Heading role="heading" aria-level={1}>
            Primero la voz.
            <br />
            Después, la escena.
          </Heading>
          <Text>
            Crea interpretaciones, conserva tus originales y construye cada
            vídeo sobre el audio que tú eliges. Este espacio no modifica tus
            proyectos anteriores.
          </Text>
          <Box className="vl-stats">
            <Text>
              <Strong>{library.characters.length}</Strong> personajes
            </Text>
            <Text>
              <Strong>
                {
                  library.audio.filter((item) => !item.persistencePending)
                    .length
                }
              </Strong>{" "}
              audios guardados
            </Text>
            <Text>
              <Strong>{library.projects.length}</Strong> vídeos preparados
            </Text>
          </Box>
        </Box>
        <Box className="vl-tabs">
          {[
            ["studio", "Guion y dos tomas"],
            ["library", "Biblioteca de audio"],
            ["projects", "Vídeos preparados"],
          ].map(([id, label]) => (
            <Button
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
          <Button
            disabled={disabled}
            onClick={() =>
              void operate("refresh", async () => {
                await refresh()
                setMessage("Biblioteca actualizada desde Supabase.")
              })
            }
          >
            Actualizar biblioteca
          </Button>
        </Box>
        {!connected && (
          <Text className="vl-notice" role="alert">
            La biblioteca remota no está confirmada. Puedes preparar el guion,
            pero no se mostrará un audio como guardado hasta que el servidor lo
            confirme.
          </Text>
        )}
        {(message || working) && (
          <Text className="vl-notice" role="status" aria-live="polite">
            {message || `Procesando ${working}…`}
          </Text>
        )}
        <Box className="vl-layout">
          <Box className="vl-main">
            <Section className="vl-card">
              <Box className="vl-section-title">
                <Heading>Tu reparto</Heading>
                <Text>Identidad y voz reutilizables</Text>
              </Box>
              <Box className="vl-characters">
                {library.characters.map((item) => (
                  <Button
                    key={item.id}
                    className="vl-character"
                    aria-pressed={characterId === item.id}
                    onClick={() => {
                      setCharacterId(item.id)
                      setVoiceId(item.voiceId)
                      setProjectId("")
                    }}
                  >
                    {item.imageUrl ? (
                      <CharacterImage src={item.imageUrl} alt="" />
                    ) : (
                      <Strong className="vl-monogram">
                        {item.name.slice(0, 1)}
                      </Strong>
                    )}
                    <Strong>{item.name}</Strong>
                    <Text>{item.description || "Personaje reutilizable"}</Text>
                  </Button>
                ))}
                {!library.characters.length && (
                  <Text>
                    Añade tu primer personaje. Su imagen y voz quedarán
                    disponibles para los siguientes vídeos.
                  </Text>
                )}
              </Box>
              <Disclosure title="Añadir un personaje">
                <Box className="vl-fields">
                  <Field label="Nombre">
                    <Input
                      value={characterName}
                      maxLength={80}
                      onChange={(event) => setCharacterName(event.target.value)}
                    />
                  </Field>
                  <Field label="Personalidad y estilo">
                    <Textarea
                      value={characterDescription}
                      maxLength={1000}
                      onChange={(event) =>
                        setCharacterDescription(event.target.value)
                      }
                      placeholder="Cómo se expresa, qué energía tiene y cómo debe acompañar al guion…"
                    />
                  </Field>
                  <Field label="Imagen propia · PNG, JPG o WebP, hasta 10 MB">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) =>
                        setCharacterFile(event.target.files?.[0])
                      }
                    />
                  </Field>
                  <Text>
                    Se guardará con el Voice ID seleccionado debajo. Sin imagen,
                    se usa una ficha visual con su inicial; no se inventa una
                    ilustración.
                  </Text>
                  <Button
                    disabled={disabled || !connected || !characterName.trim()}
                    onClick={() => void operate("character", saveCharacter)}
                  >
                    Guardar personaje
                  </Button>
                </Box>
              </Disclosure>
            </Section>
            {tab === "studio" && (
              <Section className="vl-card">
                <Box className="vl-section-title">
                  <Heading>Dirige la interpretación</Heading>
                  <Text>Eleven v3 · dos solicitudes independientes</Text>
                </Box>
                <Box className="vl-two">
                  <Field label="Título del audio">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Una referencia fácil de encontrar después"
                    />
                  </Field>
                  <Field label="Voz del catálogo">
                    <Select
                      value={voiceId}
                      onChange={(event) => setVoiceId(event.target.value)}
                    >
                      <Option value="">Selecciona una voz</Option>
                      {voiceId && !voices.some((v) => v.id === voiceId) && (
                        <Option value={voiceId}>Voice ID personalizado</Option>
                      )}
                      {voices.map((voice) => (
                        <Option key={voice.id} value={voice.id}>
                          {voice.name}
                        </Option>
                      ))}
                    </Select>
                  </Field>
                </Box>
                <Box className="vl-two">
                  <Field label="O pega un Voice ID">
                    <Input
                      value={voiceId}
                      onChange={(event) =>
                        setVoiceId(event.target.value.trim())
                      }
                      placeholder="No una API key"
                    />
                  </Field>
                  <Button
                    disabled={disabled}
                    onClick={() => void operate("voices", loadVoices)}
                  >
                    Cargar catálogo gratuito
                  </Button>
                </Box>
                {selectedVoice?.previewUrl && (
                  <Box className="vl-sample">
                    <Text>
                      Muestra existente de {selectedVoice.name} · sin generación
                    </Text>
                    <AudioPlayer
                      src={selectedVoice.previewUrl}
                      aria-label="Muestra gratuita del catálogo"
                    />
                  </Box>
                )}
                <Field label="Tu guion original">
                  <Textarea
                    rows={8}
                    value={script}
                    maxLength={5000}
                    onChange={(event) => {
                      setScript(event.target.value)
                      setTaggedScript(event.target.value)
                    }}
                    placeholder="Pega aquí lo que quieres que diga el personaje. Estas palabras no se reescriben al añadir emoción."
                  />
                </Field>
                <Box className="vl-two">
                  <Field label="Dirección emocional">
                    <Select
                      value={tone}
                      onChange={(event) => setTone(event.target.value)}
                    >
                      {[
                        "natural",
                        "cercano",
                        "entusiasta",
                        "íntimo",
                        "dramático",
                        "pausado",
                      ].map((value) => (
                        <Option key={value} value={value}>
                          {value}
                        </Option>
                      ))}
                    </Select>
                  </Field>
                  <Button
                    disabled={!script.trim() || disabled}
                    onClick={() => {
                      setTaggedScript(autoTag(script, tone))
                      setMessage(
                        "Propuesta local de etiquetas aplicada. Revísala: no se ha llamado a ElevenLabs ni alterado las palabras del guion.",
                      )
                    }}
                  >
                    Auto-tag · propuesta local
                  </Button>
                </Box>
                <Field
                  label={`Guion con interpretación · ${(taggedScript || script).length}/5000`}
                >
                  <Textarea
                    data-tag-editor
                    rows={7}
                    value={taggedScript || script}
                    maxLength={5000}
                    onChange={(event) => setTaggedScript(event.target.value)}
                  />
                </Field>
                <Disclosure title="Añadir etiquetas como en ElevenLabs">
                  {Object.entries(tagGroups).map(([group, tags]) => (
                    <Box key={group} className="vl-tag-group">
                      <Text>{group}</Text>
                      <Box className="vl-tags">
                        {tags.map((tag) => (
                          <Button
                            key={tag}
                            disabled={disabled}
                            onClick={() => {
                              const field =
                                document.querySelector<HTMLTextAreaElement>(
                                  "[data-tag-editor]",
                                )
                              const value = taggedScript || script
                              const at = field?.selectionStart || 0
                              const end = field?.selectionEnd || at
                              setTaggedScript(
                                `${value.slice(0, at)}[${tag}] ${value.slice(end)}`,
                              )
                              requestAnimationFrame(() => {
                                field?.focus()
                                field?.setSelectionRange(
                                  at + tag.length + 3,
                                  at + tag.length + 3,
                                )
                              })
                            }}
                          >
                            [{tag}]
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  ))}
                  <Text>
                    Las etiquetas son instrucciones de Eleven v3, no captions.
                    Su efecto depende de la voz y del modelo. El Auto-tag es una
                    sugerencia local revisable, no la función oficial de la web.
                  </Text>
                </Disclosure>
                <Box className="vl-consent">
                  <Field label="Autorizo dos solicitudes de TTS con consumo de créditos">
                    <Input
                      type="checkbox"
                      checked={authorized}
                      onChange={(event) => setAuthorized(event.target.checked)}
                    />
                  </Field>
                  <Text>
                    La API no entrega dos variantes en una sola llamada. Se
                    solicitan dos tomas con semillas distintas y se guarda cada
                    una. No se garantiza una diferencia audible ni se repite un
                    cobro automáticamente.
                  </Text>
                </Box>
                <Box className="vl-actions">
                  <Button
                    className="ml-button-primary"
                    disabled={
                      disabled ||
                      !connected ||
                      !authorized ||
                      !voiceId ||
                      !script.trim()
                    }
                    onClick={() => void operate("takes", generateTwo)}
                  >
                    {working === "takes"
                      ? "Generando las tomas…"
                      : "Crear y guardar 2 tomas"}
                  </Button>
                  {lastJob && (
                    <Button
                      disabled={disabled || !connected}
                      onClick={() =>
                        void operate("recover", async () => {
                          let recovered = 0
                          for (const take of [0, 1]) {
                            try {
                              const result = await labRequest<{
                                audio: LabAudio
                              }>(token, `/jobs/${lastJob}/takes/${take}`)
                              await rememberAudio(result.audio)
                              recovered++
                            } catch {}
                          }
                          setMessage(
                            `${recovered} tomas recuperadas. Esta acción no solicita generaciones nuevas; si una toma quedó incierta, revisa su historial.`,
                          )
                        })
                      }
                    >
                      Recuperar guardado · sin generar
                    </Button>
                  )}
                </Box>
              </Section>
            )}
            {tab === "library" && (
              <Section className="vl-card">
                <Box className="vl-section-title">
                  <Heading>Tus audios, también los originales</Heading>
                  <Text>Subida privada · no genera voz</Text>
                </Box>
                <Text>
                  Si lo has creado en ElevenLabs u otra herramienta, súbelo
                  aquí. El guion actual se guarda como transcripción; después
                  puedes alinearlo con el audio sin volver a sintetizarlo.
                </Text>
                <Field label="Transcripción del audio">
                  <Textarea
                    value={script}
                    maxLength={10000}
                    onChange={(event) => setScript(event.target.value)}
                    placeholder="Pega el texto que se escucha en el archivo"
                  />
                </Field>
                <Field label="Audio propio · hasta 25 MB y 10 minutos">
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => setUpload(event.target.files?.[0])}
                  />
                </Field>
                <Button
                  disabled={disabled || !connected || !upload}
                  onClick={() => void operate("upload", uploadAudio)}
                >
                  Subir y guardar el original
                </Button>
              </Section>
            )}
            {tab === "projects" && (
              <Section className="vl-card">
                <Box className="vl-section-title">
                  <Heading>Vídeos construidos sobre la voz</Heading>
                  <Text>No al revés</Text>
                </Box>
                <Box className="vl-project-list">
                  {library.projects.map((doc) => (
                    <Button
                      key={doc.id}
                      aria-pressed={projectId === doc.id}
                      onClick={() => {
                        setProjectId(doc.id)
                        setAudioId(doc.audioId)
                        setCharacterId(doc.characterId)
                        setVoiceId(
                          library.characters.find(
                            (item) => item.id === doc.characterId,
                          )?.voiceId || "",
                        )
                        setRender(undefined)
                      }}
                    >
                      {doc.title} · {doc.duration.toFixed(1)} s
                    </Button>
                  ))}
                </Box>
                {!project && (
                  <Text>
                    Elige un audio en la biblioteca y pulsa «Preparar vídeo con
                    este audio».
                  </Text>
                )}
                {project && (
                  <>
                    <Text>
                      {project.timingSource === "estimated" ||
                      !project.words.length
                        ? "Captions estimadas: usa Alinear con la voz para obtener tiempos medidos."
                        : "Tiempos medidos a partir de la voz seleccionada."}
                    </Text>
                    {project.scenes.map((scene) => (
                      <Box className="vl-scene" key={scene.id}>
                        <Strong>
                          {scene.start.toFixed(1)}–{scene.end.toFixed(1)} s
                        </Strong>
                        <Text>{scene.text}</Text>
                        <Text>{scene.action}</Text>
                      </Box>
                    ))}
                    <Field label="SFX preparado · máximo 450 caracteres">
                      <Textarea
                        value={project.sfx}
                        maxLength={450}
                        onChange={(event) =>
                          editProject("sfx", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Música preparada · instrumental">
                      <Textarea
                        value={project.music}
                        maxLength={2000}
                        onChange={(event) =>
                          editProject("music", event.target.value)
                        }
                      />
                    </Field>
                    <Box className="vl-actions">
                      <Button
                        disabled={disabled}
                        onClick={() =>
                          void operate("save-project", async () => {
                            const result = await labRequest<{
                              project: LabProject
                            }>(token, "/projects", project)
                            setLibrary((previous) => ({
                              ...previous,
                              projects: previous.projects.map((doc) =>
                                doc.id === project.id ? result.project : doc,
                              ),
                            }))
                            setMessage(
                              "Preparación guardada, sin solicitar SFX ni música.",
                            )
                          })
                        }
                      >
                        Guardar preparación
                      </Button>
                      <Button
                        disabled={disabled}
                        onClick={() =>
                          void operate("sfx", () => generateBed("sfx"))
                        }
                      >
                        Generar solo SFX · con créditos
                      </Button>
                      <Button
                        disabled={disabled}
                        onClick={() =>
                          void operate("music", () => generateBed("music"))
                        }
                      >
                        Generar solo música · con créditos
                      </Button>
                    </Box>
                    {mix && (
                      <Box className="vl-mix">
                        {(["voice", "sfx", "music"] as const).map((kind) => (
                          <Box key={kind}>
                            <Strong>
                              {kind === "voice"
                                ? "Voz elegida"
                                : kind === "sfx"
                                  ? "SFX"
                                  : "Música"}
                            </Strong>
                            <Field label={`Volumen ${kind}`}>
                              <Input
                                type="range"
                                min={0}
                                max={1.5}
                                step={0.01}
                                value={mix.strips[kind].volume}
                                onChange={(event) =>
                                  strip(kind, {
                                    volume: Number(event.target.value),
                                  })
                                }
                              />
                            </Field>
                            <Button
                              aria-pressed={mix.strips[kind].mute}
                              onClick={() =>
                                strip(kind, { mute: !mix.strips[kind].mute })
                              }
                            >
                              {mix.strips[kind].mute ? "Activar" : "Silenciar"}
                            </Button>
                          </Box>
                        ))}
                      </Box>
                    )}
                    <Box className="vl-actions">
                      <Button
                        className="ml-button-primary"
                        disabled={disabled}
                        onClick={() => void operate("render", createBase)}
                      >
                        Renderizar composición del personaje
                      </Button>
                      {working === "render" && (
                        <Button onClick={() => renderAbort.current?.abort()}>
                          Cancelar render
                        </Button>
                      )}
                      <Button
                        disabled={disabled || !render}
                        onClick={() => void operate("export", exportVideo)}
                      >
                        Exportar vídeo · audio y captions
                      </Button>
                    </Box>
                    <Text>
                      El render visual se hace en este navegador, con la pestaña
                      visible. No anima la boca: los gestos siguen la energía y
                      el reloj del audio. El render puede reconstruirse sin
                      pagar otra voz.
                    </Text>
                    {render && (
                      <Export4kButton
                        projectId={`voice-lab-video:${project.id}`}
                        source={render}
                        disabled={disabled}
                      />
                    )}
                  </>
                )}
              </Section>
            )}
          </Box>
          <Box className="vl-side">
            <Section className="vl-card vl-library">
              <Box className="vl-section-title">
                <Heading>Biblioteca de voz</Heading>
                <Text>Guardada en tu cuenta</Text>
              </Box>
              <Field label="Buscar audio">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Título o transcripción…"
                />
              </Field>
              {!catalog.length && (
                <Box className="vl-empty">
                  <Strong>Tu próxima historia empieza aquí.</Strong>
                  <Text>
                    Genera dos tomas o sube un audio propio. No se crean
                    muestras de pago al abrir esta página.
                  </Text>
                  <Button onClick={() => setTab("library")}>
                    Subir mi audio
                  </Button>
                </Box>
              )}
              {catalog.map((item) => (
                <Box
                  key={item.id}
                  className="vl-audio"
                  data-selected={audioId === item.id}
                >
                  <Box className="vl-section-title">
                    <Strong>{item.name}</Strong>
                    <Text>
                      {item.origin === "uploaded"
                        ? "ORIGINAL"
                        : `TOMA ${item.take}`}
                    </Text>
                  </Box>
                  <Text>
                    {item.duration ? `${item.duration.toFixed(1)} s · ` : ""}
                    {item.words.length
                      ? "alineación disponible"
                      : "sin alineación medida"}
                  </Text>
                  {item.url ? (
                    <AudioPlayer
                      src={item.url}
                      aria-label={`Escuchar ${item.name}`}
                      onLoadedMetadata={(event) => {
                        const duration = event.currentTarget.duration
                        if (
                          !item.duration &&
                          Number.isFinite(duration) &&
                          duration > 0
                        )
                          void labRequest(token, `/audio/${item.id}/duration`, {
                            duration,
                          })
                            .then(() =>
                              setLibrary((previous) => ({
                                ...previous,
                                audio: previous.audio.map((row) =>
                                  row.id === item.id
                                    ? { ...row, duration }
                                    : row,
                                ),
                              })),
                            )
                            .catch((error) => setMessage(error.message))
                      }}
                    />
                  ) : (
                    <Text>
                      Archivo no disponible. Actualiza la biblioteca para
                      renovar su enlace.
                    </Text>
                  )}
                  {item.persistencePending && (
                    <Text role="alert">
                      Guardado sin confirmar. Descarga esta toma antes de
                      cerrar.
                    </Text>
                  )}
                  <Box className="vl-actions">
                    <Button
                      aria-pressed={audioId === item.id}
                      onClick={() => {
                        setAudioId(item.id)
                        setProjectId("")
                        setScript(item.script || script)
                        setCharacterId(item.characterId || characterId)
                        setVoiceId(
                          item.voiceId ||
                            library.characters.find(
                              (character) =>
                                character.id ===
                                (item.characterId || characterId),
                            )?.voiceId ||
                            voiceId,
                        )
                      }}
                    >
                      {audioId === item.id
                        ? "Audio seleccionado"
                        : "Usar este audio"}
                    </Button>
                    <Button
                      disabled={disabled || !item.url}
                      onClick={() =>
                        void operate("download", async () => {
                          const response = await fetch(item.url)
                          if (!response.ok)
                            throw new Error("No se pudo descargar el audio.")
                          const ext =
                            ({
                              "audio/mpeg": "mp3",
                              "audio/wav": "wav",
                              "audio/mp4": "m4a",
                              "audio/ogg": "ogg",
                              "audio/webm": "webm",
                            } as Record<string, string>)[
                              item.mimeType || "audio/mpeg"
                            ] || "mp3"
                          saveBlob(
                            await response.blob(),
                            `${item.name.replace(/\.(mp3|wav|m4a|ogg|webm)$/i, "")}.${ext}`,
                          )
                        })
                      }
                    >
                      Descargar
                    </Button>
                  </Box>
                </Box>
              ))}
            </Section>
            {audio && (
              <Section className="vl-card">
                <Heading>Voz seleccionada</Heading>
                <Strong>{audio.name}</Strong>
                <Text>
                  Personaje:{" "}
                  {library.characters.find((c) => c.id === characterId)?.name ||
                    "elige un personaje arriba"}
                </Text>
                <Button
                  disabled={disabled || !connected || !characterId}
                  className="ml-button-primary"
                  onClick={() => void operate("prepare-video", prepareVideo)}
                >
                  Preparar vídeo con este audio
                </Button>
                <Disclosure title="Transcripción y sincronización">
                  <Text>
                    Para un audio subido, las captions se estiman hasta que
                    autorices una alineación medida. No se afirma lip-sync de
                    boca.
                  </Text>
                  <Button
                    disabled={
                      disabled || !script.trim() || audio.persistencePending
                    }
                    onClick={() =>
                      void operate("transcript", async () => {
                        const result = await labRequest<{ audio: LabAudio }>(
                          token,
                          `/audio/${audio.id}/transcript`,
                          { script: spokenText(script) },
                        )
                        await rememberAudio(result.audio)
                        setMessage(
                          "Transcripción guardada. Si cambió el texto, se necesita volver a alinear.",
                        )
                      })
                    }
                  >
                    Guardar transcripción · sin generar
                  </Button>
                  <Button
                    disabled={
                      disabled || !script.trim() || audio.persistencePending
                    }
                    onClick={() => void operate("alignment", alignAudio)}
                  >
                    Alinear con la voz · autorizar consumo
                  </Button>
                  <Text>
                    Requiere permiso de Forced Alignment en la clave de
                    ElevenLabs y puede consumir créditos. No modifica el audio
                    original.
                  </Text>
                </Disclosure>
              </Section>
            )}
            {previewPlan && previewAudio?.url && (
              <Section className="vl-card">
                <Heading>Una misma línea temporal</Heading>
                <ActorPreview
                  project={previewPlan}
                  character={character}
                  audio={previewAudio}
                />
                <Text>
                  {previewPlan.timingSource === "estimated"
                    ? "Tiempos estimados; no son alineación del proveedor."
                    : "Captions basadas en los tiempos de la voz."}
                </Text>
              </Section>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
