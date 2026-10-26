import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { drawStudy } from "./art"
import { studies, type StudyId } from "./studies"
import EditorialPreview from "./EditorialPreview"
import PreviewBoundary from "../workspace/PreviewBoundary"
import { brandSpec } from "./brand-spec"
import LaboralPreview from "./LaboralPreview"

interface Props {
  id: StudyId
  time: number
  onReady?: () => void
  playing?: boolean
  speed?: number
}
export default function StudyCanvas({ id, time = 0, onReady, playing = false, speed = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [fontsReady, setFontsReady] = useState(false)
  const study = studies.find((study) => study.id === id)!
  useEffect(() => {
    let live = true
    document.fonts.ready.then(() => {
      if (live) setFontsReady(true)
    })
    return () => {
      live = false
    }
  }, [id])
  useLayoutEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext("2d")
    if (canvas && context && (id === "enbu" || id === "blue-hour"))
      drawStudy(context, id, time, study.width, study.height)
  }, [id, time, study.width, study.height, fontsReady])
  if (id === "laboral-clothing")
    return <LaboralPreview time={time} onReady={onReady} playing={playing} speed={speed} />
  if (id === "editing-collage" || id === "brand-strategy")
    return (
      <PreviewBoundary
        key={`${id}:${id === "brand-strategy" ? brandSpec.version : 1}`}
        label="La animación"
      >
        <EditorialPreview id={id} time={time} onReady={onReady} />
      </PreviewBoundary>
    )
  return (
    <canvas
      ref={ref}
      width={study.width}
      height={study.height}
      className="ml-art"
      role="img"
      aria-label={`${study.title} · fotograma ${time.toFixed(2)} s`}
    />
  )
}
