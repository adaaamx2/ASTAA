import { useEffect, useMemo, useState } from "react"
import Captions from "./Captions"
import { packs, type Project } from "./data"
import { estimateWords } from "./timing"

interface Props {
  project: Project
  onSelect: (pack: string) => void
}
export default function CaptionSamples({ project, onSelect }: Props) {
  const [time, setTime] = useState(0)
  const duration = Math.max(0, ...project.scenes.map(scene => scene.end))
  const words = useMemo(() => estimateWords(project.scenes), [project.scenes])
  useEffect(() => {
    if (!duration || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let frame = 0, previous = performance.now()
    const tick = (now: number) => {
      const delta = Math.min(.1, (now - previous) / 1000) * project.subtitleSpeed
      previous = now
      setTime(time => (time + delta) % duration)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [project.id, project.subtitleSpeed, duration])
  return <div className="p-packs">{packs.map(pack => <button key={pack.id} className={`p-pack ${pack.id === project.pack ? "selected" : ""}`} onClick={() => onSelect(pack.id)}>
    <div className="p-caption-preview"><svg viewBox="0 730 540 180" width="100%" height="100%" role="img" aria-label={`${pack.name} · tiempo global ${time.toFixed(1)} s`}><Captions time={time} words={words} pack={pack.id} accent={project.accent} size={project.subtitleSize} /></svg></div>
    <div><strong>{pack.name}</strong><span>{pack.grouping}</span></div><p>{pack.concept}</p>
  </button>)}</div>
}
