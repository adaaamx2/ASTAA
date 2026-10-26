import { useEffect, useState } from "react"
import FinnSequence from "./FinnSequence"
import type { Project } from "./data"
import { activePacks, subtitleFile } from "./timing"
import RenderedVariants from "./RenderedVariants"
import useAudioTimeline from "../audio/useAudioTimeline"
import { useMixedPreview } from "../audio/playback"

function save(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  )
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function FinnPlayer({
  project,
  exports = false,
}: {
  project: Project
  exports?: boolean
}) {
  const [time, setTime] = useState(0)
  const audioTimeline = useAudioTimeline(`finn:${project.id}`, project.scenes)
  const mixedPreview = useMixedPreview(`finn:${project.id}`)
  const timedScenes = audioTimeline.scenes
  useEffect(() => {
    if (!mixedPreview.hasAudio) return
    setTime(mixedPreview.time)
    setPlaying(mixedPreview.playing)
  }, [mixedPreview.hasAudio, mixedPreview.time, mixedPreview.playing])
  const [playing, setPlaying] = useState(false)
  const projectPack = activePacks.find((id) => id === project.pack) ?? "pop"
  const [pack, setPack] = useState<string>(projectPack)
  const duration = mixedPreview.hasAudio ? mixedPreview.duration : Math.max(0, ...timedScenes.map((scene) => scene.end))
  const lastFrame = Math.max(0, duration - 1 / 60)
  const position = Math.max(0, Math.min(time, lastFrame))
  const hasScenes = project.scenes.length > 0 && duration > 0
  useEffect(() => {
    if (mixedPreview.hasAudio || !playing || !hasScenes) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.1)
      previous = now
      setTime((t) => (t + delta) % duration)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [mixedPreview.hasAudio, playing, duration, hasScenes])
  useEffect(() => {
    setTime(0)
    setPlaying(false)
  }, [project.id, duration])
  useEffect(() => {
    setPack(projectPack)
  }, [project.id, projectPack])
  return (
    <section className="p-finn-review">
      <div className="p-section-head">
        <div>
          <span className="p-eyebrow">
            PREVIEW / {project.scenes.length} ESCENAS
          </span>
          <h2>
            {exports
              ? "Cuatro variantes. Una misma historia."
              : "Ahora sí: tu vídeo en movimiento."}
          </h2>
          <p>
            {audioTimeline.hasVoice ? `Reloj de voz · tiempos ${audioTimeline.estimated ? "parcialmente estimados" : "reales del proveedor"}. Reproducir utiliza la mezcla de Voz y audio.` : "Animatic sin voz · tiempos estimados. Genera o sube voz desde Voz y audio."} No es un máster aprobado.
          </p>
        </div>
      </div>
      <div className="p-finn-layout">
        <div className="p-finn-player">
          {hasScenes ? (
            <FinnSequence
              time={position}
              scenes={timedScenes}
              timings={audioTimeline.words}
              pack={pack}
              accent={project.accent}
              subtitleSize={project.subtitleSize}
            />
          ) : (
            <div className="p-finn-empty">
              <p>Añade una escena al guion para previsualizar el vídeo.</p>
            </div>
          )}
          <div className="p-actions p-finn-controls">
            <button
              className="p-primary"
              disabled={!hasScenes}
              onClick={() => mixedPreview.hasAudio ? mixedPreview.toggle() : setPlaying((p) => !p)}
            >
              {playing ? "Pausar" : "Reproducir"}
            </button>
            <span className="p-finn-time">
              {position.toFixed(1)} / {duration.toFixed(1)} s
            </span>
            <button
              className="p-secondary"
              disabled={!hasScenes}
              onClick={() => {
                mixedPreview.seek(0, false)
                setTime(0)
                setPlaying(false)
              }}
            >
              Reiniciar
            </button>
          </div>
          <input
            type="range"
            aria-label="Posición del vídeo"
            min="0"
            max={lastFrame}
            step={1 / 60}
            value={position}
            disabled={!hasScenes}
            onChange={(e) => mixedPreview.hasAudio ? mixedPreview.seek(Number(e.target.value), false) : setTime(Number(e.target.value))}
          />
        </div>
        <div className="p-mobile-notes">
          <h3>Revisa la historia completa.</h3>
          <div
            className="p-actions p-finn-pack-switch"
            role="group"
            aria-label="Pack de subtítulos de la preview"
          >
            {activePacks.map((id) => (
              <button
                className={pack === id ? "p-primary" : "p-secondary"}
                key={id}
                aria-pressed={pack === id}
                onClick={() => setPack(id)}
              >
                {id === "comic" ? "Cómic" : id[0].toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
          {timedScenes.map((s, i) => (
            <button
              className="p-variant"
              key={s.id}
              aria-current={
                position >= s.start && position < s.end ? "step" : undefined
              }
              onClick={() => {
                mixedPreview.seek(s.start, false)
                setTime(s.start)
                setPlaying(false)
              }}
            >
              <span>
                {String(i + 1).padStart(2, "0")} · {s.title}
              </span>
              <small>
                {s.start}–{s.end} s
              </small>
            </button>
          ))}
          <p>
            Preview y Remotion comparten composición. Las pistas generadas o
            subidas se reproducen con los volúmenes del mezclador. La boca no
            simula sincronía sin audio.
          </p>
          {exports && (
            <>
              <h3>Subtítulos descargables</h3>
              <p>
                Son tiempos provisionales, no sincronía de voz. SRT/VTT no
                conservan las animaciones.
              </p>
              <div className="p-actions">
                {(["srt", "vtt"] as const).map((format) => (
                  <button
                    key={format}
                    className="p-secondary"
                    onClick={() =>
                      save(
                        `${project.id}-${pack}-estimado.${format}`,
                        subtitleFile(timedScenes, pack, format, audioTimeline.words),
                      )
                    }
                  >
                    Descargar {format.toUpperCase()}
                  </button>
                ))}
              </div>
              <p>
                La voz, el máster aprobado y el overlay alfa siguen pendientes;
                no se ofrecen enlaces ficticios.
              </p>
            </>
          )}
        </div>
      </div>
      {exports && <RenderedVariants project={project} />}
    </section>
  )
}
