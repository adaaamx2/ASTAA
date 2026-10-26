import type { MixTrack } from "../media/mux"
import { api } from "../motion-lab/api"
export type Kind = "voice" | "sfx" | "music"
export type Strip = {
  volume: number
  mute: boolean
  solo: boolean
  enabled: boolean
}
export type Clip = {
  id: string
  kind: Kind
  start: number
  duration: number
  description: string
  text?: string
  asset?: string
  sceneId?: string
  sceneOffset?: number
  words?: Array<{
    text: string
    start: number
    end: number
  }>
  generationKey?: string
  silent?: boolean
}
export interface AudioDrafts {
  voice?: string
  sfx?: string
}
export type AudioState = {
  strips: Record<Kind, Strip>
  master: number
  normalize: boolean
  clips: Clip[]
  voiceId: string
  voiceName: string
  stability: number
  speed: number
  mood: string
  dictionary: string
  duration: number
  drafts?: AudioDrafts
  visualDuration?: number
  sfxDuration?: number
  sfxStart?: number
  soundDesign?: string
}
export const kinds: Kind[] = ["voice", "sfx", "music"]
export const labels = { voice: "Voz", sfx: "SFX", music: "Música" }
export function defaultState(duration: number, clips: Clip[] = []): AudioState {
  return {
    strips: Object.fromEntries(
      kinds.map((kind, i) => [
        kind,
        { volume: [1, 0.7, 0.3][i], mute: false, solo: false, enabled: true },
      ]),
    ) as AudioState["strips"],
    master: 1,
    normalize: false,
    clips,
    voiceId: "",
    voiceName: "",
    stability: 0.48,
    speed: 1,
    mood: "Instrumental cálida, elegante y atmosférica, ritmo suave, sin voces",
    dictionary: "{}",
    duration,
  }
}
export function activeKinds(state: AudioState) {
  const solo = kinds.some(
    (k) =>
      state.strips[k].solo && state.strips[k].enabled && !state.strips[k].mute,
  )
  return kinds.filter(
    (k) =>
      state.strips[k].enabled &&
      !state.strips[k].mute &&
      state.strips[k].volume > 0 &&
      (!solo || state.strips[k].solo),
  )
}
const stateKey = (id: string) => `yt-audio-v2:${id}`
export function readAudioState(id: string): AudioState | null {
  try {
    return JSON.parse(localStorage.getItem(stateKey(id)) || "null")
  } catch {
    return null
  }
}
export function saveAudioState(id: string, state: AudioState) {
  localStorage.setItem(stateKey(id), JSON.stringify(state))
  window.dispatchEvent(
    new CustomEvent("audio-state-updated", { detail: { id, state } }),
  )
}
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("yt-audio-v2", 1)
    request.onupgradeneeded = () => request.result.createObjectStore("assets")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(new Error("No se pudo abrir el almacenamiento local de audio."))
  })
}
export async function putAudio(id: string, blob: Blob) {
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("assets", "readwrite")
      tx.objectStore("assets").put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () =>
        reject(
          new Error(
            "No se pudo guardar el audio. Descarga el archivo antes de cerrar.",
          ),
        )
    })
  } finally {
    db.close()
  }
}
export async function getAudio(id: string): Promise<Blob | null> {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction("assets").objectStore("assets").get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(new Error("No se pudo leer la pista local."))
    })
  } finally {
    db.close()
  }
}
export async function decodeClip(context: BaseAudioContext, clip: Clip) {
  if (!clip.asset) return null
  let blob = await getAudio(clip.asset)
  if (!blob && clip.asset.startsWith("voice-lab:")) {
    const token = JSON.parse(localStorage.getItem("yt-owner-auth") || "null")?.access_token ||
      sessionStorage.getItem("yt-studio-session") || ""
    const result = await api<{ audio: { url: string } }>(
      `/voice-lab/audio/${encodeURIComponent(clip.asset.slice(10))}`, undefined, token,
    )
    const response = await fetch(result.audio.url, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error("No se pudo recuperar la voz de la biblioteca de personajes.")
    blob = await response.blob()
    await putAudio(clip.asset, blob)
  }
  if (!blob && /^[a-f0-9]{64}$/.test(clip.asset)) {
    const token =
      JSON.parse(localStorage.getItem("yt-owner-auth") || "null")
        ?.access_token ||
      sessionStorage.getItem("yt-studio-session") ||
      ""
    const result = await api<{ url: string }>(
      `/audio/assets/${clip.asset}`,
      undefined,
      token,
    )
    const response = await fetch(result.url)
    if (!response.ok)
      throw new Error(
        "No se pudo recuperar el audio guardado. Comprueba el almacenamiento.",
      )
    blob = await response.blob()
    await putAudio(clip.asset, blob)
  }
  if (!blob)
    throw new Error(
      `Falta el archivo de ${labels[clip.kind]}. Vuelve a subirlo o recupera la generación desde su caché.`,
    )
  return context.decodeAudioData(await blob.arrayBuffer())
}
export function wav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels,
    length = buffer.length * channels * 2
  const bytes = new ArrayBuffer(44 + length),
    view = new DataView(bytes)
  const text = (at: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  text(0, "RIFF")
  view.setUint32(4, 36 + length, true)
  text(8, "WAVE")
  text(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  text(36, "data")
  view.setUint32(40, length, true)
  for (let i = 0; i < buffer.length; i++)
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]))
      view.setInt16(
        44 + (i * channels + c) * 2,
        sample < 0 ? sample * 32768 : sample * 32767,
        true,
      )
    }
  return new Blob([bytes], { type: "audio/wav" })
}
export function connectClip(
  context: BaseAudioContext,
  buffer: AudioBuffer,
  clip: Clip,
  destination: AudioNode,
  start: number,
  offset = 0,
) {
  const source = context.createBufferSource()
  source.buffer = buffer
  const gain = context.createGain()
  source.loop = clip.kind === "music"
  source.connect(gain)
  gain.connect(destination)
  const duration =
    clip.kind === "music"
      ? clip.duration
      : Math.min(clip.duration, buffer.duration)
  gain.gain.setValueAtTime(
    clip.kind === "sfx" ? sfxAudibility(buffer).gain : 1,
    start,
  )
  if (clip.kind === "music") {
    gain.gain.setValueAtTime(1, start + Math.max(0, duration - 0.5))
    gain.gain.linearRampToValueAtTime(0, start + duration)
  }
  source.start(start, clip.kind === "music" ? offset % buffer.duration : offset)
  source.stop(start + duration)
  return source
}
export function sfxAudibility(buffer: AudioBuffer) {
  let peak = 0,
    sum = 0,
    count = 0
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel)
    for (let i = 0; i < samples.length; i++) {
      peak = Math.max(peak, Math.abs(samples[i]))
      sum += samples[i] * samples[i]
      count++
    }
  }
  const rms = Math.sqrt(sum / Math.max(1, count))
  return {
    silent: peak < 0.0001,
    peak,
    rms,
    gain:
      peak >= 0.0001 && peak < 0.08
        ? Math.min(8, 0.08 / Math.max(rms, 0.0001), 0.8 / peak)
        : 1,
  }
}
export async function renderTrack(state: AudioState, kind: Kind) {
  const context = new OfflineAudioContext(
    2,
    Math.ceil(state.duration * 44100),
    44100,
  )
  for (const clip of state.clips.filter((c) => c.kind === kind && c.asset)) {
    const buffer = await decodeClip(context, clip)
    if (buffer)
      connectClip(context, buffer, clip, context.destination, clip.start)
  }
  return context.startRendering()
}
export async function tracksForExport(
  state: AudioState,
): Promise<{
  tracks: MixTrack[]
  release: () => void
  summary: string
}> {
  const selected = activeKinds(state).filter((k) =>
    state.clips.some((c) => c.kind === k && c.asset),
  )
  const urls: string[] = []
  try {
    const tracks: MixTrack[] = []
    for (const kind of selected) {
      const blob = wav(await renderTrack(state, kind)),
        url = URL.createObjectURL(blob)
      urls.push(url)
      tracks.push({
        file: { url, filename: `${kind}.wav`, mime: "audio/wav" },
        volume: state.strips[kind].volume * state.master,
      })
    }
    return {
      tracks,
      release: () => urls.forEach((u) => URL.revokeObjectURL(u)),
      summary: selected.length
        ? selected
            .map(
              (k) =>
                `${labels[k]} ${Math.round(state.strips[k].volume * 100)}%`,
            )
            .join(" · ") + ` · Máster ${Math.round(state.master * 100)}%`
        : "Sin pistas de audio: MP4 silencioso",
    }
  } catch (error) {
    urls.forEach((u) => URL.revokeObjectURL(u))
    throw error
  }
}
