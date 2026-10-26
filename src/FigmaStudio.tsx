import { useEffect, useRef, useState } from "react"
import FigmaSequence, { figmaChapters } from "./FigmaSequence"
import "./figma-studio.css"
import DownloadButton from "./media/DownloadButton"
import { publicAssetUrl } from "./media/files"
import { useMixedPreview } from "./audio/playback"

export default function FigmaStudio({
  embedded = false,
  projectId = "figma",
}: {
  embedded?: boolean
  projectId?: string
}) {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const mixedPreview = useMixedPreview(projectId)
  useEffect(() => {
    if (!mixedPreview.hasAudio) return
    setTime(mixedPreview.time)
    setPlaying(mixedPreview.playing)
  }, [mixedPreview.hasAudio, mixedPreview.time, mixedPreview.playing])
  const [loop, setLoop] = useState(true)
  const stage = useRef<HTMLDivElement>(null)
  const current = figmaChapters.reduce(
    (n, c, i) => (time >= c.start ? i : n),
    0,
  )
  useEffect(() => {
    if (mixedPreview.hasAudio || !playing) return
    let handle: number
    let previous = performance.now()
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.1)
      previous = now
      setTime((t) => {
        if (t + delta >= 36) {
          if (loop) return (t + delta) % 36
          setPlaying(false)
          return 36
        }
        return t + delta
      })
      handle = requestAnimationFrame(tick)
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [mixedPreview.hasAudio, playing, loop])
  const toggle = () => {
    if (mixedPreview.hasAudio) { mixedPreview.toggle(); return }
    if (time >= 36) setTime(0)
    setPlaying((p) => !p)
  }
  return (
    <div className="fs-studio">
      {!embedded && (
        <header className="fs-header">
          <a href="#library">
            YT AUTOMATION <span>/</span> ESTUDIO
          </a>
          <span>
            PROYECTO 002 <i /> FIGMA
          </span>
        </header>
      )}
      <main className="fs-main">
        <section className="fs-intro">
          <div>
            <p className="fs-eyebrow">A MOTION MANIFESTO — 002</p>
            <h1>
              No soy solo
              <br />
              <em>una herramienta.</em>
            </h1>
            <p>El universo de Figma. Una idea, infinitas posibilidades.</p>
          </div>
          <div className="fs-badges">
            <span>36 segundos</span>
            <span>1080 × 1920</span>
            <span>60 fps</span>
          </div>
        </section>
        <section className="fs-workspace">
          <aside className="fs-chapters">
            <p className="fs-eyebrow">
              LA HISTORIA <span>08 SECUENCIAS</span>
            </p>
            <h2>
              Diseñado para
              <br />
              <em>no pasar desapercibido.</em>
            </h2>
            <div>
              {figmaChapters.map((c, i) => (
                <button
                  key={c.start}
                  className={current === i ? "active" : ""}
                  onClick={() => setTime(c.start)}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{c.title}</strong>
                    <small>
                      {String(c.start).padStart(2, "0")}s — {c.detail}
                    </small>
                  </div>
                  <b>{current === i ? "•" : "↗"}</b>
                </button>
              ))}
            </div>
          </aside>
          <div className="fs-preview">
            <div className="fs-preview-label">
              <span>
                <i /> PREVIEW EN TIEMPO REAL
              </span>
              <span>9:16</span>
            </div>
            <div className="fs-film" ref={stage}>
              <FigmaSequence time={time} />
            </div>
            <div className="fs-controls">
              <button
                onClick={toggle}
                aria-label={playing ? "Pausar" : "Reproducir"}
              >
                {playing ? "Ⅱ" : "▶"}
              </button>
              <button
                onClick={() => {
                  mixedPreview.seek(0, false)
                  setTime(0)
                  setPlaying(false)
                }}
                aria-label="Volver al inicio"
              >
                ↺
              </button>
              <span>
                {`00:${Math.floor(time).toString().padStart(2, "0")}`}{" "}
                <small>/ 00:36</small>
              </span>
              <button
                className={loop ? "enabled" : ""}
                onClick={() => setLoop((v) => !v)}
                aria-pressed={loop}
              >
                Loop
              </button>
              <button
                onClick={() => {
                  if (document.fullscreenElement) void document.exitFullscreen()
                  else void stage.current?.requestFullscreen()
                }}
                aria-label="Pantalla completa"
              >
                ⛶
              </button>
            </div>
            <input
              className="fs-scrubber"
              type="range"
              min="0"
              max="36"
              step={1 / 60}
              value={time}
              onChange={(e) => mixedPreview.hasAudio ? mixedPreview.seek(Number(e.target.value), false) : setTime(Number(e.target.value))}
              aria-label="Posición del vídeo"
            />
            <DownloadButton
              className="fs-download"
              file={{
                url: publicAssetUrl("/exports/figma-manifesto.mp4"),
                filename: "figma-manifesto.mp4",
                mime: "video/mp4",
              }}
            >
              <span>
                Descargar MP4 <small>H.264 · 1080p · 60 fps</small>
              </span>
              <span>↓</span>
            </DownloadButton>
          </div>
          <aside className="fs-direction">
            <p className="fs-eyebrow">DIRECCIÓN CREATIVA</p>
            <div className="fs-asterisk" aria-hidden="true">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                stroke="currentColor"
                strokeWidth="3"
              >
                {[0, 45, 90, 135].map((angle) => (
                  <path
                    key={angle}
                    d="M20 3V37"
                    transform={`rotate(${angle} 20 20)`}
                  />
                ))}
              </svg>
            </div>
            <h2>
              Menos plantilla.
              <br />
              <em>Más carácter.</em>
            </h2>
            <p>
              Negro, crema y rojo profundo. Tipografía cinética, grano editorial
              y movimientos de cámara que conectan cada capítulo.
            </p>
            <div className="fs-palette">
              <i />
              <i />
              <i />
              <i />
            </div>
            <dl>
              <div>
                <dt>Formato</dt>
                <dd>Vertical · 9:16</dd>
              </div>
              <div>
                <dt>Duración</dt>
                <dd>36 s · 2160 frames</dd>
              </div>
              <div>
                <dt>Motor</dt>
                <dd>Remotion</dd>
              </div>
              <div>
                <dt>Tipografía</dt>
                <dd>Manrope + serif</dd>
              </div>
              <div>
                <dt>Audio</dt>
                <dd>Sin audio · texto en pantalla</dd>
              </div>
            </dl>
            <div className="fs-detail">
              <span>EN ESTA SECUENCIA</span>
              <h3>{figmaChapters[current].title}</h3>
              <p>{figmaChapters[current].caption}</p>
            </div>
            <p className="fs-credit">
              Blur Text: adaptación frame a frame de React Bits. Ilustraciones
              vectoriales originales, no imágenes generadas con IA. Estudio
              independiente, no oficial de Figma.
            </p>
          </aside>
        </section>
        <section className="fs-timeline">
          <div className="fs-eyebrow">
            LA PIEZA COMPLETA <span>00:36 / 60 FPS</span>
          </div>
          <div>
            {figmaChapters.map((c, i) => (
              <button
                key={i}
                onClick={() => setTime(c.start)}
                className={current === i ? "active" : ""}
              >
                <small>0{i + 1}</small>
                <span>{c.title}</span>
              </button>
            ))}
          </div>
        </section>
        <footer className="fs-footer">
          <span>YT AUTOMATION / MOTION LIBRARY</span>
          <span>De una idea. A lo que imagines.</span>
        </footer>
      </main>
    </div>
  )
}
