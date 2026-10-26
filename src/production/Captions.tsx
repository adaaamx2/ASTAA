import { useEffect, useId, useState } from "react"
import { captionAt, type WordTiming } from "./timing"

let measureContext: CanvasRenderingContext2D | null = null
function measure(text: string, size: number) {
  if (typeof document !== "undefined") {
    measureContext ??= document.createElement("canvas").getContext("2d")
    if (measureContext) {
      measureContext.font = `800 ${size}px "Manrope Variable"`
      return measureContext.measureText(text).width
    }
  }
  return text.length * size * 0.59
}

/** Frame-driven, global-time captions. No CSS timers or scene-local clocks. */
export default function Captions({
  time,
  words,
  pack,
  accent = "#ffd18a",
  width = 540,
  height = 960,
  size = 42,
}: {
  time: number
  words: WordTiming[]
  pack: string
  accent?: string
  width?: number
  height?: number
  size?: number
}) {
  const uid = useId().replace(/:/g, "")
  const [, fontsChanged] = useState(false)
  useEffect(() => {
    let live = true
    document.fonts.ready.then(() => {
      if (live) fontsChanged(true)
    })
    return () => {
      live = false
    }
  }, [])
  const cue = captionAt(words, pack, time)
  if (!cue) return null
  const { group, active } = cue
  const scaling = Math.min(width / 540, (height / 960) * 1.1)
  const available = Math.min(width * 0.84, 450 * scaling)
  const elapsed = Math.max(0, time - active.start)
  const settle = 1 - Math.exp(-elapsed * 18) * Math.cos(elapsed * 22)
  const y = height * (width > height ? 0.9 : 0.85)
  const ink = "#182232",
    paper = "#fff8e9"
  const safeAccent = accent.toLowerCase() === "#c3ef67" ? "#ffd18a" : accent
  const lineSize = Math.min(size * 0.78, 34) * scaling
  const text = group.map((word) => word.text).join(" ")
  const fontSize = Math.min(
    lineSize,
    (available / Math.max(1, measure(text, lineSize))) * lineSize,
  )
  const advances = group.map((word) => measure(word.text, fontSize))
  const space = measure(" ", fontSize)
  const totalWidth =
    advances.reduce((sum, n) => sum + n, 0) + space * (group.length - 1)
  const left = width / 2 - totalWidth / 2
  const wordX = (index: number) =>
    left + advances.slice(0, index).reduce((sum, n) => sum + n + space, 0)
  const wordProgress = Math.max(
    0,
    Math.min(1, (time - active.start) / (active.end - active.start)),
  )
  const common = {
    fontFamily: '"Manrope Variable", sans-serif',
    fontWeight: 800,
  }
  if (pack === "pop") {
    const label = active.text.toLocaleUpperCase("es")
    const popSize = Math.min(
      size * 1.1 * scaling,
      (available / Math.max(1, measure(label, size * scaling))) *
        size *
        scaling,
    )
    return (
      <g
        data-caption-pack={pack}
        data-timing-source={active.source}
        transform={`translate(${width / 2} ${y}) scale(${0.9 + settle * 0.1})`}
        {...common}
      >
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={popSize}
          stroke={ink}
          strokeWidth={6 * scaling}
          paintOrder="stroke"
          fill={paper}
        >
          {label}
        </text>
        <path
          d={`M${-20 * scaling} ${popSize * 0.72}h${40 * scaling}`}
          stroke={safeAccent}
          strokeWidth={4 * scaling}
          strokeLinecap="round"
        />
      </g>
    )
  }
  if (pack === "kinetic") {
    const label = active.text.toLocaleUpperCase("es")
    const keywordSize = Math.min(
      52 * scaling,
      (available / Math.max(1, measure(label, 52 * scaling))) * 52 * scaling,
    )
    return (
      <g
        data-caption-pack={pack}
        data-timing-source={active.source}
        {...common}
      >
        <g
          transform={`translate(${width / 2 + Math.exp(-elapsed * 18) * 20 * scaling} ${y - 15 * scaling}) rotate(${-5 * Math.exp(-elapsed * 15)}) scale(${0.92 + settle * 0.08} 1)`}
        >
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={keywordSize}
            fill={paper}
            stroke={ink}
            strokeWidth={5 * scaling}
            paintOrder="stroke"
          >
            {label}
          </text>
        </g>
        <text
          x={width / 2}
          y={y + 38 * scaling}
          textAnchor="middle"
          fontSize={17 * scaling}
          letterSpacing={0.5 * scaling}
          fill={paper}
          stroke={ink}
          strokeWidth={3 * scaling}
          paintOrder="stroke"
        >
          {text}
        </text>
        <path
          d={`M${width / 2 - 28 * scaling} ${y + 6 * scaling}h${56 * scaling * Math.min(1, elapsed * 8)}`}
          stroke={safeAccent}
          strokeWidth={3 * scaling}
        />
      </g>
    )
  }
  if (pack === "comic") {
    const boxWidth = totalWidth + 38 * scaling
    const groupAge = time - group[0].start
    const squash = 1 - Math.exp(-groupAge * 20) * 0.12 * Math.cos(groupAge * 23)
    return (
      <g
        data-caption-pack={pack}
        data-timing-source={active.source}
        transform={`translate(${width / 2} ${y}) rotate(-1.2) scale(${squash} ${2 - squash})`}
        {...common}
      >
        <rect
          x={-boxWidth / 2 + 4 * scaling}
          y={-29 * scaling + 4 * scaling}
          width={boxWidth}
          height={64 * scaling}
          rx={12 * scaling}
          fill={ink}
        />
        <rect
          x={-boxWidth / 2}
          y={-29 * scaling}
          width={boxWidth}
          height={64 * scaling}
          rx={12 * scaling}
          fill={paper}
          stroke={ink}
          strokeWidth={2 * scaling}
        />
        <path
          d={`M${-boxWidth / 2 + 27 * scaling} ${34 * scaling}l${-8 * scaling} ${12 * scaling} ${29 * scaling} ${-12 * scaling}`}
          fill={paper}
          stroke={ink}
          strokeWidth={2 * scaling}
        />
        {group.map((word, i) => (
          <text
            key={word.start}
            x={wordX(i) - width / 2}
            y={5 * scaling}
            dominantBaseline="middle"
            fontSize={fontSize}
            fill={word === active ? "#9c451d" : ink}
          >
            {word.text}
          </text>
        ))}
      </g>
    )
  }
  const boxWidth = totalWidth + 34 * scaling
  const activeIndex = group.indexOf(active)
  const progressWidth =
    wordX(activeIndex) - left + advances[activeIndex] * wordProgress
  return (
    <g
      data-caption-pack="karaoke"
      data-timing-source={active.source}
      {...common}
    >
      <rect
        x={width / 2 - boxWidth / 2}
        y={y - 29 * scaling}
        width={boxWidth}
        height={62 * scaling}
        rx={13 * scaling}
        fill={ink}
        fillOpacity=".94"
      />
      <defs>
        <clipPath id={`caption-${uid}`}>
          <rect
            x={left}
            y={y - 26 * scaling}
            width={progressWidth}
            height={54 * scaling}
          />
        </clipPath>
      </defs>
      {group.map((word, i) => (
        <text
          key={word.start}
          x={wordX(i)}
          y={y + 3 * scaling}
          dominantBaseline="middle"
          fontSize={fontSize}
          fill="#e7e8ed"
        >
          {word.text}
        </text>
      ))}
      <g clipPath={`url(#caption-${uid})`}>
        {group.map((word, i) => (
          <text
            key={word.start}
            x={wordX(i)}
            y={y + 3 * scaling}
            dominantBaseline="middle"
            fontSize={fontSize}
            fill={safeAccent}
          >
            {word.text}
          </text>
        ))}
      </g>
    </g>
  )
}
