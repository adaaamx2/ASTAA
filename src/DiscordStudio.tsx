import { useEffect, useRef, useState } from "react"
import MotionSequence from "./MotionSequence"
import DownloadButton from "./media/DownloadButton"
import { publicAssetUrl } from "./media/files"
import { useMixedPreview } from "./audio/playback"

interface IconProps {
  name: string
  size?: number
}
function Icon({ name, size = 20 }: IconProps) {
  const paths: Record<string, React.ReactNode> = {
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" strokeWidth="3" />
      </>
    ),
    reset: (
      <>
        <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />
      </>
    ),
    expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    sound: (
      <>
        <path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.arrow}
    </svg>
  )
}

function Discord({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 128 100"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M104.4 8.2A105 105 0 0 0 79 0l-3.2 6.6a94 94 0 0 0-23.6 0L49 0a105 105 0 0 0-25.4 8.2C7.5 32 3.1 55.2 5.3 78a104 104 0 0 0 31.2 15.8l6.4-10.4a66 66 0 0 1-10-4.8l2.4-1.8c19.3 8.8 40 8.8 59.3 0l2.5 1.8a66 66 0 0 1-10 4.8l6.4 10.4A104 104 0 0 0 124.7 78c2.7-26.4-4.5-49.4-20.3-69.8ZM44.5 64.2c-6 0-10.8-5.6-10.8-12.5s4.7-12.5 10.8-12.5 10.9 5.7 10.8 12.5c0 6.9-4.8 12.5-10.8 12.5Zm39 0c-6 0-10.8-5.6-10.8-12.5s4.7-12.5 10.8-12.5 10.9 5.7 10.8 12.5c0 6.9-4.7 12.5-10.8 12.5Z" />
    </svg>
  )
}

const chapters = [
  {
    title: "No es solo un chat.",
    label: "La introducción",
    start: 0,
    end: 2.5,
    detail: "Una nueva forma de estar cerca.",
  },
  {
    title: "Millones. Conectados.",
    label: "El impacto",
    start: 2.5,
    end: 5,
    detail: "Más de 200 M de usuarios al mes.",
  },
  {
    title: "Tu mundo. Tu comunidad.",
    label: "La conexión",
    start: 5,
    end: 7.5,
    detail: "Voz, vídeo y un lugar para todos.",
  },
  {
    title: "Aquí es donde encajas.",
    label: "El cierre",
    start: 7.5,
    end: 10,
    detail: "Imagina un lugar. Hazlo tuyo.",
  },
]

