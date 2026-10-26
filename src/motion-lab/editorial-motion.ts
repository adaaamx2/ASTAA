export const EDITORIAL_WIDTH = 1080
export const EDITORIAL_HEIGHT = 1920
export const EDITORIAL_FPS = 60
export const TRANSITION_SECONDS = 0.64

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

/** Quintic ease: zero velocity AND acceleration at both ends. */
export function smooth(value: number) {
  const t = clamp01(value)
  return t * t * t * (10 + t * (-15 + 6 * t))
}

export function reveal(time: number, delay = 0, duration = 0.55) {
  return smooth((time - delay) / duration)
}

/** Adjacent layers share the same transition clock and meet exactly at the edge. */
export function scenePose(time: number, start: number, end: number, final = false) {
  const half = TRANSITION_SECONDS / 2
  const incoming = start === 0 ? 1 : reveal(time, start - half, TRANSITION_SECONDS)
  const outgoing = final ? 0 : reveal(time, end - half, TRANSITION_SECONDS)
  return {
    visible: time >= Math.max(0, start - half) && (final || time < end + half),
    x: EDITORIAL_WIDTH * (1 - incoming - outgoing),
    incoming,
    outgoing,
    blur: 7 * Math.max(Math.sin(incoming * Math.PI), Math.sin(outgoing * Math.PI)),
  }
}

export function drift(time: number, amount = 10, phase = 0) {
  return Math.sin(time * 0.72 + phase) * amount
}

export type TransitionKind = "pan" | "vertical" | "depth" | "zoom" | "iris" | "focus"
const transitions: Record<string, TransitionKind[]> = {
  "editing-collage": ["depth", "pan", "zoom", "zoom", "pan", "vertical", "pan", "focus", "depth", "iris"],
  "brand-strategy": ["pan", "iris", "iris", "focus", "vertical", "depth"],
}
export function transitionKind(id: string, boundary: number): TransitionKind {
  return transitions[id]?.[boundary] || "pan"
}
export function shotPresentation(id: string, index: number, pose: ReturnType<typeof scenePose>) {
  const incoming = transitionKind(id, index - 1), outgoing = transitionKind(id, index)
  const enter = 1 - pose.incoming, leave = pose.outgoing
  const fades = (kind: TransitionKind) => kind === "depth" || kind === "zoom" || kind === "focus"
  return {
    x: (incoming === "pan" ? 1080 * enter : 0) - (outgoing === "pan" ? 1080 * leave : 0),
    y: (incoming === "vertical" ? 1920 * enter : incoming === "depth" ? 110 * enter : 0) - (outgoing === "vertical" ? 1920 * leave : 0) + (outgoing === "depth" ? 190 * leave : 0),
    scale: 1 + (incoming === "zoom" ? .55 * enter : incoming === "depth" ? .18 * enter : incoming === "focus" ? .06 * enter : 0)
      + (outgoing === "zoom" ? .42 * leave : outgoing === "depth" ? -.16 * leave : outgoing === "focus" ? .06 * leave : 0),
    rotation: (incoming === "zoom" ? -5 * enter : 0) + (outgoing === "zoom" ? 4 * leave : 0),
    opacity: (fades(incoming) ? pose.incoming : 1) * (fades(outgoing) ? 1 - leave : 1),
    iris: incoming === "iris" && pose.incoming < 1,
    irisProgress: pose.incoming,
    incoming,
    outgoing,
  }
}
