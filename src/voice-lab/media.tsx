import type { AudioHTMLAttributes, ImgHTMLAttributes, Ref } from "react"

// Native media extensions; the existing UI primitives do not expose these controls.
export function AudioPlayer(
  props: AudioHTMLAttributes<HTMLAudioElement> & {
    ref?: Ref<HTMLAudioElement>
  },
) {
  return <audio controls preload="metadata" {...props} />
}
export function CharacterImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} />
}
