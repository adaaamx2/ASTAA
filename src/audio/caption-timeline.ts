import { estimateWords, type WordTiming } from "../production/timing.ts"
import type { Scene } from "../production/data"
import type { AudioState } from "./engine"

export function audioCaptionWords(
  state: AudioState | null,
  fallback: Scene[],
): WordTiming[] {
  const clips =
    state?.clips.filter((clip) => clip.kind === "voice" && clip.asset) || []
  if (!clips.length) return estimateWords(fallback)
  return clips.flatMap((clip, index) =>
    clip.words?.length
      ? clip.words.map((word) => ({
          ...word,
          start: word.start + clip.start,
          end: word.end + clip.start,
          sceneId: index,
          source: "provider-character-alignment" as const,
        }))
      : estimateWords([
          {
            id: index,
            title: "Narración",
            start: clip.start,
            end: clip.start + clip.duration,
            voice: clip.text || clip.description,
            visual: "",
          },
        ]),
  )
}
