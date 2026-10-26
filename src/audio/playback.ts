import { useEffect, useState } from "react"
import {
  activeKinds,
  connectClip,
  decodeClip,
  kinds,
  readAudioState,
  sfxAudibility,
  type AudioState,
  type Kind,
} from "./engine"

type Snapshot = {
  playing: boolean
  loading: boolean
  time: number
  duration: number
  hasAudio: boolean
  error: string
}
type Session = {
  id: string
  context: AudioContext
  gains: Record<Kind, GainNode>
  master: GainNode
  origin: number
  offset: number
  duration: number
  frame: number
}
const snapshots = new Map<string, Snapshot>()
const listeners = new Map<string, number>()
let active: Session | null = null
let sequence = 0
function snapshot(id: string): Snapshot {
  if (!snapshots.has(id)) {
    const state = readAudioState(id)
    snapshots.set(id, {
      playing: false,
      loading: false,
      time: 0,
      error: "",
      duration: state?.duration || 0,
      hasAudio: Boolean(state?.clips.some((c) => c.asset)),
    })
  }
  return snapshots.get(id)!
}
function publish(id: string, patch: Partial<Snapshot>) {
  snapshots.set(id, { ...snapshot(id), ...patch })
  window.dispatchEvent(new CustomEvent("audio-preview-state", { detail: id }))
}
export function pausePreview(id: string) {
  if (active?.id === id) {
    sequence++
    const session = active
    active = null
    cancelAnimationFrame(session.frame)
    const time = Math.min(
      session.duration,
      session.offset +
        Math.max(0, session.context.currentTime - session.origin),
    )
    void session.context.close()
    publish(id, { playing: false, loading: false, time })
  } else if (snapshot(id).loading) {
    sequence++
    publish(id, { playing: false, loading: false })
  }
}
function gainsFor(session: Session, state: AudioState) {
  const included = activeKinds(state)
  for (const kind of kinds)
    session.gains[kind].gain.setTargetAtTime(
      included.includes(kind) ? state.strips[kind].volume : 0,
      session.context.currentTime,
      0.015,
    )
  session.master.gain.setTargetAtTime(
    state.master,
    session.context.currentTime,
    0.015,
  )
}
export async function startPreview(id: string, offset = snapshot(id).time) {
  if (active) pausePreview(active.id)
  const request = ++sequence
  const state = readAudioState(id)
  if (!state?.clips.some((c) => c.asset)) return
  const context = new AudioContext()
  publish(id, { loading: true, error: "" })
  try {
    await context.resume()
    const master = context.createGain(),
      limiter = context.createDynamicsCompressor()
    limiter.threshold.value = -1
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.001
    limiter.release.value = 0.05
    master.connect(limiter)
    limiter.connect(context.destination)
    const gains = Object.fromEntries(
      kinds.map((kind) => {
        const gain = context.createGain()
        gain.connect(master)
        return [kind, gain]
      }),
    ) as Record<Kind, GainNode>
    const buffers = await Promise.all(
      state.clips
        .filter((c) => c.asset)
        .map(async (clip) => ({
          clip,
          buffer: await decodeClip(context, clip),
        })),
    )
    if (
      activeKinds(state).length === 1 &&
      activeKinds(state)[0] === "sfx" &&
      buffers.filter(({ clip }) => clip.kind === "sfx").length > 0 &&
      buffers
        .filter(({ clip }) => clip.kind === "sfx")
        .every(({ buffer }) => !buffer || sfxAudibility(buffer).silent)
    )
      throw new Error(
        "El archivo SFX contiene silencio o un nivel prácticamente nulo. No se ha regenerado ni consumido créditos; revisa o sustituye solo esa pista.",
      )
    if (request !== sequence) {
      await context.close()
      return
    }
    offset = offset >= state.duration ? 0 : Math.max(0, offset)
    const session: Session = {
      id,
      context,
      master,
      gains,
      offset,
      duration: state.duration,
      origin: context.currentTime + 0.05,
      frame: 0,
    }
    gainsFor(session, readAudioState(id) || state)
    for (const { clip, buffer } of buffers) {
      if (!buffer || clip.start + clip.duration <= offset) continue
      const elapsed = Math.max(0, offset - clip.start)
      const remaining = Math.min(
        clip.duration - elapsed,
        clip.kind === "music" ? Infinity : buffer.duration - elapsed,
      )
      if (remaining <= 0) continue
      connectClip(
        context,
        buffer,
        { ...clip, duration: remaining },
        gains[clip.kind],
        session.origin + Math.max(0, clip.start - offset),
        elapsed,
      )
    }
    active = session
    publish(id, { playing: true, loading: false, time: offset })
    const clock = () => {
      if (active !== session) return
      const time = Math.min(
        state.duration,
        offset + Math.max(0, context.currentTime - session.origin),
      )
      if (time >= state.duration) {
        pausePreview(id)
        return
      }
      publish(id, { time })
      session.frame = requestAnimationFrame(clock)
    }
    session.frame = requestAnimationFrame(clock)
  } catch (error) {
    if (context.state !== "closed") await context.close()
    if (request === sequence)
      publish(id, {
        playing: false,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo reproducir la mezcla del vídeo.",
      })
  }
}
export function seekPreview(
  id: string,
  time: number,
  resume = snapshot(id).playing,
) {
  pausePreview(id)
  publish(id, { time: Math.max(0, Math.min(snapshot(id).duration, time)) })
  if (resume) void startPreview(id, time)
}
export function useMixedPreview(id: string) {
  const [value, setValue] = useState(() => snapshot(id))
  useEffect(() => {
    listeners.set(id, (listeners.get(id) || 0) + 1)
    setValue(snapshot(id))
    let signature = JSON.stringify(readAudioState(id)?.clips)
    const receive = (event: Event) => {
      if ((event as CustomEvent).detail === id) setValue(snapshot(id))
    }
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail.id !== id) return
      const state: AudioState = detail.state
      const next = JSON.stringify(state.clips)
      const changedTracks = next !== signature
      if (changedTracks) {
        pausePreview(id)
        signature = next
      }
      if (active?.id === id) gainsFor(active, state)
      publish(id, {
        hasAudio: state.clips.some((c) => c.asset),
        duration: state.duration,
        ...(changedTracks ? { time: 0 } : {}),
      })
    }
    window.addEventListener("audio-preview-state", receive)
    window.addEventListener("audio-state-updated", changed)
    return () => {
      window.removeEventListener("audio-preview-state", receive)
      window.removeEventListener("audio-state-updated", changed)
      listeners.set(id, (listeners.get(id) || 1) - 1)
      if (!listeners.get(id)) pausePreview(id)
    }
  }, [id])
  return {
    ...value,
    toggle: () =>
      value.playing || value.loading ? pausePreview(id) : void startPreview(id),
    pause: () => pausePreview(id),
    seek: (time: number, resume?: boolean) => seekPreview(id, time, resume),
  }
}
