import type { CaptionRender } from "./caption-frames"

export interface CaptionExportRequest {
  id: string
  captions?: CaptionRender
}

/** Ask the mounted preview for its current words, pack and caption switch. */
export function currentExportCaptions(id: string) {
  const detail: CaptionExportRequest = { id }
  window.dispatchEvent(new CustomEvent("studio-export-captions", { detail }))
  return detail.captions
}
