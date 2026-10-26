import "@fontsource-variable/manrope"

export const figmaChapters = [
  {
    start: 0,
    title: "No soy solo una herramienta.",
    detail: "Un manifiesto en movimiento",
    caption: "Soy Figma. Y una idea es solo el principio.",
  },
  {
    start: 4,
    title: "De una idea a un sistema.",
    detail: "Interfaces · componentes · auto layout",
    caption: "Convierto ideas en interfaces. Y piezas en sistemas.",
  },
  {
    start: 9,
    title: "Diseñar es conectar.",
    detail: "Prototipos y colaboración",
    caption: "Conecto pantallas, personas y posibilidades.",
  },
  {
    start: 13.5,
    title: "También creo imágenes.",
    detail: "Dos ilustraciones originales por código",
    caption: "También puedo crear imágenes por código. Como esta…",
  },
  {
    start: 18,
    title: "O como esta.",
    detail: "Exploración visual · luz · profundidad",
    caption: "O esta. Dos mundos visuales, creados con formas y luz.",
  },
  {
    start: 22,
    title: "Y hacer que todo se mueva.",
    detail: "Blur Text · adaptación de React Bits",
    caption:
      "Y dar movimiento a las palabras. Con un efecto inspirado en React Bits.",
  },
  {
    start: 27,
    title: "Del diseño a lo real.",
    detail: "Componentes · código · motion",
    caption:
      "Con Figma Make, el diseño también se convierte en una experiencia funcional.",
  },
  {
    start: 32,
    title: "Tu siguiente idea.",
    detail: "El final es otro principio",
    caption: "Yo pongo las posibilidades. Tú, la siguiente gran idea.",
  },
]
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const ease = (n: number) => 1 - Math.pow(1 - clamp(n), 4)

// Frame-driven adaptation of React Bits BlurText's staggered blur/move reveal.
// Source: https://github.com/DavidHDev/react-bits (BlurText, MIT + Commons Clause; see library/REACT-BITS-LICENSE.md).
function BlurWords({
  words,
  t,
  y,
  size = 130,
  color = "#eee5ce",
}: {
  words: string
  t: number
  y: number
  size?: number
  color?: string
}) {
  return (
    <g>
      {words.split(words.includes("|") ? "|" : " ").map((word, i) => {
        const p = ease((t - i * 0.16) / 0.85)
        return (
          <text
            key={i}
            x="540"
            y={y + i * size * 1.04}
            textAnchor="middle"
            fill={color}
            fontSize={size}
            fontWeight="800"
            letterSpacing={-size * 0.065}
            opacity={p}
            style={{ filter: `blur(${(1 - p) * 16}px)` }}
            transform={`translate(0 ${(1 - p) * 100})`}
          >
            {word}
          </text>
        )
      })}
    </g>
  )
}

function Mark({
  x = 495,
  y = 430,
  scale = 1,
}: {
  x?: number
  y?: number
  scale?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path fill="#f24e1e" d="M30 0a30 30 0 0 0 0 60h30V0Z" />
      <path fill="#ff7262" d="M60 0h30a30 30 0 0 1 0 60H60Z" />
      <path fill="#a259ff" d="M30 60a30 30 0 0 0 0 60h30V60Z" />
      <circle fill="#1abcfe" cx="90" cy="90" r="30" />
      <path fill="#0acf83" d="M30 120a30 30 0 1 0 30 30v-30Z" />
    </g>
  )
}

