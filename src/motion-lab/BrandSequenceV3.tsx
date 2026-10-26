// Previous reference-calibration pass, preserved for comparison.
import { useId } from "react"
import { getRemotionEnvironment, staticFile } from "remotion"
import { publicAssetUrl } from "../media/files"
import { brandSpec, cue, settle } from "./brand-spec"

export const brandAssets = ["bust", "king", "queen", "phone", "laptop"] as const
type BrandAsset = typeof brandAssets[number]
const asset = (name: BrandAsset) =>
  getRemotionEnvironment().isRendering
    ? staticFile(`references/editorial-generated-v2/${name}.png`)
    : publicAssetUrl(`/references/editorial-generated-v2/${name}.png`)
export const brandAssetUrls = () => brandAssets.map(asset)

interface TypeProps {
  text: string
  x?: number
  y: number
  size: number
  time: number
  at: number
  weight?: number
  red?: boolean
  align?: "start" | "middle"
  stagger?: number
}
let measuring: CanvasRenderingContext2D | null = null
function textWidth(
  text: string,
  size: number,
  weight: number,
  tracking: number,
) {
  if (typeof document === "undefined") return text.length * size * 0.5
  measuring ??= document.createElement("canvas").getContext("2d")
  if (!measuring) return text.length * size * 0.5
  measuring.font = `italic ${weight} ${size}px "Inter Tight Variable"`
  return (
    measuring.measureText(text).width + Math.max(0, text.length - 1) * tracking
  )
}
/** Reference-style soft word reveal, not a rotated 90px slide from a presentation. */
function Type({
  text,
  x = 540,
  y,
  size,
  time,
  at,
  weight = 400,
  red = false,
  align = "middle",
  stagger = 0.07,
}: TypeProps) {
  const tracking = -size * (weight > 700 ? 0.035 : 0.018)
  const words = text.split(" ")
  const widths = words.map((word) => textWidth(word, size, weight, tracking))
  const gap = textWidth(" ", size, weight, 0) + tracking
  const width = widths.reduce((sum, n) => sum + n, 0) + gap * (words.length - 1)
  let left = align === "middle" ? x - width / 2 : x
  return (
    <g
      data-brand-title={text}
      fill={red ? brandSpec.red : "#0b0b0b"}
      fontFamily='"Inter Tight Variable", sans-serif'
      fontStyle="italic"
      fontWeight={weight}
      fontSize={size}
      letterSpacing={tracking}
      style={{ filter: red && weight < 900 ? "drop-shadow(0 0 6px #a7404955)" : undefined }}
    >
      {words.map((word, index) => {
        const p = cue(time, at + index * stagger, 0.3)
        const pos = left
        left += widths[index] + gap
        return (
          <text
            key={`${word}-${index}`}
            x={pos}
            y={y + (1 - p) * 15}
            opacity={p}
            style={{ filter: p < 0.999 ? `blur(${(1 - p) * 9}px)` : undefined }}
          >
            {word}
          </text>
        )
      })}
    </g>
  )
}
function WhiteType(props: Omit<TypeProps, "weight" | "red">) {
  return (
    <g className="brand-white-type" style={{ filter: "drop-shadow(0 0 7px #ffffff66)" }}>
      <Type {...props} weight={500} />
    </g>
  )
}
function ObjectImage({
  name,
  x,
  y,
  width,
  height = width,
  angle = 0,
  flip = false,
  finish,
}: {
  name: BrandAsset
  x: number
  y: number
  width: number
  height?: number
  angle?: number
  flip?: boolean
  finish?: string
}) {
  return (
    <g
      transform={`translate(${x + width / 2} ${y + height / 2}) rotate(${angle}) scale(${
        flip ? -1 : 1
      } 1) translate(${-width / 2} ${-height / 2})`}
    >
      <image
        data-generated-brand-asset={name}
        href={asset(name)}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        style={{ filter: finish }}
      />
    </g>
  )
}
interface CornerProps {
  time: number
  dark?: boolean
  bottom?: boolean
}
function Corners({ time, dark = false, bottom = false }: CornerProps) {
  // Reference-specific concave contours. A symmetric rotating star does not
  // reproduce the long horizontal tips and off-frame centres of this video.
  const turn = cue(time, 2.7, 3)
  const phone = time > 7.5 && time < 12.2
  const desk = time >= 13.5
  const lx = phone ? 730 + Math.sin(time * .6) * 14 : desk ? 675 : 590 + 85 * turn
  const ly = phone ? 330 + Math.sin(time * .6) * 15 : desk ? 105 : 140 * (1 - turn)
  const dx = phone ? 1290 : desk ? 920 : 905 - 75 * turn
  const dy = phone ? 640 : desk ? 655 : 700 - 50 * turn
  const cx = phone ? 1130 : 1100, cy = phone ? 170 : 240
  const shape = `M${lx} ${ly}C${cx - 160} ${cy - 50} ${cx - 50} ${cy + 50} ${dx} ${dy}C${cx + 10} ${cy + 75} ${cx + 150} ${cy + 10} 1600 110C${cx + 90} ${cy - 30} ${cx + 25} ${cy - 95} 1050 -600C${cx - 20} ${cy - 70} ${cx - 85} ${cy - 20} ${lx} ${ly}Z`
  const lower = `M-200 1360C-80 1720 50 1840 ${500 + Math.sin(time * .7) * 20} ${1640 + Math.cos(time * .7) * 20}C200 1860 110 1940 200 2300C30 2050-40 2000-500 2150C-80 1910-60 1830-200 1360Z`
  const darkShape = `M-300-350C-100-20 30 80 ${650 + Math.sin(time * .7) * 35} ${150 + Math.cos(time * .7) * 18}C130 130 30 170-70 530C-70 210-140 50-550 180C-230 20-240-30-300-350Z`
  const blur = dark ? 18 : time > 13.6 ? 3 + 9 * cue(time, 14.1, 0.9) : 1.3
  return (
    <g
      fill={dark ? "#7f3038" : "#000"}
      style={{ filter: `blur(${blur}px)` }}
    >
      <path d={dark ? darkShape : shape} />
      {bottom && (
        <path
          d={dark ? darkShape : lower}
          transform={dark ? "translate(1080 1920) scale(-1 -1)" : undefined}
        />
      )}
    </g>
  )
}
function Floor({
  x = 600,
  y = 1550,
  width = 260,
}: Partial<Record<"x" | "y" | "width", number>>) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={width}
      ry={17}
      fill="#000"
      opacity=".16"
      style={{ filter: "blur(13px)" }}
    />
  )
}
function Barcode() {
  return (
    <g transform="translate(348 1688)" fill="#111" data-brand-barcode="true">
      {Array.from({ length: 94 }, (_, index) => (
        <rect
          key={index}
          x={index * 4.1}
          y={0}
          width={index % 4 ? 1.3 : 3.1}
          height={88}
        />
      ))}
    </g>
  )
}
function Social({
  x,
  y,
  size,
  angle,
}: Record<"x" | "y" | "size" | "angle", number>) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size / 100})`} style={{ filter: size > 200 ? "blur(2px)" : "drop-shadow(0 3px 3px #0003)" }}>
      <defs>
        <linearGradient id={`social-${x}-${y}`} x2="1" y2="1">
          <stop stopColor="#8b47b8" />
          <stop offset=".5" stopColor="#d44768" />
          <stop offset="1" stopColor="#e5ab55" />
        </linearGradient>
      </defs>
      <rect
        x={-50}
        y={-50}
        width={100}
        height={100}
        rx={24}
        fill={`url(#social-${x}-${y})`}
        stroke="#ede1c8"
        strokeWidth={5}
      />
      <rect
        x={-29}
        y={-29}
        width={58}
        height={58}
        rx={17}
        fill="none"
        stroke="#fff"
        strokeWidth={5}
      />
      <circle r={14} fill="none" stroke="#fff" strokeWidth={5} />
      <circle cx={19} cy={-18} r={4} fill="#fff" />
    </g>
  )
}

