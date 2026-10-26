import type { WordTiming } from "../production/timing"

export interface ClockSamples {
  count: number
  maxDriftMs: number
}
export function verifySync(
  text: string,
  words: WordTiming[],
  duration: number,
) {
  const normalize = (text: string) =>
    text.trim().replace(/\s+/g, " ").normalize("NFC")
  const available = Array.isArray(words) && words.length > 0
  const validTimes =
    available &&
    words.every(
      (word) =>
        typeof word?.text === "string" &&
        Number.isFinite(word.start) &&
        Number.isFinite(word.end) &&
        word.start >= 0 &&
        word.end > word.start,
    )
  const checks = {
    provider:
      available &&
      words.every((word) => word?.source === "provider-character-alignment"),
    text:
      available &&
      words.every((word) => typeof word?.text === "string") &&
      normalize(words.map((word) => word.text).join(" ")) === normalize(text),
    ordered:
      validTimes &&
      words.every(
        (word, index) => !index || word.start >= words[index - 1].end - 0.02,
      ),
    insideAudio:
      validTimes &&
      Number.isFinite(duration) &&
      duration > 0 &&
      words.every((word) => word.end <= duration + 0.08),
  }
  const status =
    !Number.isFinite(duration) || duration <= 0
      ? "pending"
      : !checks.provider
        ? "unverified"
        : Object.values(checks).every(Boolean)
          ? "checked"
          : "failed"
  return {
    status,
    checks,
    duration: Number.isFinite(duration) ? duration : null,
    wordCount: available ? words.length : 0,
    firstWord: validTimes ? words[0].start : null,
    lastWord: validTimes ? words.at(-1)!.end : null,
  }
}