export default function DiscordStudio({
  embedded = false,
  projectId = "discord",
}: {
  embedded?: boolean
  projectId?: string
}) {
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  const [time, setTime] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1.8 : 0,
  )
  const mixedPreview = useMixedPreview(projectId)
  useEffect(() => {
    if (!mixedPreview.hasAudio) return
    setTime(mixedPreview.time)
    setPlaying(mixedPreview.playing)
  }, [mixedPreview.hasAudio, mixedPreview.time, mixedPreview.playing])
  const [loop, setLoop] = useState(true)
  const [info, setInfo] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const current = Math.min(3, Math.floor(time / 2.5))

  useEffect(() => {
    if (mixedPreview.hasAudio || !playing) return
    let frame: number
    let previous = performance.now()
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.1)
      previous = now
      setTime((t) => {
        if (t + delta >= 10) {
          if (loop) return (t + delta) % 10
          setPlaying(false)
          return 10
        }
        return t + delta
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [mixedPreview.hasAudio, playing, loop])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !e.defaultPrevented &&
        !["INPUT", "BUTTON", "TEXTAREA", "SELECT", "A"].includes(
          (e.target as HTMLElement).tagName,
        ) &&
        !(e.target as HTMLElement).isContentEditable
      ) {
        e.preventDefault()
        if (mixedPreview.hasAudio) { mixedPreview.toggle(); return }
        setPlaying((v) => !v)
      }
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [mixedPreview.hasAudio, mixedPreview.playing])

  const togglePlay = () => {
    if (mixedPreview.hasAudio) { mixedPreview.toggle(); return }
    if (time >= 10) setTime(0)
    setPlaying(!playing)
  }

  return (
    <div className="app">
      {!embedded && (
        <header className="topbar">
          <a href="#" className="studio-logo" aria-label="Forma Studio">
            <span className="logo-mark">
              <i />
              <i />
              <i />
            </span>
            forma<span className="logo-dot">®</span>
          </a>
          <div className="header-center">
            <span className="status-dot" /> MOTION EXPLORATION{" "}
            <span className="header-slash">/</span> 001
          </div>
          <span className="header-right">Ideas que se mueven.</span>
        </header>
      )}

      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">INDEPENDENT MOTION STUDY</div>
            <h1>
              Conexiones que
              <br />
              se sienten.
            </h1>
            <p>El universo de Discord. En diez segundos.</p>
          </div>
          <div className="project-tags">
            <span>
              <i /> Discord
            </span>
            <span>Motion design</span>
            <span>2025</span>
          </div>
        </section>

        <section className="workspace">
          <aside className="left-panel">
            <div className="section-label">
              <span>LA PIEZA</span>
              <span>01 — 04</span>
            </div>
            <h2>
              Menos ruido.
              <br />
              <span>Más conexión.</span>
            </h2>
            <p className="description">
              Una historia de comunidades,
              <br />
              contada con movimiento.
              <br />
              Diseñada para sentirse.
            </p>
            <div className="chapter-list">
              {chapters.map((chapter, i) => (
                <button
                  key={chapter.label}
                  className={`chapter ${current === i ? "active" : ""}`}
                  onClick={() => setTime(chapter.start)}
                >
                  <span className="chapter-number">0{i + 1}</span>
                  <span>
                    <strong>{chapter.label}</strong>
                    <small>
                      {chapter.start.toFixed(1)} — {chapter.end.toFixed(1)} s
                    </small>
                  </span>
                  <span className="chapter-indicator">
                    {current === i ? (
                      <span className="equalizer">
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : (
                      <Icon name="arrow" size={14} />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="creative-note">
              <span className="tiny-star">✳</span>
              <p>
                Tipografía que habla.
                <br />
                Movimiento con intención.
              </p>
            </div>
          </aside>

          <div className="preview-column">
            <div className="preview-top">
              <span>
                <i /> LIVE PREVIEW
              </span>
              <span>
                9:16 <span className="subtle">/</span> 1080 × 1920
              </span>
            </div>
            <div className={`film scene-${current}`} ref={stage}>
              <MotionSequence time={time} />
              <div className="film-grain" />
              <div
                className="film-progress"
                style={{ width: `${time * 10}%` }}
              />
            </div>
            <div className="playback">
              <button
                className="play-button"
                onClick={togglePlay}
                aria-label={playing ? "Pausar" : "Reproducir"}
              >
                <Icon name={playing ? "pause" : "play"} size={17} />
              </button>
              <button
                className="icon-button"
                onClick={() => mixedPreview.hasAudio ? mixedPreview.seek(0, false) : setTime(0)}
                aria-label="Reiniciar"
              >
                <Icon name="reset" size={16} />
              </button>
              <span className="timecode">
                {time.toFixed(1).padStart(4, "0")} <span>/ 10.0</span>
              </span>
              <div className="playback-spacer" />
              <button
                className={`loop-button ${loop ? "enabled" : ""}`}
                onClick={() => setLoop(!loop)}
                aria-pressed={loop}
              >
                ↻ <span>Loop</span>
              </button>
              <button
                className="icon-button"
                aria-label="Pantalla completa"
                onClick={() => {
                  if (document.fullscreenElement) void document.exitFullscreen()
                  else void stage.current?.requestFullscreen()
                }}
              >
                <Icon name="expand" size={16} />
              </button>
            </div>
            <DownloadButton
              className="video-download"
              file={{
                url: publicAssetUrl("/exports/discord-motion.mp4"),
                filename: "discord-motion.mp4",
                mime: "video/mp4",
              }}
            >
              <span>
                Descargar MP4 <span aria-hidden="true">↗</span>
              </span>
              <small>1080 × 1920 · 60 fps · 10 s</small>
            </DownloadButton>
          </div>

          <aside className="right-panel">
            <div className="section-label">EL CONCEPTO</div>
            <div className="concept-icon">
              <Discord />
            </div>
            <h3>
              Una gran idea.
              <br />
              Una forma simple.
            </h3>
            <p>
              Inspirado en la claridad de Apple.
              <br />
              Con el espíritu de Discord.
            </p>
            <div className="specs">
              <div>
                <span>Duración</span>
                <b>10 segundos</b>
              </div>
              <div>
                <span>Formato</span>
                <b>Vertical · 9:16</b>
              </div>
              <div>
                <span>Resolución de diseño</span>
                <b>1080 × 1920</b>
              </div>
              <div>
                <span>Estilo</span>
                <b>Kinetic typography</b>
              </div>
            </div>
            <div className="palette">
              <i />
              <i />
              <i />
              <i />
              <span>THE COLOR STORY</span>
            </div>
            <div className="sound-note">
              <span className="note-line" />
              <span>
                Una pieza visual.
                <br />
                <b>Sin sonido. Con mucho que decir.</b>
              </span>
            </div>
            <button className="credits-link" onClick={() => setInfo(!info)}>
              Notas de la pieza <span>{info ? "−" : "+"}</span>
            </button>
            {info && (
              <p className="credits">
                Estudio conceptual independiente, no afiliado a Discord ni
                Apple. Dato: más de 200 millones de usuarios activos mensuales,
                anunciado por Discord en mayo de 2024. Animación interactiva en
                tiempo real; no es un archivo de vídeo.
              </p>
            )}
          </aside>
        </section>

        <section className="timeline-section">
          <div className="timeline-heading">
            <span>
              LA SECUENCIA <b>10.00 s</b>
            </span>
            <span>Cuatro momentos. Una historia.</span>
          </div>
          <div className="timeline">
            <div className="timeline-clips">
              {chapters.map((c, i) => (
                <button
                  key={c.label}
                  className={`timeline-clip clip-${i} ${
                    current === i ? "selected" : ""
                  }`}
                  onClick={() => mixedPreview.hasAudio ? mixedPreview.seek(c.start, false) : setTime(c.start)}
                >
                  <span>0{i + 1}</span>
                  <strong>{c.title}</strong>
                  <small>2.5 s</small>
                </button>
              ))}
            </div>
            <div className="playhead" style={{ left: `${time * 10}%` }} />
            <input
              type="range"
              min="0"
              max="10"
              step=".01"
              value={time}
              onChange={(e) => mixedPreview.hasAudio ? mixedPreview.seek(Number(e.target.value), false) : setTime(Number(e.target.value))}
              aria-label="Posición en la secuencia"
            />
          </div>
          <div className="ruler">
            {["00:00", "00:02.5", "00:05", "00:07.5", "00:10"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <span>
          FORMA STUDIO <span className="footer-divider">/</span> HECHO PARA
          SENTIR.
        </span>
        <span>
          Un pequeño estudio sobre el poder de conectar.{" "}
          <span className="footer-star">✳</span>
        </span>
      </footer>
    </div>
  )
}
