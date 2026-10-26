import type { Scene } from "./data"

export const activePacks = ["pop", "karaoke", "kinetic", "comic"] as const
export type SubtitlePack = typeof activePacks[number]
export type WordTiming = {
  text: string
  start: number
  end: number
  sceneId: number
  source: "estimated" | "provider-character-alignment"
}

// Until recorded narration exists, these cues are explicitly estimates, not alignment.
export function estimateWords(scenes: Scene[]): WordTiming[] {
  return scenes.flatMap((scene) => {
    const words = scene.voice.trim().split(/\s+/).filter(Boolean)
    const weights = words.map(
      (text) =>
        Math.max(1, text.match(/[aeiouáéíóúü]+/gi)?.length ?? 1) +
        (/[,.…:;!?]$/.test(text) ? 0.8 : 0),
    )
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let cursor = scene.start
    return words.map((text, i) => {
      const start = cursor
      cursor =
        i === words.length - 1
          ? scene.end
          : cursor + ((scene.end - scene.start) * weights[i]) / total
      return {
        text,
        sceneId: scene.id,
        source: "estimated" as const,
        start,
        end: cursor,
      }
    })
  })
}

/** Groups use the global word timeline. A scene cut does not restart a caption. */
export function groupWords(words: WordTiming[], size: number) {
  const groups: WordTiming[][] = []
  let group: WordTiming[] = []
  for (const word of words) {
    const previous = group.at(-1)
    if (
      group.length &&
      (group.length >= size ||
        (previous &&
          (/[.!?…,:;]$/.test(previous.text) ||
            word.start - previous.end > 0.35)))
    ) {
      groups.push(group)
      group = []
    }
    group.push(word)
  }
  if (group.length) groups.push(group)
  return groups
}
export function captionAt(words: WordTiming[], pack: string, time: number) {
  const groups = groupWords(
    words,
    pack === "pop" ? 1 : pack === "comic" ? 4 : 3,
  )
  const group = groups.find((group, index) => {
    const end = Math.min(
      groups[index + 1]?.[0].start ?? Infinity,
      group.at(-1)!.end + 0.16,
    )
    return time >= group[0].start && time < end
  })
  if (!group) return null
  // Keep the phrase on screen through short inter-word pauses without
  // advancing to the next word before its actual provider timestamp.
  const active = group.reduce(
    (previous, word) => (word.start <= time ? word : previous),
    group[0],
  )
  return { group, active }
}

export function subtitleCues(scenes: Scene[], pack: string, timings?: WordTiming[]) {
  const size = pack === "pop" ? 1 : pack === "comic" ? 4 : 3
  const words = timings?.length ? timings : estimateWords(scenes)
  const cues: {
    start: number
    end: number
    text: string
  }[] = []
  for (const group of groupWords(words, size)) {
    cues.push({
      start: group[0].start,
      end: group.at(-1)!.end,
      text: group.map((w) => w.text).join(" "),
    })
  }
  return cues
}

export function subtitleFile(
  scenes: Scene[],
  pack: string,
  format: "srt" | "vtt",
  timings?: WordTiming[],
) {
  const stamp = (seconds: number) => {
    const ms = Math.round(seconds * 1000)
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${
      format === "srt" ? "," : "."
    }${String(ms % 1000).padStart(3, "0")}`
  }
  return (
    (format === "vtt" ? "WEBVTT\n\n" : "") +
    subtitleCues(scenes, pack, timings)
      .map(
        (cue, i) =>
          `${i + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`,
      )
      .join("\n")
  )
}
