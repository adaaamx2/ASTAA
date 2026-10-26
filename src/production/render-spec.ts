import type { Project } from "./data"

// Keep this serializable: downloadable renders must correspond to the current edit.
export function renderSpec(project: Project) {
  return {
    engine: "finn-captions-3",
    scenes: project.scenes.map(({ id, title, start, end, voice, visual }) => ({
      id,
      title,
      start,
      end,
      voice,
      visual,
    })),
    accent: project.accent,
    subtitleSize: project.subtitleSize,
  }
}