function Artwork({ kind, t }: {
  kind: number
  t: number
}) {
  return (
    <g>
      <rect
        x="110"
        y="400"
        width="860"
        height="1050"
        rx="12"
        fill={kind === 0 ? "#b8bee0" : "#211612"}
      />
      {kind === 0 ? (
        <g>
          <circle cx="670" cy="690" r="190" fill="url(#f-sun)" />
          {Array.from({ length: 13 }, (_, i) => (
            <ellipse
              key={i}
              cx={540 + Math.sin(t * 0.3) * 30}
              cy={1110 + i * 19}
              rx={320 - i * 13}
              ry={160 - i * 7}
              fill="none"
              stroke={i % 2 ? "#f7e4d2" : "#72749c"}
              strokeWidth="16"
              transform={`rotate(-28 540 1100)`}
            />
          ))}
          <path d="M110 1300Q420 1140 970 1320V1450H110Z" fill="#323750" />
          <text x="160" y="1390" fill="#e5e4ee" fontSize="24" letterSpacing="7">
            OTHERWORLD / 001
          </text>
        </g>
      ) : (
        <g>
          {Array.from({ length: 17 }, (_, i) => (
            <ellipse
              key={i}
              cx="540"
              cy="910"
              rx={90 + i * 17}
              ry={250 + i * 12}
              fill="none"
              stroke={i % 3 ? "#bba375" : "#ead3a6"}
              strokeWidth={8}
              opacity={0.4 + i / 30}
              transform={`rotate(${i * 9 + t * 4} 540 910)`}
            />
          ))}
          <circle cx="540" cy="910" r="105" fill="url(#f-gold)" />
          <text x="160" y="1390" fill="#d7c5a5" fontSize="24" letterSpacing="7">
            GOLDEN HOUR / 002
          </text>
        </g>
      )}
    </g>
  )
}

