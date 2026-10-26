import { useId, type ReactNode } from "react"
import { getRemotionEnvironment, staticFile } from "remotion"
import { publicAssetUrl } from "../media/files"
import { brandSpec, cue, ease, settle } from "./brand-spec"
import {
  chapters,
  cubicPoint,
  living,
  sceneBlend,
  shotCamera,
} from "./brand-motion-v4"

const C = {
  paper: "#f4eee8",
  ink: "#19151c",
  wine: "#952d46",
  muted: "#705967",
  pink: "#ec9baf",
}
const SANS = '"Inter Tight Variable", sans-serif'
const BODY = '"Inter Variable", sans-serif'
const SERIF = '"Instrument Serif", serif'
interface FrameProps {
  time: number
  uid: string
}
export const brandAssets = ["bust", "king", "queen"] as const
type Asset = typeof brandAssets[number]
const url = (path: string) =>
  getRemotionEnvironment().isRendering
    ? staticFile(`references/${path}`)
    : publicAssetUrl(`/references/${path}`)
const imageUrl = (name: Asset) => url(`editorial-generated-v2/${name}.png`)
export const brandAssetUrls = () => [
  ...brandAssets.map(imageUrl),
  url("brand-v4/grain.png"),
]

interface TypeProps {
  text: string
  time: number
  at: number
  x?: number
  y: number
  size: number
  serif?: boolean
  fill?: string
  weight?: number
  anchor?: "start" | "middle" | "end"
  width?: number
  stagger?: number
}
let measure: CanvasRenderingContext2D | null = null
function advance(
  text: string,
  size: number,
  weight: number,
  serif: boolean,
  tracking: number,
) {
  if (typeof document === "undefined") return text.length * size * 0.5
  measure ??= document.createElement("canvas").getContext("2d")
  if (!measure) return text.length * size * 0.5
  measure.font = `${serif ? "italic" : "normal"} ${weight} ${size}px ${
    serif ? SERIF : SANS
  }`
  return (
    measure.measureText(text).width + Math.max(0, text.length - 1) * tracking
  )
}
function Type({
  text,
  time,
  at,
  x = 540,
  y,
  size,
  serif = false,
  fill = C.ink,
  weight = serif ? 400 : 850,
  anchor = "middle",
  width = 920,
  stagger = 0.055,
}: TypeProps) {
  const track = -size * (serif ? 0.026 : 0.045)
  const ratio = Math.min(
    1,
    width / Math.max(1, advance(text, size, weight, serif, track)),
  )
  const fontSize = size * ratio,
    spacing = track * ratio
  const words = text.split(" ")
  const widths = words.map((word) =>
    advance(word, fontSize, weight, serif, spacing),
  )
  const gap = advance(" ", fontSize, weight, serif, 0) + spacing
  const total = widths.reduce((sum, n) => sum + n, 0) + gap * (words.length - 1)
  let left =
    anchor === "start" ? x : anchor === "end" ? x - total : x - total / 2
  return (
    <g
      data-brand-title={text}
      fontFamily={serif ? SERIF : SANS}
      fontStyle={serif ? "italic" : "normal"}
      fontWeight={weight}
      fontSize={fontSize}
      letterSpacing={spacing}
      fill={fill}
    >
      {words.map((word, index) => {
        const p = cue(time, at + index * stagger, 0.43)
        const start = left
        left += widths[index] + gap
        return (
          <text
            key={`${word}-${index}`}
            x={start}
            y={y + (1 - p) * 34}
            opacity={p}
            transform={`rotate(${(1 - p) * -2} ${start} ${y})`}
            style={{ filter: p < 0.999 ? `blur(${(1 - p) * 5}px)` : undefined }}
          >
            {word}
          </text>
        )
      })}
    </g>
  )
}
function Label({
  children,
  x = 96,
  y,
  fill = C.muted,
  anchor = "start",
  size = 40,
}: {
  children: ReactNode
  x?: number
  y: number
  fill?: string
  anchor?: "start" | "middle" | "end"
  size?: number
}) {
  return (
    <text
      data-readable-support={size >= 32 ? "true" : undefined}
      x={x}
      y={y}
      fill={fill}
      textAnchor={anchor}
      fontFamily={BODY}
      fontSize={size}
      fontWeight={500}
      letterSpacing={3.1}
    >
      {children}
    </text>
  )
}
function Ambient({ time, uid }: FrameProps) {
  const night =
    cue(time, 5.69, 0.4) * (1 - cue(time, 7.52, 0.4)) +
    cue(time, 11.73, 0.4) * (1 - cue(time, 13.47, 0.4))
  return (
    <g data-living-layer="ambient-light">
      <defs>
        <linearGradient id={`${uid}-paper`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fffaf1" />
          <stop offset=".53" stopColor={C.paper} />
          <stop offset="1" stopColor="#e6d7d4" />
        </linearGradient>
        <radialGradient
          id={`${uid}-rose`}
          cx={0.2 + Math.sin(time * 0.4) * 0.16}
          cy={0.47 + Math.cos(time * 0.3) * 0.17}
          r=".72"
        >
          <stop stopColor="#b34e68" stopOpacity=".34" />
          <stop offset=".45" stopColor="#e9acb5" stopOpacity=".14" />
          <stop offset="1" stopColor="#e9acb5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-night`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#1c1420" />
          <stop offset=".6" stopColor="#111016" />
          <stop offset="1" stopColor="#28121e" />
        </linearGradient>
        <radialGradient
          id={`${uid}-bloom`}
          cx={0.15 + Math.sin(time * 0.55) * 0.28}
          cy={0.5 + Math.cos(time * 0.4) * 0.16}
          r=".8"
        >
          <stop stopColor="#b03a5a" stopOpacity=".7" />
          <stop offset=".46" stopColor="#70203f" stopOpacity=".28" />
          <stop offset="1" stopColor="#22101d" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}-red`}
          x1="0"
          y1="0"
          x2="1"
          y2=".7"
          gradientTransform={`rotate(${Math.sin(time * 0.7) * 12} .5 .5)`}
        >
          <stop stopColor="#6f1f3c" />
          <stop offset=".5" stopColor="#bf5269" />
          <stop offset="1" stopColor="#933044" />
        </linearGradient>
        <linearGradient id={`${uid}-luminous`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff0e6" />
          <stop offset=".5" stopColor="#f0a2b8" />
          <stop offset="1" stopColor="#c75175" />
        </linearGradient>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d5c5c5" />
          <stop offset=".15" stopColor="#3c3440" />
          <stop offset=".5" stopColor="#12151c" />
          <stop offset=".82" stopColor="#82727c" />
          <stop offset="1" stopColor="#19141d" />
        </linearGradient>
        <pattern
          id={`${uid}-grain`}
          width={192}
          height={192}
          patternUnits="userSpaceOnUse"
        >
          <image href={url("brand-v4/grain.png")} width={192} height={192} />
        </pattern>
      </defs>
      <rect width={1080} height={1920} fill={`url(#${uid}-paper)`} />
      <rect width={1080} height={1920} fill={`url(#${uid}-rose)`} />
      <g opacity={night}>
        <rect width={1080} height={1920} fill={`url(#${uid}-night)`} />
        <rect width={1080} height={1920} fill={`url(#${uid}-bloom)`} />
      </g>
      <rect
        width={1080}
        height={1920}
        fill={`url(#${uid}-grain)`}
        opacity=".12"
        style={{ mixBlendMode: "soft-light" }}
      />
    </g>
  )
}
function LitObject({
  name,
  x,
  y,
  size,
  height = size,
  angle = 0,
  scale = 1,
  light,
  opacity = 1,
}: {
  name: Asset
  x: number
  y: number
  size: number
  height?: number
  angle?: number
  scale?: number
  light: number
  opacity?: number
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  return (
    <g
      data-living-layer={`object-${name}`}
      opacity={opacity}
      transform={`translate(${x + size / 2} ${y + height / 2}) rotate(${angle}) scale(${scale}) translate(${-size / 2} ${-height / 2})`}
    >
      <defs>
        <mask
          id={`${id}-alpha`}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={size}
          height={height}
          style={{ maskType: "alpha" }}
        >
          <image
            href={imageUrl(name)}
            width={size}
            height={height}
            preserveAspectRatio="xMidYMid meet"
          />
        </mask>
        <linearGradient
          id={`${id}-light`}
          gradientUnits="userSpaceOnUse"
          x1={light}
          y1={0}
          x2={light + 650}
          y2={height * 0.2}
        >
          <stop stopColor="#d9b2ba" stopOpacity="0" />
          <stop offset=".45" stopColor="#ffe9df" stopOpacity=".68" />
          <stop offset=".6" stopColor="#fff6ee" stopOpacity=".16" />
          <stop offset="1" stopColor="#d9b2ba" stopOpacity="0" />
        </linearGradient>
      </defs>
      <image
        data-generated-brand-asset={name}
        href={imageUrl(name)}
        width={size}
        height={height}
        preserveAspectRatio="xMidYMid meet"
      />
      <rect
        data-living-layer={`light-${name}`}
        x={0}
        y={0}
        width={size}
        height={height}
        mask={`url(#${id}-alpha)`}
        fill={`url(#${id}-light)`}
        opacity=".3"
        style={{ mixBlendMode: "screen" }}
      />
    </g>
  )
}
function Shadow({
  x,
  y,
  rx,
  scale = 1,
}: Record<"x" | "y" | "rx", number> & { scale?: number }) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={rx * scale}
      ry={17 * scale}
      fill="#35202e"
      opacity=".14"
      style={{ filter: "blur(15px)" }}
    />
  )
}
function Ring({
  time,
  x,
  y,
  radius = 300,
  dark = false,
  phase = 0,
}: {
  time: number
  x: number
  y: number
  radius?: number
  dark?: boolean
  phase?: number
}) {
  return (
    <g
      data-living-layer="orbital-line"
      transform={`translate(${x} ${y}) rotate(${time * 12 + phase})`}
      fill="none"
      stroke={dark ? "#e398ae" : "#8b4e61"}
      opacity={dark ? 0.25 : 0.24}
    >
      <ellipse rx={radius} ry={radius * 0.37} strokeWidth={1.4} />
      <ellipse
        rx={radius}
        ry={radius * 0.37}
        transform="rotate(63)"
        strokeWidth=".7"
        strokeDasharray="4 12"
      />
      <circle
        cx={radius}
        r={4}
        fill={dark ? "#e6a8b9" : C.wine}
        stroke="none"
      />
    </g>
  )
}
function Underline({
  time,
  start,
  x,
  y,
  width,
  dark = false,
  uid,
}: {
  time: number
  start: number
  x: number
  y: number
  width: number
  dark?: boolean
  uid: string
}) {
  const progress = cue(time, start, 0.7)
  return (
    <path
      data-living-layer="drawn-underline"
      d={`M${x} ${y}Q${x + width * 0.5} ${y + 20 + Math.sin(time * 1.2) * 5} ${x + width} ${y - 4}`}
      fill="none"
      stroke={dark ? `url(#${uid}-luminous)` : `url(#${uid}-red)`}
      strokeWidth={4}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
    />
  )
}
function Chapter({
  time,
  index,
  children,
}: {
  time: number
  index: number
  children: ReactNode
}) {
  const chapter = chapters[index]
  const opacity = sceneBlend(time, chapter.start, chapter.end)
  const camera = shotCamera(time, index)
  return opacity > 0.001 ? (
    <g data-brand-scene={index + 1} opacity={opacity}>
      <g
        data-living-layer="shot-camera"
        transform={`translate(${camera.x} ${camera.y}) translate(540 960) scale(${camera.scale}) translate(-540 -960)`}
      >
        {children}
      </g>
    </g>
  ) : null
}
function Badge({
  text,
  x,
  y,
  width,
  dark = false,
}: {
  text: string
  x: number
  y: number
  width: number
  dark?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={72}
        rx={36}
        fill={dark ? "#f8e8e2" : "#241c27"}
      />
      <text
        x={width / 2}
        y={48}
        textAnchor="middle"
        fontFamily={BODY}
        fontSize={36}
        data-readable-support="true"
        fontWeight={500}
        letterSpacing={2}
        fill={dark ? "#4a2539" : "#f4e5df"}
      >
        {text}
      </text>
    </g>
  )
}
function Hero({ time, uid }: FrameProps) {
  const m = living(time, 0)
  return (
    <Chapter time={time} index={0}>
      <Ring time={time} x={630} y={1260} radius={500} />
      <g opacity=".065">
        <text
          x={540}
          y={1510}
          textAnchor="middle"
          fontFamily={SANS}
          fontSize={380}
          fontWeight={900}
          letterSpacing={-22}
          fill="none"
          stroke={C.wine}
          strokeWidth={2}
        >
          BRAND
        </text>
      </g>
      <Label x={540} y={335} anchor="middle" size={40}>
        THE BRANDING SECRET
      </Label>
      <Type text="no one" y={560} size={244} time={time} at={0.04} />
      <Type
        text="tells you."
        y={772}
        size={276}
        serif
        fill={`url(#${uid}-red)`}
        time={time}
        at={0.18}
      />
      <g
        data-living-layer="hero-camera"
        transform={`translate(540 1240) scale(${m.push}) translate(-540 -1240)`}
      >
        <LitObject
          name="bust"
          x={60 + m.x}
          y={790 - 42 * cue(time, 0, 2.35)}
          size={1300}
          height={1340}
          angle={-3 + cue(time, 0, 2.35) * 3}
          light={m.light}
        />
      </g>
      <Underline
        time={time}
        start={0.48}
        x={280}
        y={858}
        width={520}
        uid={uid}
      />
    </Chapter>
  )
}
function Chess({ time, uid }: FrameProps) {
  const m = living(time, 2.35),
    enter = settle(m.local, 8)
  const p = cue(time, 2.55, 2.8),
    point = cubicPoint(p)
  return (
    <Chapter time={time} index={1}>
      <Label x={540} y={300} anchor="middle">
        A BRAND WITHOUT A
      </Label>
      <Type
        text="content strategy"
        y={414}
        size={112}
        serif
        time={time}
        at={2.48}
        fill={`url(#${uid}-red)`}
      />
      <Type text="just posting." y={615} size={150} time={time} at={3.09} />
      <Type
        text="and hoping."
        y={770}
        size={164}
        serif
        time={time}
        at={3.35}
        fill={`url(#${uid}-red)`}
      />
      <path
        d="M180 1510C350 1490 700 1200 905 1250"
        fill="none"
        stroke="#a66b7f"
        strokeWidth={1.5}
        opacity=".38"
        strokeDasharray="3 12"
      />
      <circle
        data-living-layer="strategy-trace"
        cx={point.x}
        cy={point.y}
        r={7}
        fill={C.wine}
      />
      <Shadow x={486} y={1517} rx={250} scale={0.9 + enter * 0.1} />
      <LitObject
        name="king"
        x={140 + (1 - enter) * -330 + m.x * 0.4}
        y={810 + (1 - enter) * 170 - m.y * 0.3}
        size={720}
        height={800}
        scale={1 + cue(time, 2.35, 3.5) * 0.075}
        angle={-3 + Math.sin(m.local * 0.9) * 1.2}
        light={m.light + 280}
      />
      <LitObject
        name="queen"
        x={440 + (1 - enter) * 380}
        y={1010 + m.y * 0.4}
        size={650}
        height={720}
        scale={1 + cue(time, 2.65, 3.2) * 0.11}
        angle={4 + cue(time, 2.8, 1.8) * 33 + Math.sin(m.local * 0.65) * 1.4}
        light={m.light - 250}
      />
      <g
        data-living-layer="strategy-tag"
        transform={`translate(0 ${Math.sin(m.local * 0.8) * 5})`}
        opacity={cue(time, 3.95, 0.4)}
      >
        <Badge text="HOPE ≠ STRATEGY" x={306} y={1460} width={468} />
      </g>
    </Chapter>
  )
}
function Truth({ time, uid }: FrameProps) {
  const m = living(time, 5.85)
  const p = cue(time, 6.03, 1.35),
    point = cubicPoint(p)
  return (
    <Chapter time={time} index={2}>
      <Ring time={time} x={540} y={1020} radius={510} dark phase={30} />
      <Label x={540} y={590} anchor="middle" fill="#c6a5b0">
        AND HOPE IS
      </Label>
      <Type
        text="not a"
        y={837}
        size={174}
        fill="#faebe5"
        time={time}
        at={5.98}
      />
      <Type
        text="growth plan."
        y={1100}
        size={224}
        serif
        fill={`url(#${uid}-luminous)`}
        time={time}
        at={6.13}
      />
      <Underline
        time={time}
        start={6.38}
        x={180}
        y={1164}
        width={720}
        uid={uid}
        dark
      />
      <g opacity=".3" transform={`translate(0 ${m.y * 0.3})`}>
        <path
          data-living-layer="growth-path"
          d="M180 1510C350 1490 700 1200 905 1250"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
          fill="none"
          stroke="#e1a1b6"
          strokeWidth={2}
        />
        <circle cx={point.x} cy={point.y} r={7} fill="#f1b8c9" />
      </g>
    </Chapter>
  )
}
function CameraRig({ time, uid }: FrameProps) {
  const m = living(time, 7.65),
    enter = settle(m.local, 8)
  const focus = Math.sin(m.local * 1.25) * 18
  const frame = Math.max(0, Math.floor(m.local * 60))
  return (
    <g
      data-living-layer="camera-rig"
      transform={`translate(${(1 - enter) * 280 - cue(time, 8.6, 2.9) * 25} ${30 - enter * 30 + m.y * 0.7}) translate(580 1270) rotate(${-8 + cue(time, 7.65, 4.25) * 9}) skewY(${Math.sin(m.local * 0.6) * 1.4}) scale(${1.035 - enter * 0.035 + m.local * 0.022}) translate(-580 -1270)`}
    >
      <defs>
        <clipPath id={`${uid}-screen`}>
          <rect x={224} y={971} width={714} height={378} rx={23} />
        </clipPath>
        <linearGradient id={`${uid}-warm`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e6bea6" />
          <stop offset=".5" stopColor="#bd8274" />
          <stop offset="1" stopColor="#6e4e58" />
        </linearGradient>
      </defs>
      <path
        d="M595 1338V1400Q740 1470 645 1515L603 1540V1880"
        stroke="#11151c"
        strokeWidth={74}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M595 1340V1400Q740 1470 645 1515"
        stroke="#5d5262"
        strokeWidth={6}
        fill="none"
        opacity=".8"
      />
      <rect
        x={569}
        y={1535}
        width={72}
        height={430}
        rx={30}
        fill={`url(#${uid}-metal)`}
      />
      <ellipse
        cx={605}
        cy={1553}
        rx={42}
        ry={22}
        fill="#26202c"
        stroke="#857684"
        strokeWidth={2}
      />
      <rect
        x={194}
        y={941}
        width={774}
        height={438}
        rx={45}
        fill="#000"
        opacity=".16"
        transform="translate(8 15)"
        style={{ filter: "blur(14px)" }}
      />
      <rect
        x={194}
        y={941}
        width={774}
        height={438}
        rx={45}
        fill={`url(#${uid}-metal)`}
        stroke="#81717c"
        strokeWidth={2}
      />
      <rect x={207} y={955} width={748} height={410} rx={33} fill="#101119" />
      <g clipPath={`url(#${uid}-screen)`}>
        <rect
          x={224}
          y={971}
          width={714}
          height={378}
          fill={`url(#${uid}-warm)`}
        />
        <g
          data-living-layer="viewfinder-dolly"
          transform={`translate(580 1160) scale(${1 + cue(time, 8.4, 2.8) * 0.42}) translate(${-580 - cue(time, 8.4, 2.8) * 24} -1160)`}
        >
          <path d="M224 1240Q440 1160 938 1250V1350H224Z" fill="#c4a295" />
          <LitObject
            name="bust"
            x={385 + Math.sin(m.local * 0.8) * 22}
            y={990}
            size={420}
            height={490}
            angle={-2}
            light={m.light}
          />
        </g>
        {[462, 700].map((x) => (
          <path key={x} d={`M${x} 971V1349`} stroke="#fff" opacity=".16" />
        ))}
        {[1097, 1223].map((y) => (
          <path key={y} d={`M224 ${y}H938`} stroke="#fff" opacity=".16" />
        ))}
        <g
          data-living-layer="camera-focus"
          transform={`translate(${focus} ${focus * 0.3})`}
          fill="none"
          stroke="#f8eee4"
          strokeWidth={2}
        >
          <path d="M500 1070v-18h22M667 1070v-18h-22M500 1220v18h22M667 1220v18h-22" />
        </g>
        <path
          data-living-layer="camera-scan"
          d={`M224 ${1135 + Math.sin(m.local * 1.4) * 75}H938`}
          stroke="#f1d7c7"
          opacity=".18"
        />
        <circle
          cx={252}
          cy={1001}
          r={5}
          fill="#ec637a"
          opacity={0.5 + Math.sin(m.local * 5) ** 2 * 0.5}
        />
        <text x={269} y={1007} fontFamily={BODY} fontSize={14} fill="#fff2e9">
          REC · {String(Math.floor(frame / 60)).padStart(2, "0")}:
          {String(frame % 60).padStart(2, "0")}
        </text>
        <text
          x={907}
          y={1007}
          textAnchor="end"
          fontFamily={BODY}
          fontSize={13}
          fill="#fff2e9"
        >
          4K / 60
        </text>
        <text
          x={252}
          y={1326}
          fontFamily={BODY}
          fontSize={13}
          fill="#fff2e9"
          letterSpacing={2}
        >
          CAPTURING ATTENTION
        </text>
        <circle
          cx={906}
          cy={1154}
          r={19}
          fill="none"
          stroke="#fff1ea"
          strokeWidth={2}
        />
        <circle cx={906} cy={1154} r={13} fill="#e65a76" />
      </g>
    </g>
  )
}
function Purpose({ time, uid }: FrameProps) {
  const trust = cue(time, 9.4, 0.6)
  return (
    <Chapter time={time} index={3}>
      <Label x={540} y={298} anchor="middle">
        EVERY PIECE OF CONTENT SHOULD
      </Label>
      <g opacity={1 - trust} transform={`translate(0 ${-trust * 58})`}>
        <Type
          text="attract"
          y={554}
          size={231}
          time={time}
          at={7.77}
          fill={`url(#${uid}-red)`}
        />
        <Type text="new eyes." y={755} size={235} serif time={time} at={8.03} />
      </g>
      <g
        data-living-layer="trust-handoff"
        opacity={trust}
        transform={`translate(0 ${(1 - trust) * 58})`}
      >
        <Type
          text="build"
          y={554}
          size={231}
          time={time}
          at={9.42}
          fill={`url(#${uid}-red)`}
        />
        <Type text="trust." y={755} size={235} serif time={time} at={9.55} />
      </g>
      <Underline
        time={time}
        start={8.4}
        x={302}
        y={840}
        width={478}
        uid={uid}
      />
      <CameraRig time={time} uid={uid} />
      {[
        { label: "BUILD TRUST", at: 9.3 },
        { label: "CONVERT", at: 10.25 },
      ].map((row, i) => {
        const p = cue(time, row.at, 0.55)
        return (
          <g
            key={row.label}
            opacity={p}
            transform={`translate(${96 + (1 - p) * -35} ${1480 + i * 60})`}
          >
            <circle
              cx={11}
              cy={-8}
              r={10}
              fill="none"
              stroke="#b48c9a"
              strokeWidth={1}
            />
            <path
              d="M6-8l4 4 7-8"
              fill="none"
              stroke={C.wine}
              strokeWidth={1.8}
              strokeDasharray={22}
              strokeDashoffset={22 * (1 - p)}
            />
            <text
              x={39}
              fontFamily={BODY}
              fontWeight={600}
              fontSize={36}
              data-readable-support="true"
              letterSpacing={2}
              fill={C.wine}
            >
              {row.label}
            </text>
          </g>
        )
      })}
    </Chapter>
  )
}
function Outcome({ time, uid }: FrameProps) {
  const m = living(time, 11.9)
  return (
    <Chapter time={time} index={4}>
      <Ring time={time} x={540} y={920} radius={400} dark phase={-30} />
      <Label x={540} y={560} anchor="middle" fill="#d6a5b7">
        OR CONVERT
      </Label>
      <Type
        text="attention"
        y={815}
        size={163}
        fill="#f5e8e2"
        time={time}
        at={11.98}
      />
      <path
        data-living-layer="conversion-arrow"
        d={`M540 878C${540 + Math.sin(m.local) * 40} 930 540 948 540 1005m-12-13 12 13 12-13`}
        fill="none"
        stroke={`url(#${uid}-luminous)`}
        strokeWidth={2}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - cue(time, 12.08, 0.65)}
      />
      <Type
        text="into action."
        y={1240}
        size={240}
        serif
        fill={`url(#${uid}-luminous)`}
        time={time}
        at={12.24}
      />
      <Underline
        time={time}
        start={12.55}
        x={218}
        y={1290}
        width={644}
        uid={uid}
        dark
      />
    </Chapter>
  )
}
function BrowserDesk({ time, uid }: FrameProps) {
  const m = living(time, 13.6),
    enter = settle(m.local, 9)
  const playhead = 184 + cue(time, 13.72, 2.3) * 700
  return (
    <g
      data-living-layer="editorial-desk"
      transform={`translate(${(1 - enter) * -100 + cue(time, 14, 2.3) * 18} ${(1 - enter) * 140 - m.local * 12}) translate(540 1200) rotate(${-7 + enter * 2.5 + cue(time, 13.9, 2.4) * 5}) skewY(${-1.7 + cue(time, 13.6, 2.7) * 3.4}) scale(${0.93 + enter * 0.07 + m.local * 0.028}) translate(-540 -1200)`}
    >
      <defs>
        <clipPath id={`${uid}-board-art`}>
          <rect x={119} y={963} width={536} height={333} rx={6} />
        </clipPath>
      </defs>
      <rect
        x={86}
        y={874}
        width={910}
        height={672}
        rx={16}
        fill="#0d0c12"
        opacity=".19"
        transform="translate(8 16)"
        style={{ filter: "blur(13px)" }}
      />
      <rect
        x={86}
        y={874}
        width={910}
        height={672}
        rx={16}
        fill="#29232f"
        stroke="#746170"
        strokeWidth={2}
      />
      <rect
        x={88}
        y={876}
        width={906}
        height={47}
        rx={14}
        fill={`url(#${uid}-metal)`}
      />
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={111 + i * 14}
          cy={899}
          r={4}
          fill={["#c47283", "#b9a077", "#8a9b86"][i]}
        />
      ))}
      <text
        x={540}
        y={906}
        textAnchor="middle"
        fontFamily={BODY}
        fontSize={15}
        fill="#d3bcc8"
        letterSpacing={3}
      >
        CONTENT / SYSTEM
      </text>
      <Label x={120} y={948} size={13} fill="#a997a6">
        COMPOSITION
      </Label>
      <g clipPath={`url(#${uid}-board-art)`}>
        <rect x={119} y={963} width={536} height={333} fill="#e6d3c8" />
        <path
          d={`M100 ${1240 + m.x}Q360 1040 690 1250V1320H100Z`}
          fill="#cfacb0"
        />
        <LitObject
          name="bust"
          x={351 + m.x * 2}
          y={970}
          size={300}
          height={410}
          light={m.light}
        />
        <text
          x={146}
          y={1090}
          fontFamily={SANS}
          fontWeight={850}
          fontSize={55}
          letterSpacing={-2}
          fill="#2b2030"
        >
          MAKE IT
        </text>
        <text
          x={146}
          y={1162}
          fontFamily={SERIF}
          fontStyle="italic"
          fontSize={74}
          fill="#983d56"
        >
          matter.
        </text>
        <path
          d={`M145 ${1193 + Math.sin(m.local) * 3}h180`}
          stroke="#a84963"
          strokeWidth={2}
        />
      </g>
      {["ATTRACTION", "TRUST", "ACTION"].map((word, i) => {
        const progress =
          0.2 +
          (Math.sin(m.local * 1.8 + i * 2.1) * 0.5 + 0.5) * [0.58, 0.3, 0.42][i]
        return (
          <g key={word} transform={`translate(693 ${1018 + i * 104})`}>
            <text
              fontFamily={BODY}
              fontSize={14}
              fill="#d5bccb"
              letterSpacing={1.5}
            >
              {word}
            </text>
            <rect y={20} width={257} height={5} fill="#4e3b4c" rx={2} />
            <rect
              data-living-layer={`metric-${word}`}
              y={20}
              width={257 * progress}
              height={5}
              fill="#d885a2"
              rx={2}
            />
            <text
              x={257}
              y={-2}
              textAnchor="end"
              fontFamily={BODY}
              fontSize={12}
              fill="#947d92"
            >
              {String(Math.round(progress * 100)).padStart(2, "0")}
            </text>
          </g>
        )
      })}
      <path d="M119 1330H964" stroke="#5a4559" />
      {Array.from({ length: 4 }, (_, row) => (
        <g key={row}>
          <text
            x={124}
            y={1373 + row * 39}
            fontFamily={BODY}
            fontSize={11}
            fill="#b69bb0"
          >
            {["01  TYPE", "02  SCULPTURE", "03  INTENTION", "04  AUDIO"][row]}
          </text>
          {Array.from({ length: 5 }, (_, col) => (
            <rect
              key={col}
              x={
                268 +
                col * 135 +
                Math.sin(m.local * 1.2 + col) * (row === 2 ? 9 : 3)
              }
              y={1357 + row * 39}
              width={80 + ((row + col) % 3) * 24}
              height={19}
              rx={2}
              fill={["#b16481", "#7a668a", "#a78c81", "#6e8586"][row]}
              opacity={0.6 + row * 0.08}
            />
          ))}
        </g>
      ))}
      <path
        data-living-layer="editor-playhead"
        d={`M${playhead} 1338V1522`}
        stroke="#f2a9c4"
        strokeWidth={2}
      />
      <path d={`M${playhead - 6} 1335h12l-6 7Z`} fill="#f2a9c4" />
    </g>
  )
}
function SocialTile({
  time,
  x,
  y,
  size,
  phase,
}: {
  time: number
  x: number
  y: number
  size: number
  phase: number
}) {
  const uid = `social-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  return (
    <g
      data-living-layer="social-tile"
      transform={`translate(${x + Math.sin(time * 1.3 + phase) * 12} ${y + Math.cos(time * 1.1 + phase) * 14}) rotate(${Math.sin(time + phase) * 8}) scale(${size / 100})`}
    >
      <defs>
        <linearGradient
          id={uid}
          x1={0.2 + Math.sin(time * 0.7 + phase) * 0.2}
          y1="0"
          x2="1"
          y2="1"
        >
          <stop stopColor="#6c3e87" />
          <stop offset=".5" stopColor="#be668f" />
          <stop offset="1" stopColor="#dfaa89" />
        </linearGradient>
      </defs>
      <rect
        x={-50}
        y={-50}
        width={100}
        height={100}
        rx={24}
        fill="#160f1c"
        opacity=".15"
        transform="translate(3 6)"
        style={{ filter: "blur(3px)" }}
      />
      <rect
        x={-50}
        y={-50}
        width={100}
        height={100}
        rx={24}
        fill={`url(#${uid})`}
        stroke="#d6a4b9"
        strokeWidth={1.5}
      />
      <rect
        x={-30}
        y={-30}
        width={60}
        height={60}
        rx={18}
        fill="none"
        stroke="#fbeae8"
        strokeWidth={5}
      />
      <circle r={14} fill="none" stroke="#fbeae8" strokeWidth={5} />
      <circle cx={20} cy={-19} r={4} fill="#fbeae8" />
    </g>
  )
}
function System({ time, uid }: FrameProps) {
  return (
    <Chapter time={time} index={5}>
      <Label x={540} y={284} anchor="middle">
        POSTING RANDOMLY DOES
      </Label>
      <Type
        text="none of the three."
        y={492}
        size={132}
        time={time}
        at={13.73}
      />
      <Type
        text="consistently."
        y={690}
        size={203}
        serif
        fill={`url(#${uid}-red)`}
        time={time}
        at={13.96}
      />
      <BrowserDesk time={time} uid={uid} />
      <SocialTile time={time - 13.6} x={100} y={1010} size={110} phase={0} />
      <SocialTile time={time - 13.6} x={970} y={1420} size={144} phase={2} />
      <g opacity={cue(time, 14.58, 0.4)}>
        <Badge text="DESIGN THE SYSTEM." x={274} y={1460} width={532} />
      </g>
    </Chapter>
  )
}
function End({ time, uid }: FrameProps) {
  const m = living(time, 16.3),
    enter = cue(time, 16.22, 0.55)
  const shape =
    "M-185 0C-48 10-15 48 0 185C14 49 48 12 185 0C49-12 12-48 0-185C-12-48-48-12-185 0Z"
  return (
    <Chapter time={time} index={6}>
      <Ring time={time} x={540} y={672} radius={270} phase={40} />
      <g
        data-living-layer="brandmark"
        transform={`translate(540 672) rotate(${-24 + enter * 39 + m.orbit * 0.35}) scale(${0.8 + enter * 0.2})`}
      >
        <path
          d={shape}
          fill={`url(#${uid}-metal)`}
          stroke="#8c6577"
          strokeWidth={1}
        />
        <path
          d="M-120-9Q0 8 120 9"
          fill="none"
          stroke="#dbb9bf"
          strokeWidth={2}
          opacity=".6"
        />
      </g>
      <Type text="Build with" y={1040} size={125} time={time} at={16.31} />
      <Type
        text="intention."
        y={1240}
        size={236}
        serif
        fill={`url(#${uid}-red)`}
        time={time}
        at={16.42}
      />
      <Underline
        time={time}
        start={16.6}
        x={285}
        y={1290}
        width={510}
        uid={uid}
      />
      <Label x={540} y={1430} anchor="middle" size={36}>
        FOLLOW FOR MORE BRANDING SECRETS
      </Label>
    </Chapter>
  )
}

/** V4 is a designed motion editorial, not a stack of static reference slides.
 * Every visible change is evaluated from global frame time, including light,
 * camera view, original content UI, depth and object animation. */
export default function BrandSequence({ time }: { time: number }) {
  const uid = `brand-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const t = Math.max(0, Math.min(17.499, time))
  return (
    <svg
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className="ml-art"
      role="img"
      aria-label={`brand-strategy · motion editorial · ${t.toFixed(2)} s`}
      data-editorial-version="4"
      data-motion-system="living-editorial"
      data-brand-reference-sha={brandSpec.referenceSha256}
    >
      <Ambient time={t} uid={uid} />
      <Hero time={t} uid={uid} />
      <Chess time={t} uid={uid} />
      <Truth time={t} uid={uid} />
      <Purpose time={t} uid={uid} />
      <Outcome time={t} uid={uid} />
      <System time={t} uid={uid} />
      <End time={t} uid={uid} />
    </svg>
  )
}
