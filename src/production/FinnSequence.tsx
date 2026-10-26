import { Finn } from "./Frames"
import { scenes as originalScenes, type Scene } from "./data"
import { estimateWords } from "./timing"
import type { WordTiming } from "./timing"
import Captions from "./Captions"

const ink = "#183738"
const lime = "#c3ef67"
const titles = [
  "",
  "TOKENS",
  "NÚMEROS",
  "ATENCIÓN",
  "SIGUIENTE PIEZA",
  "REPETIR",
  "SÍGUEME",
]
const clamp = (n: number) => Math.max(0, Math.min(1, n))

/** Pure frame-clock composition: the browser and Remotion draw exactly the same frame. */
export default function FinnSequence({
  time,
  scenes = originalScenes,
  pack = "pop",
  accent = lime,
  subtitleSize = 42,
  timings,
}: {
  time: number
  scenes?: Scene[]
  pack?: string
  accent?: string
  subtitleSize?: number
  timings?: WordTiming[]
}) {
  const sceneIndex = Math.max(
    0,
    scenes.findIndex((s) => time >= s.start && time < s.end),
  )
  const scene = scenes[sceneIndex]
  if (!scene) return null
  const t = time - scene.start
  const progress = clamp(t / (scene.end - scene.start))
  const enter = 1 - Math.pow(1 - clamp(t * 2), 3)
  const bob = Math.sin(time * 2.1) * 3 + Math.sin(time * 3.7) * 1.2
  const camera = `translate(${Math.sin(t * 0.5) * 4} ${-progress * 8}) translate(270 430) scale(${1 + progress * 0.045}) translate(-270 -430)`
  const pose = sceneIndex === 4 ? "think" : sceneIndex === 6 ? "wave" : "point"
  return (
    <svg
      viewBox="0 0 540 960"
      width="100%"
      height="100%"
      role="img"
      aria-label={`Escena ${sceneIndex + 1}: ${scene.title}`}
      style={{
        display: "block",
        background: "#f2eddf",
        fontFamily: '"Manrope Variable", sans-serif',
      }}
    >
      <defs>
        <pattern
          id="finn-grid"
          width="36"
          height="36"
          patternUnits="userSpaceOnUse"
        >
          <path d="M36 0H0V36" fill="none" stroke={ink} strokeOpacity=".06" />
        </pattern>
        <radialGradient id="finn-light">
          <stop stopColor="#fffdf5" />
          <stop offset="1" stopColor="#e5e2ce" />
        </radialGradient>
      </defs>
      <rect width="540" height="960" fill="url(#finn-light)" />
      <g
        transform={`translate(${Math.sin(time * 0.2) * 8} ${Math.cos(time * 0.3) * 7})`}
      >
        <rect
          x="-30"
          y="-30"
          width="600"
          height="1020"
          fill="url(#finn-grid)"
        />
      </g>
      <circle
        cx={450 + Math.sin(time * 0.4) * 15}
        cy="280"
        r="200"
        fill={accent}
        opacity=".18"
      />
      <g transform={camera}>
        {titles[sceneIndex] && (
          <g
            transform={`translate(270 ${160 + (1 - enter) * 25}) scale(${0.9 + enter * 0.1})`}
            opacity={enter}
          >
            <text
              textAnchor="middle"
              fill={ink}
              fontSize={sceneIndex === 4 ? 34 : 48}
              fontWeight="900"
              letterSpacing="-2"
            >
              {titles[sceneIndex]}
            </text>
            <path d="M-65 20H65" stroke={accent} strokeWidth="8" />
          </g>
        )}
        {(sceneIndex === 0 || sceneIndex === 6) && (
          <g transform={`translate(${(1 - enter) * 100} 0)`}>
            <rect x="190" y="280" width="280" height="210" rx="18" fill={ink} />
            <rect
              x="204"
              y="294"
              width="252"
              height="177"
              rx="9"
              fill="#d7ebd0"
            />
            <g fill={ink} fontSize="21" fontWeight="800" textAnchor="middle">
              <text x="330" y="360">
                ¿Por qué el cielo
              </text>
              <text x="330" y="391">
                es azul?
              </text>
            </g>
            {Array.from({ length: 3 }, (_, i) => (
              <circle
                key={i}
                cx={305 + i * 24}
                cy="432"
                r={5 + Math.sin(t * 5 - i) * 2}
                fill="#4e9e35"
              />
            ))}
            <path d="M327 491v45m-42 0h85" stroke={ink} strokeWidth="12" />
            <path
              d="M70 590H474L452 640H90Z"
              fill={accent}
              stroke={ink}
              strokeWidth="4"
            />
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                d={`M${112 + i * 27} 601l-5 25`}
                stroke={ink}
                strokeOpacity=".4"
                strokeWidth="3"
              />
            ))}
          </g>
        )}
        {sceneIndex === 1 && (
          <g>
            {["¿Por", "qué", "el", "cie", "lo", "es", "azul", "?"].map(
              (text, i) => {
                const split = clamp((t - 1.2) / 1.5)
                const x =
                  84 +
                  (i % 3) * 150 +
                  (i === 3 ? -split * 10 : i === 4 ? split * 10 : 0)
                const y =
                  310 + Math.floor(i / 3) * 100 + Math.sin(t * 2 + i) * 6
                return (
                  <g
                    key={i}
                    transform={`translate(${x} ${y}) rotate(${Math.sin(t + i) * 5})`}
                    opacity={clamp(t * 2 - i * 0.12)}
                  >
                    <rect
                      x="-51"
                      y="-32"
                      width="110"
                      height="67"
                      rx="12"
                      fill={i % 2 ? accent : "#fffdf5"}
                      stroke={ink}
                      strokeWidth="3"
                    />
                    <text
                      textAnchor="middle"
                      y="9"
                      fontWeight="800"
                      fontSize="28"
                      fill={ink}
                    >
                      {text}
                    </text>
                  </g>
                )
              },
            )}
          </g>
        )}
        {sceneIndex === 2 && (
          <g>
            {Array.from({ length: 18 }, (_, i) => {
              const angle = i * 2.4 + t * 0.12
              const x =
                i < 3
                  ? [260, 302, 416][i] + Math.sin(t * 0.4) * 4
                  : 284 + Math.cos(angle) * (85 + i * 5)
              const y =
                i < 3
                  ? [410, 436, 324][i] + Math.cos(t * 0.4) * 4
                  : 399 + Math.sin(angle) * (65 + i * 3)
              return (
                <g key={i}>
                  <path
                    d={`M284 399L${x} ${y}`}
                    stroke={ink}
                    strokeOpacity=".12"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={i < 3 ? 13 : 5}
                    fill={i < 3 ? "#009dce" : "#4e9e35"}
                  />
                  <text
                    x={x + 12}
                    y={y - 12}
                    fill={ink}
                    fontSize={i < 3 ? 22 : 13}
                    fontWeight="700"
                  >
                    {i === 0
                      ? "perro"
                      : i === 1
                        ? "gato"
                        : i === 2
                          ? "coche"
                          : (Math.sin(i) * 2).toFixed(2)}
                  </text>
                </g>
              )
            })}
          </g>
        )}
        {sceneIndex === 3 && (
          <g>
            {Array.from({ length: 5 }, (_, layer) => (
              <g
                key={layer}
                transform={`translate(${layer * 12} ${layer * -25})`}
                opacity={1 - layer * 0.14}
              >
                <path
                  d="M90 380 270 280 450 380 270 480Z"
                  fill="#d7ebd0"
                  stroke={ink}
                  strokeWidth="2"
                />
                {Array.from({ length: 7 }, (_, i) => (
                  <g key={i}>
                    <path
                      d={`M${140 + i * 36} ${370 + (i % 2) * 20}L270 330`}
                      stroke={
                        i === Math.floor(t * 2) % 7 ? "#009dce" : "#4e9e35"
                      }
                      strokeWidth={i === Math.floor(t * 2) % 7 ? 5 : 2}
                    />
                    <circle
                      cx={140 + i * 36}
                      cy={370 + (i % 2) * 20}
                      r="7"
                      fill={accent}
                      stroke={ink}
                    />
                  </g>
                ))}
              </g>
            ))}
          </g>
        )}
        {sceneIndex === 4 && (
          <g>
            {[0.14, 0.57, 0.21, 0.08].map((value, i) => (
              <g key={i} transform={`translate(${110 + i * 100} 490)`}>
                <rect
                  x="-25"
                  y={-value * 280 * enter}
                  width="54"
                  height={value * 280 * enter}
                  rx="7"
                  fill={i === 1 ? accent : "#009dce"}
                  stroke={ink}
                  strokeWidth="3"
                />
                <text
                  x="2"
                  y="32"
                  textAnchor="middle"
                  fontSize="20"
                  fontWeight="800"
                  fill={ink}
                >
                  {Math.round(value * 100)}%
                </text>
              </g>
            ))}
            <g
              transform={`translate(${210 + Math.sin(t) * 10} ${570 + Math.sin(t * 2) * 8}) rotate(-5)`}
            >
              <rect
                width="180"
                height="55"
                rx="8"
                fill={accent}
                stroke={ink}
                strokeWidth="3"
              />
              <path
                d="M20 28h140"
                stroke={ink}
                strokeWidth="7"
                strokeDasharray="30 8"
              />
            </g>
          </g>
        )}
        {sceneIndex === 5 && (
          <g
            transform={`translate(270 400) scale(${1.2 - progress * 0.35}) translate(-270 -400)`}
          >
            {Array.from({ length: 24 }, (_, i) => {
              const x = 65 + (i % 6) * 80
              const y = 280 + Math.floor(i / 6) * 90
              return (
                <g key={i} transform={`translate(${x} ${y})`}>
                  <rect width="54" height="64" rx="7" fill={ink} />
                  <rect
                    x="10"
                    y="12"
                    width="34"
                    height="35"
                    rx="3"
                    fill={Math.floor(t * 8) % 24 === i ? accent : "#4e9e35"}
                  />
                  <path
                    d="M-6 10h6m-6 15h6m-6 15h6m54-30h6m-6 15h6m-6 15h6"
                    stroke={ink}
                    strokeWidth="3"
                  />
                </g>
              )
            })}
          </g>
        )}
        <g
          transform={`translate(${
            sceneIndex === 0 || sceneIndex === 6
              ? 87
              : 100 + Math.sin(t * 0.7) * 9
          } ${
            sceneIndex === 0 || sceneIndex === 6 ? 372 + bob : 534 + bob
          }) rotate(${Math.sin(time * 1.1) * 1.8} 70 110)`}
        >
          <Finn x={0} y={0} scale={1.18} pose={pose} time={time} />
        </g>
      </g>
      <Captions
        time={time}
        words={timings?.length ? timings : estimateWords(scenes)}
        pack={pack}
        accent={accent}
        size={subtitleSize}
      />
    </svg>
  )
}
