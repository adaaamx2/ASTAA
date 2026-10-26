/** Measured from the supplied 720x1280 / 17.5s reference, expressed at 1080p.
 * These are visual title cues, not ElevenLabs caption alignment. */
export const brandSpec = {
  version: 4,
  width: 1080,
  height: 1920,
  duration: 17.5,
  fps: 60,
  red: "#952d46",
  referenceSha256:
    "cfd2818409fdf8ee36a6b962dc7bd22c14c87ef6caf5f73cef3c9d7473d3c682",
  cuts: [0, 2.35, 5.85, 7.65, 11.9, 13.6, 16.3, 17.5],
  reviewTimes: [1.9, 5.5, 6.95, 10.9, 12.85, 15.75, 17.1],
  minimumSceneScore: 9,
  visualApproval: false,
  blockingAssetScenes: [],
}

export function clamp(value: number) {
  return Math.max(0, Math.min(1, value))
}
export function ease(value: number) {
  const t = clamp(value)
  return t * t * t * (10 + t * (-15 + 6 * t))
}
export function cue(time: number, start: number, duration = 0.32) {
  return ease((time - start) / duration)
}
/** Critically damped object entrance, with no oscillatory "floating". */
export function settle(time: number, rate = 7) {
  const t = Math.max(0, time)
  return 1 - (1 + rate * t) * Math.exp(-rate * t)
}
export function hold(time: number, start: number, end: number, fade = 0.16) {
  return cue(time, start, fade) * (1 - cue(time, end - fade, fade))
}
