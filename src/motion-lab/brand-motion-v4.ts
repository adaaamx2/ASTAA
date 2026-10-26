import { cue, ease } from "./brand-spec.ts"

export const chapters = [
  { start: 0, end: 2.35, name: "THE SECRET" },
  { start: 2.35, end: 5.85, name: "THE PROBLEM" },
  { start: 5.85, end: 7.65, name: "THE TRUTH" },
  { start: 7.65, end: 11.9, name: "THE PURPOSE" },
  { start: 11.9, end: 13.6, name: "THE OUTCOME" },
  { start: 13.6, end: 16.3, name: "THE SYSTEM" },
  { start: 16.3, end: 17.5, name: "THE INTENTION" },
]
export function sceneBlend(time: number, start: number, end: number) {
  return (
    (start === 0 ? 1 : cue(time, start - 0.1, 0.25)) *
    (end === 17.5 ? 1 : 1 - cue(time, end - 0.12, 0.26))
  )
}
/** Secondary motion is local to each shot, not one repeated page transition. */
export function living(time: number, start: number) {
  const local = Math.max(0, time - start)
  return {
    local,
    x: Math.sin(local * 0.85) * 19,
    y: Math.sin(local * 1.05) * 23,
    push: 1 + local * 0.026,
    // The beam is fully outside the alpha silhouette at the loop seam.
    light: -850 + cue((local + 0.2) % 2.4, 0, 2.4) * 1850,
    orbit: local * 13,
  }
}
/** A directed camera move per shot: approach, lateral truck, then a soft release.
 * Text stays within mobile safe areas; objects add their own deeper parallax. */
export function shotCamera(time: number, index: number) {
  const { start, end } = chapters[index]
  const p = Math.max(0, Math.min(1, (time - start) / (end - start)))
  const approach = 1 - (1 - p) ** 3
  const release = cue(p, 0.78, 0.22)
  const direction = [1, -1, 1, -1, 1, 1, -1][index]
  return {
    scale: 0.965 + approach * 0.063 - release * 0.012,
    x: direction * (1 - approach) * 24 - direction * release * 10,
    y: (1 - approach) * 26 - p * 9,
  }
}
export function cubicPoint(progress: number) {
  const p = ease(progress),
    q = 1 - p
  return {
    x:
      q ** 3 * 180 + 3 * q ** 2 * p * 350 + 3 * q * p ** 2 * 700 + p ** 3 * 905,
    y:
      q ** 3 * 1510 +
      3 * q ** 2 * p * 1490 +
      3 * q * p ** 2 * 1200 +
      p ** 3 * 1250,
  }
}