export default function FigmaSequence({ time }: { time: number }) {
  const timeSafe = Math.max(0, Math.min(35.999, time))
  const scene = figmaChapters.reduce(
    (current, c, i) => (timeSafe >= c.start ? i : current),
    0,
  )
  const t = timeSafe - figmaChapters[scene].start
  const duration =
    (figmaChapters[scene + 1]?.start ?? 36) - figmaChapters[scene].start
  const enter = ease(t / 0.8)
  const exit = ease((t - duration + 0.45) / 0.45)
  return (
    <svg
      className="motion-sequence figma-sequence"
      viewBox="0 0 1080 1920"
      role="img"
      aria-label={`Figma en movimiento: ${figmaChapters[scene].title}`}
      style={{ fontFamily: '"Manrope Variable", sans-serif' }}
    >
      <defs>
        <radialGradient id="f-bg">
          <stop
            stopColor={scene === 1 || scene === 6 ? "#480e16" : "#151a24"}
          />
          <stop offset="1" stopColor="#060708" />
        </radialGradient>
        <radialGradient id="f-sun">
          <stop stopColor="#fff3e1" />
          <stop offset=".65" stopColor="#f0c1b5" />
          <stop offset="1" stopColor="#c28eac" />
        </radialGradient>
        <radialGradient id="f-gold" cx=".3" cy=".25">
          <stop stopColor="#fff2cf" />
          <stop offset=".5" stopColor="#b88b45" />
          <stop offset="1" stopColor="#35231a" />
        </radialGradient>
        <pattern
          id="f-grid"
          width="120"
          height="120"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M120 0H0V120"
            fill="none"
            stroke="#e6decf"
            strokeOpacity=".06"
          />
        </pattern>
        <pattern id="f-dots" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".7" fill="#fff" opacity=".16" />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill="url(#f-bg)" />
      <g
        transform={`translate(${Math.sin(time * 0.2) * 30} ${(time * 5) % 120})`}
      >
        <rect
          x="-120"
          y="-120"
          width="1320"
          height="2160"
          fill="url(#f-grid)"
        />
      </g>
      <path
        d={`M-200 ${350 + Math.sin(time * 0.5) * 100}C1450 580 -250 1180 1230 1700`}
        fill="none"
        stroke={scene % 2 ? "#c6403e" : "#8e80bf"}
        strokeWidth="2"
        opacity=".4"
        strokeDasharray="8 12"
        strokeDashoffset={-time * 60}
      />
      <text x="85" y="140" fontSize="20" fill="#a49f96" letterSpacing="5">
        FIGMA / A MOTION MANIFESTO
      </text>
      <text x="995" y="140" textAnchor="end" fontSize="20" fill="#a49f96">
        002
      </text>
      <g
        opacity={1 - exit}
        transform={`translate(540 960) scale(${0.94 + enter * 0.06 + t * 0.007 + exit * 0.35}) rotate(${(1 - enter) * -5 + exit * 7}) translate(-540 -960)`}
      >
        {scene === 0 && (
          <>
            <Mark scale={1.4} x={456} y={390} />
            <text
              x="540"
              y="780"
              textAnchor="middle"
              fill="#d5c8b4"
              fontSize="36"
            >
              No soy solo
            </text>
            <BlurWords
              words="una herramienta."
              t={t - 0.3}
              y={950}
              size={137}
            />
            <text
              x="540"
              y="1340"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontStyle="italic"
              fontSize="85"
              fill="#c9aa70"
              opacity={ease((t - 1.7) / 0.6)}
            >
              soy posibilidades.
            </text>
          </>
        )}
        {scene === 1 && (
          <>
            <BlurWords words="Todo empieza" t={t} y={500} size={118} />
            <text
              x="540"
              y="810"
              textAnchor="middle"
              fill="#d9b981"
              fontFamily="Georgia, serif"
              fontStyle="italic"
              fontSize="100"
            >
              con una idea.
            </text>
            {[0, 1, 2].map((i) => (
              <g
                key={i}
                transform={`translate(${150 + i * 35 + (1 - ease((t - 0.5 - i * 0.2) / 0.7)) * 1100} ${950 + i * 75}) rotate(${(i - 1) * -5} 380 180)`}
              >
                <rect
                  width="700"
                  height="360"
                  rx="20"
                  fill={i === 2 ? "#e8dfca" : "#18191e"}
                  stroke="#6a5857"
                />
                <circle cx="40" cy="35" r="6" fill="#e07e66" />
                <path d="M65 35H200" stroke="#70665c" strokeWidth="7" />
                <rect
                  x="40"
                  y="80"
                  width="250"
                  height="230"
                  rx="10"
                  fill={i === 2 ? "#b7a6c8" : "#34303d"}
                />
                <text
                  x="330"
                  y="155"
                  fill={i === 2 ? "#27232a" : "#ede4ce"}
                  fontSize="42"
                  fontWeight="700"
                >
                  Make it real.
                </text>
                <path
                  d="M330 190h280m-280 30h200"
                  stroke="#8d8173"
                  strokeWidth="9"
                />
                <rect
                  x="330"
                  y="260"
                  width="160"
                  height="40"
                  rx="20"
                  fill="#302832"
                />
              </g>
            ))}
          </>
        )}
        {scene === 2 && (
          <>
            <BlurWords words="Diseñar es conectar." t={t} y={490} size={135} />
            <path
              d="M230 1100C230 850 850 1400 850 1080"
              fill="none"
              stroke="#a995e7"
              strokeWidth="4"
              strokeDasharray="1000"
              strokeDashoffset={1000 * (1 - ease((t - 0.5) / 1.3))}
            />
            {[0, 1, 2].map((i) => (
              <g
                key={i}
                transform={`translate(${170 + i * 270} ${1000 + Math.sin(t * 2 + i) * 35}) rotate(${(i - 1) * 9})`}
                opacity={ease((t - i * 0.25) / 0.5)}
              >
                <rect
                  width="220"
                  height="330"
                  rx="20"
                  fill="#17191d"
                  stroke="#b4a6cc"
                />
                <rect
                  x="20"
                  y="25"
                  width="180"
                  height="160"
                  rx="10"
                  fill={["#8d89b1", "#a26f5b", "#8d9d87"][i]}
                />
                <path
                  d="M20 220h150m-150 30h110"
                  stroke="#bcb4a7"
                  strokeWidth="7"
                />
                <circle cx="180" cy="290" r="12" fill="#bba1f0" />
              </g>
            ))}
            <g
              transform={`translate(${650 + Math.sin(t) * 110} ${1420 + Math.cos(t) * 50})`}
            >
              <path d="m0 0 12 60 15-22 25-5Z" fill="#a68de0" />
              <rect
                x="40"
                y="45"
                width="140"
                height="45"
                rx="22"
                fill="#a68de0"
              />
              <text
                x="110"
                y="75"
                textAnchor="middle"
                fill="#17121d"
                fontSize="23"
              >
                Tú, aquí.
              </text>
            </g>
          </>
        )}
        {(scene === 3 || scene === 4) && (
          <>
            <g
              transform={`translate(540 930) rotate(${
                scene === 3 ? -5 + t : 5 - t
              }) scale(${0.92 + ease(t / 1) * 0.08}) translate(-540 -930)`}
            >
              <Artwork kind={scene - 3} t={t} />
            </g>
            <text
              x="540"
              y="320"
              textAnchor="middle"
              fill="#eee5ce"
              fontSize="64"
              fontWeight="700"
            >
              {scene === 3 ? "También creo imágenes." : "O como esta."}
            </text>
            <text
              x="540"
              y="1570"
              textAnchor="middle"
              fill="#c1b49d"
              fontSize="23"
              letterSpacing="4"
            >
              ILUSTRACIÓN ORIGINAL · CREADA CON CÓDIGO
            </text>
          </>
        )}
        {scene === 5 && (
          <>
            <text
              x="540"
              y="430"
              textAnchor="middle"
              fill="#a795cd"
              fontSize="24"
              letterSpacing="7"
            >
              REACT BITS / BLUR TEXT
            </text>
            <BlurWords
              words={t < 2.4 ? "Las palabras también" : "saben moverse."}
              t={t < 2.4 ? t : t - 2.4}
              y={770}
              size={145}
            />
            <g transform={`translate(540 1330) rotate(${t * 35})`}>
              {Array.from({ length: 12 }, (_, i) => (
                <path
                  key={i}
                  d="M0 -90V-180"
                  transform={`rotate(${i * 30})`}
                  stroke="#c9b28a"
                  strokeWidth="19"
                />
              ))}
            </g>
          </>
        )}
        {scene === 6 && (
          <>
            <BlurWords words="Del diseño|a lo|real." t={t} y={450} size={140} />
            <g
              transform={`translate(${100 + (1 - ease(t / 0.8)) * -900} 1050) rotate(-4)`}
            >
              <rect
                width="880"
                height="390"
                rx="25"
                fill="#111316"
                stroke="#65585c"
              />
              <text x="50" y="65" fontSize="23" fill="#948b84">
                idea.tsx
              </text>
              {[
                "const idea = tuImaginación;",
                "<Experiencia",
                "  diseño={sinLímites}",
                '  estado="en movimiento"',
                "/>",
              ].map((line, i) => (
                <text
                  key={i}
                  x="50"
                  y={125 + i * 47}
                  fontSize="31"
                  fill={i === 0 ? "#b4a0dc" : "#d9c7a7"}
                  opacity={ease((t - 0.6 - i * 0.2) / 0.4)}
                >
                  {line}
                </text>
              ))}
            </g>
            <text
              x="540"
              y="1590"
              textAnchor="middle"
              fill="#c0ae93"
              fontSize="27"
              letterSpacing="5"
            >
              FIGMA MAKE / IDEA → EXPERIENCIA
            </text>
          </>
        )}
        {scene === 7 && (
          <>
            <Mark x={480} y={390} />
            <text
              x="540"
              y="760"
              textAnchor="middle"
              fill="#b5a997"
              fontSize="36"
            >
              Yo pongo las posibilidades.
            </text>
            <BlurWords words="Tú, la idea." t={t - 0.25} y={960} size={165} />
            <text
              x="540"
              y="1400"
              textAnchor="middle"
              fill="#c8ac78"
              fontFamily="Georgia, serif"
              fontSize="80"
              fontStyle="italic"
              opacity={ease((t - 1.6) / 0.8)}
            >
              ¿Qué creamos ahora?
            </text>
          </>
        )}
      </g>
      <rect
        width="1080"
        height="1920"
        fill="url(#f-dots)"
        pointerEvents="none"
      />
      <path d="M80 1685H1000" stroke="#e2d6bc" opacity=".15" />
      <text x="540" y="1750" textAnchor="middle" fill="#c7bcaa" fontSize="25">
        {figmaChapters[scene].caption.length > 77
          ? figmaChapters[scene].caption.split(". ")[0] + "."
          : figmaChapters[scene].caption}
      </text>
      <text x="85" y="1830" fill="#817d76" fontSize="18" letterSpacing="4">
        DESIGN WITHOUT LIMITS
      </text>
      <text x="995" y="1830" textAnchor="end" fill="#817d76" fontSize="18">
        {String(scene + 1).padStart(2, "0")} / 08
      </text>
      <rect
        x="80"
        y="1880"
        width={(920 * timeSafe) / 36}
        height="2"
        fill="#cdb78d"
      />
    </svg>
  )
}
