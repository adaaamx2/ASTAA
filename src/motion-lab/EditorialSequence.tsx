import BrandSequence, { brandAssetUrls } from "./BrandSequence"
import type { EditorialId } from "./editorial-timeline"

export { editorialScenes } from "./editorial-timeline"
export type { EditorialId } from "./editorial-timeline"
export const editorialAssetUrls = brandAssetUrls

export async function loadEditorialFonts() {
  await Promise.all([
    document.fonts.load('500 24px "Inter Variable"'),
    document.fonts.load('850 244px "Inter Tight Variable"'),
    document.fonts.load('italic 400 235px "Instrument Serif"'),
  ])
  await document.fonts.ready
}

interface Props {
  id: EditorialId
  time: number
}
export default function EditorialSequence({ id, time }: Props) {
  return id === "brand-strategy" ? <BrandSequence time={time} /> : null
}
