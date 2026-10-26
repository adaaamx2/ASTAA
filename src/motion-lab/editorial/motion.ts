export const clamp = (value: number) => Math.max(0, Math.min(1, value))
/** C2-continuous at both ends: no velocity/acceleration jump on a cut. */
export const smooth = (value: number) => {
  const t = clamp(value)
  return t * t * t * (t * (t * 6 - 15) + 10)
}
export const ramp = (time: number, from: number, to: number) =>
  smooth((time - from) / (to - from))
export function sceneEnvelope(time: number, start: number, end: number) {
  return (
    (start === 0 ? 1 : ramp(time, start - 0.28, start + 0.18)) *
    (1 - ramp(time, end - 0.18, end + 0.28))
  )
}
export function textMotion(time: number, delay = 0) {
  const p = ramp(time, delay - 0.12, delay + 0.46)
  return { opacity: p, y: (1 - p) * 90, rotation: (1 - p) * -3 }
}