/** Only BRAND STRATEGY. Timing/layout are measured against the supplied reference.
 * Raster masters are newly rendered local assets; the original MP4 is never a layer.
 * The differing sculpture/character remains an explicit fidelity-review limitation. */
export default function BrandSequence({ time }: { time: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const t = Math.max(0, Math.min(brandSpec.duration - 0.001, time))
  const heroOut = cue(t, 2.19, 0.36)
  const chessIn = settle(t - 2.34, 8)
  const black1 = cue(t, 5.82, 0.22) * (1 - cue(t, 7.58, 0.22))
  const black2 = cue(t, 11.87, 0.22) * (1 - cue(t, 13.57, 0.22))
  const phoneMove = settle(t - 7.69, 7)
  const phoneLower = cue(t, 8.75, 0.64)
  const deskIn = settle(t - 13.61, 7)
  const avatarIn = cue(t, 16.27, 0.3)
  return (
    <svg
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className="ml-art"
      role="img"
      aria-label={`brand-strategy · referencia calibrada · ${t.toFixed(2)} s`}
      data-editorial-version="3"
      data-brand-reference-sha={brandSpec.referenceSha256}
    >
      <style>{".brand-white-type text{fill:#fff}"}</style>
      <defs>
        <clipPath id={`${uid}-avatar`}>
          <circle cx={540} cy={807} r={154} />
        </clipPath>
      </defs>
      <rect width={1080} height={1920} fill="#fff" />
      {t < 2.6 && (
        <g data-brand-scene="1" transform={`translate(${-heroOut * 1180} 0)`}>
          <Type
            text="here's the branding secret"
            x={520}
            y={416}
            size={53}
            time={t}
            at={0}
            stagger={0.11}
          />
          <Type
            text="no one"
            x={114}
            y={602}
            size={272}
            weight={900}
            red
            align="start"
            time={t}
            at={1.02}
          />
          <Type
            text="tells"
            x={114}
            y={795}
            size={272}
            weight={900}
            red
            align="start"
            time={t}
            at={1.13}
          />
          <Type
            text="you"
            x={114}
            y={987}
            size={272}
            weight={900}
            red
            align="start"
            time={t}
            at={1.23}
          />
          <ObjectImage
            name="bust"
            x={-100}
            y={372 + (1 - settle(t, 7)) * 1420}
            width={1580}
            height={1710}
          />
        </g>
      )}
      {t > 2.25 && t < 6.05 && (
        <g data-brand-scene="2" opacity={1 - cue(t, 5.82, 0.2)}>
          <g opacity={cue(t, 2.68, 0.4)}>
            <Corners time={t} bottom />
          </g>
          <g transform={`translate(${(1 - chessIn) * 1180} 0)`}>
            <Type
              text="A brand without a content strategy"
              x={480}
              y={546}
              size={49}
              time={t}
              at={2.43}
              stagger={0.15}
            />
            <Type
              text="is just"
              x={410}
              y={695}
              size={149}
              weight={900}
              red
              time={t}
              at={4.56}
            />
            <Type
              text="posting and"
              x={534}
              y={830}
              size={153}
              weight={900}
              red
              time={t}
              at={4.69}
            />
            <Type
              text="hoping"
              x={584}
              y={963}
              size={153}
              weight={900}
              red
              time={t}
              at={4.83}
            />
            <Floor x={587} y={1490} width={259} />
            <ObjectImage
              name="king"
              x={150}
              y={730}
              width={765}
              height={840}
              angle={-2}
              finish="brightness(.85) contrast(1.12)"
            />
            <ObjectImage
              name="queen"
              x={285}
              y={900}
              width={650}
              height={655}
              angle={35}
              finish="saturate(.15) brightness(1.08)"
            />
            <Barcode />
          </g>
        </g>
      )}
      {t >= 5.82 && t < 7.84 && (
        <g data-brand-scene="3" opacity={black1}>
          <rect width={1080} height={1920} fill="#000" />
          <Corners time={t} dark bottom />
          <WhiteType
            text="and hope is"
            x={560}
            y={905}
            size={52}
            time={t}
            at={6.03}
            stagger={0.1}
          />
          <Type
            text="not a growth plane"
            x={577}
            y={963}
            size={64}
            weight={800}
            red
            time={t}
            at={6.51}
            stagger={0.1}
          />
        </g>
      )}
      {t > 7.58 && t < 12.12 && (
        <g
          data-brand-scene="4"
          opacity={cue(t, 7.58, 0.25) * (1 - cue(t, 11.88, 0.22))}
        >
          <Corners time={t} />
          <Type
            text="Every piece of content"
            y={473}
            size={45}
            time={t}
            at={7.72}
            stagger={0.13}
          />
          <Type text="should" y={518} size={45} time={t} at={8.46} />
          <Type
            text="either"
            x={188}
            y={654}
            size={176}
            weight={900}
            red
            align="start"
            time={t}
            at={8.8}
          />
          <Type
            text="attract"
            x={600}
            y={823}
            size={230}
            weight={900}
            red
            time={t}
            at={9.1}
          />
          <Type
            text="new eyes"
            x={445}
            y={927}
            size={143}
            weight={900}
            red
            time={t}
            at={9.45}
          />
          <g transform={`translate(${(1 - phoneMove) * 1170} 0)`}>
            <rect
              x={543}
              y={1380 + phoneLower * 140}
              width={62}
              height={760}
              rx={26}
              fill="#11151a"
              stroke="#343a40"
              strokeWidth={2}
            />
            <ObjectImage
              name="phone"
              x={140}
              y={630 + phoneLower * 140}
              width={820}
              height={1010}
              angle={-2}
            />
          </g>
          <g opacity={cue(t, 10.34, 0.3)}>
            <Type
              text="build trust"
              x={315}
              y={1440}
              size={40}
              time={t}
              at={10.34}
            />
            <Type
              text="with existing"
              x={315}
              y={1484}
              size={40}
              time={t}
              at={10.43}
            />
            <Type text="ones" x={315} y={1528} size={40} time={t} at={10.52} />
          </g>
        </g>
      )}
      {t >= 11.87 && t < 13.82 && (
        <g data-brand-scene="5" opacity={black2}>
          <rect width={1080} height={1920} fill="#000" />
          <Corners time={t + 0.7} dark bottom />
          <WhiteType
            text="or convert attention"
            x={570}
            y={913}
            size={50}
            time={t}
            at={11.98}
            stagger={0.11}
          />
          <Type
            text="into action"
            x={570}
            y={986}
            size={64}
            weight={800}
            red
            time={t}
            at={12.58}
          />
        </g>
      )}
      {t > 13.55 && t < 16.62 && (
        <g data-brand-scene="6" opacity={(1 - avatarIn) * cue(t, 13.55, 0.28)}>
          <Corners time={t} />
          <Type
            text="Posting randomly does"
            y={532}
            size={49}
            time={t}
            at={13.72}
            stagger={0.12}
          />
          <Type
            text="none of the"
            x={108}
            y={680}
            size={155}
            weight={900}
            red
            align="start"
            time={t}
            at={14.86}
          />
          <Type
            text="three"
            x={108}
            y={792}
            size={155}
            weight={900}
            red
            align="start"
            time={t}
            at={15.02}
          />
          <Type
            text="consistently"
            x={108}
            y={904}
            size={154}
            weight={900}
            red
            align="start"
            time={t}
            at={15.17}
          />
          <g transform={`translate(0 ${(1 - deskIn) * 1180})`}>
            <ObjectImage
              name="bust"
              x={-200}
              y={700}
              width={1250}
              height={1250}
              flip
            />
            <ObjectImage
              name="laptop"
              x={512}
              y={1114}
              width={1040}
              height={750}
              angle={4}
            />
            <Social x={267} y={1040} size={108} angle={-19} />
            <Social x={20} y={1800} size={450} angle={-19} />
            <Social x={1044} y={1664} size={160} angle={16} />
          </g>
        </g>
      )}
      {t > 16.27 && (
        <g data-brand-scene="7" opacity={avatarIn}>
          <g clipPath={`url(#${uid}-avatar)`}>
            <defs><radialGradient id={`${uid}-neon`} cx=".2" cy=".6" r=".9"><stop stopColor="#c62276" /><stop offset="1" stopColor="#35214d" /></radialGradient></defs>
            <circle cx={540} cy={807} r={154} fill={`url(#${uid}-neon)`} />
            <path
              d="M350 875C480 800 650 760 720 640"
              fill="none"
              stroke="#7ddbe0"
              strokeWidth={5}
            />
            <ObjectImage name="bust" x={255} y={580} width={570} height={570} />
          </g>
          <Type
            text="Follow for more branding secrets"
            y={1037}
            size={44}
            time={t}
            at={16.52}
            stagger={0.065}
          />
        </g>
      )}
    </svg>
  )
}
