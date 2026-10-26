import { validateAudio } from "../../supabase/functions/server/audio-provider.mjs"
import type { AudioState, Clip, Kind } from "./engine"
import { sfxDuration, sfxPrompt } from "./sound-design.ts"

interface AudioStageError extends Error {
  code?: string
  status?: number | null
  operation?: string
}
export interface AudioStageFailure {
  kind: Kind
  error: AudioStageError
}
export class AudioBatchError extends Error {
  readonly code = "audio_batch_partial"
  readonly failures: AudioStageFailure[]
  constructor(failures: AudioStageFailure[]) {
    super(
      failures
        .map(
          ({ kind, error }) =>
            `${kind === "sfx" ? "SFX" : "Música"}: ${error.message}`,
        )
        .join(" · "),
    )
    this.failures = failures
  }
}
function independentStageFailure(error: AudioStageFailure["error"]) {
  const code = error.code || ""
  if (/^eleven_(401|402|429)/.test(code) || /quota/.test(code)) return false
  return /^eleven_(400|403|404|422)|^eleven_invalid_(response|audio)$|^empty_audio$|^generation_locked$|^audio_(download|decode)_failed$|^silent_audio$/.test(
    code,
  )
}

export async function runAudioBatch(
  initial: AudioState,
  request: (body: Record<string, unknown>, clip: Clip) => Promise<Clip>,
  commit: (state: AudioState) => void,
  progress: (kind: Kind, cached: boolean) => void,
  options: {
    only?: Kind
    onFailure?: (failure: AudioStageFailure) => void
  } = {},
) {
  let state = initial
  const selected = options.only
    ? [options.only]
    : ["voice", "sfx", "music"] as const
  const failures: AudioStageFailure[] = []
  const failed = (kind: Kind, caught: unknown) => {
    const error =
      caught instanceof Error ? caught : new Error("No se completó esta pista.")
    const failure = { kind, error }
    options.onFailure?.(failure)
    if (kind === "voice" || !independentStageFailure(error)) throw error
    failures.push(failure)
  }
  const dictionary = selected.includes("voice")
    ? JSON.parse(state.dictionary)
    : {}
  if (
    !dictionary ||
    Array.isArray(dictionary) ||
    typeof dictionary !== "object"
  )
    throw new Error("El diccionario de pronunciación debe ser un objeto JSON.")
  const voiceText =
    state.drafts?.voice ??
    state.clips
      .filter((c) => c.kind === "voice")
      .map((c) => c.text || c.description)
      .join("\n\n")
  state = {
    ...state,
    soundDesign:
      state.soundDesign ||
      state.clips
        .filter((clip) => clip.kind === "sfx" && !clip.asset)
        .map((clip) => clip.description)
        .join(". ") ||
      "Precise editorial transitions and tactile object movements",
    drafts: { ...state.drafts, voice: voiceText },
  }
  const voice = selected.includes("voice")
    ? validateAudio({
        kind: "voice",
        text: voiceText,
        voiceId: state.voiceId,
        dictionary,
        settings: { stability: state.stability, speed: state.speed },
      })
    : null
  if (selected.includes("sfx"))
    validateAudio({
      kind: "sfx",
      text: sfxPrompt(state),
      duration: sfxDuration(state),
    })
  // Validate every editable field before the first billable request.
  if (selected.includes("music"))
    validateAudio({
      kind: "music",
      text: state.mood,
      duration: Math.max(3, state.duration),
    })
  const sfxStart = state.sfxStart ?? 0
  if (
    selected.includes("sfx") &&
    (!Number.isFinite(sfxStart) || sfxStart < 0 || sfxStart >= state.duration)
  )
    throw new Error("El instante del SFX debe estar dentro del vídeo.")
  for (const kind of selected) {
    const config =
      kind === "voice"
        ? voice!
        : kind === "sfx"
          ? validateAudio({
              kind,
              text: sfxPrompt(state),
              duration: sfxDuration(state),
            })
          : validateAudio({
              kind,
              text: state.mood,
              duration: Math.max(3, state.duration),
            })
    const generationKey = JSON.stringify(config)
    const existing = state.clips.find(
      (c) => c.kind === kind && c.asset && c.generationKey === generationKey,
    )
    progress(kind, Boolean(existing))
    if (existing) {
      if (existing.silent) {
        failed(
          kind,
          Object.assign(
            new Error(
              "La pista guardada contiene silencio. Se conserva el archivo; no se ha repetido una solicitud de pago. Cambia su descripción para solicitar un resultado distinto.",
            ),
            { code: "silent_audio" },
          ),
        )
        continue
      }
      if (kind === "sfx" && existing.start !== sfxStart) {
        state = {
          ...state,
          clips: state.clips.map((c) =>
            c.id === existing.id ? { ...c, start: sfxStart } : c,
          ),
        }
        commit(state)
      }
      continue
    }
    const clip: Clip = {
      id: `studio-${kind}`,
      kind,
      start: kind === "sfx" ? sfxStart : 0,
      duration: kind === "sfx" ? Number(config.duration) : state.duration,
      text: kind === "voice" ? config.text : undefined,
      description: config.text,
      generationKey,
    }
    // Never retry a paid request. A provider-specific SFX failure must not prevent music.
    let generated: Clip
    try {
      generated = await request(config, clip)
    } catch (error) {
      failed(kind, error)
      continue
    }
    const duration =
      kind === "voice"
        ? Math.max(
            initial.visualDuration ?? initial.duration,
            generated.duration,
          )
        : state.duration
    state = {
      ...state,
      duration,
      clips: [
        ...state.clips.filter((c) => c.kind !== kind),
        {
          ...generated,
          generationKey,
          duration: kind === "music" ? duration : generated.duration,
        },
      ].map((c) => (c.kind === "music" ? { ...c, duration } : c)),
    }
    commit(state)
    if (generated.silent)
      failed(
        kind,
        Object.assign(
          new Error(
            "El archivo recibido contiene silencio o señal prácticamente nula. Se conserva; no se ha regenerado automáticamente.",
          ),
          { code: "silent_audio" },
        ),
      )
  }
  if (failures.length) throw new AudioBatchError(failures)
  return state
}
