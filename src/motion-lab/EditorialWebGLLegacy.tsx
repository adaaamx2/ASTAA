// Preserved legacy engine; the active BRAND entry is EditorialSequence.tsx.
import { useId } from "react"
import BrandSequence, { brandAssetUrls } from "./BrandSequence"
import Stage3D, { type ObjectShot } from "./editorial/Stage3D"
import { editorialScenes, type EditorialId } from "./editorial-timeline"
import { ramp, sceneEnvelope, textMotion } from "./editorial/motion"
import { scenePose, shotPresentation, transitionKind } from "./editorial-motion"
import AnatomicalEngraving from "./AnatomicalEngraving"
export { editorialScenes } from "./editorial-timeline"
export type { EditorialId } from "./editorial-timeline"
export const editorialAssetUrls = brandAssetUrls
export async function loadEditorialFonts() {
  await Promise.all([
    document.fonts.load('italic 400 46px "Inter Tight Variable"'),
    document.fonts.load('italic 700 58px "Inter Tight Variable"'),
    document.fonts.load('italic 900 225px "Inter Tight Variable"'),
  ])
  await document.fonts.ready
}

const ink = "#151618",
  muted = "#a59b92",
  red = "#ae424b"
interface LineProps {
  text: string
  y: number
  size: number
  t: number
  x?: number
  fill?: string
  weight?: number
  align?: "start" | "middle" | "end"
  delay?: number
  brand?: boolean
  tracking?: number
}
interface SequenceProps {
  id: EditorialId
  time: number
}
/** A masked optical baseline reveal; each line has its own lead/lag. */
function Line({
  text,
  x = 540,
  y,
  size,
  t,
  fill = ink,
  weight = 700,
  align = "middle",
  delay = 0,
  brand = false,
  tracking,
}: LineProps) {
  const uid = useId().replace(/:/g, "")
  const motion = textMotion(t, delay)
  return (
    <g opacity={motion.opacity}>
      <defs>
        <clipPath id={`line-${uid}`}>
          <rect x="20" y={y - size * 1.22} width="1040" height={size * 1.46} />
        </clipPath>
      </defs>
      <g clipPath={`url(#line-${uid})`}>
        <text
          x={x}
          y={y + motion.y}
          textAnchor={align}
          fill={fill}
          fontSize={size}
          fontWeight={weight}
          fontFamily={
            brand
              ? '"Inter Tight Variable", sans-serif'
              : '"Inter Variable", sans-serif'
          }
          fontStyle={brand ? "italic" : "normal"}
          letterSpacing={
            tracking ?? (size > 100 ? -size * 0.065 : -size * 0.035)
          }
          transform={`rotate(${motion.rotation} ${x} ${y})`}
        >
          {text}
        </text>
      </g>
    </g>
  )
}
function Organic({ time, dark }: Record<"time" | "dark", number>) {
  const angle = 15 + Math.sin(time * 0.65) * 9
  return (
    <g
      fill={dark > 0.5 ? "#7d3039" : ink}
      opacity={0.96}
      filter={dark > 0.5 ? "url(#editorial-organic-soft)" : undefined}
    >
      <path
        d="M-360 0C-80 11-24 87 0 400C14 105 99 24 360 0C107-12 20-83 0-360C-16-86-96-15-360 0Z"
        transform={`translate(1080 120) rotate(${angle}) scale(1.1)`}
      />
      <path
        d="M-360 0C-80 11-24 87 0 400C14 105 99 24 360 0C107-12 20-83 0-360C-16-86-96-15-360 0Z"
        transform={`translate(-25 1890) rotate(${-angle - 12}) scale(.9)`}
      />
    </g>
  )
}
function sceneLines(id: EditorialId, index: number, t: number) {
  const line = (props: Omit<LineProps, "t">) => (
    <Line key={`${props.text}-${props.y}`} {...props} t={t} />
  )
  if (id === "editing-collage") {
    const content: Array<Array<Omit<LineProps, "t">>> = [
      [],
      [
        { text: "EDITING", y: 925, size: 154, fill: muted, weight: 800 },
        { text: "is a skill", y: 1013, size: 66, weight: 600, delay: 0.12 },
      ],
      [
        { text: "while it's", y: 556, size: 70, fill: muted },
        { text: "a skill.", y: 713, size: 145, weight: 800, delay: 0.16 },
      ],
      [
        { text: "the art of using the", y: 395, size: 68, fill: muted },
        { text: "right graphics", y: 550, size: 132, weight: 800, delay: 0.14 },
      ],
      [{ text: "Motion graphics", y: 385, size: 63, fill: muted }],
      [
        { text: "the knowledge of", y: 365, size: 65, fill: muted },
        {
          text: "design",
          x: 917,
          y: 540,
          size: 166,
          align: "end",
          weight: 800,
          delay: 0.1,
        },
      ],
      [
        { text: "human", x: 92, y: 370, size: 74, align: "start", fill: muted },
        { text: "psychology", y: 527, size: 142, weight: 800, delay: 0.1 },
      ],
      [
        {
          text: "along with hours of",
          x: 92,
          y: 365,
          size: 66,
          align: "start",
          fill: muted,
        },
        {
          text: "work",
          x: 950,
          y: 565,
          size: 200,
          align: "end",
          weight: 800,
          delay: 0.1,
        },
        { text: "[ put in ]", y: 1510, size: 42, weight: 500, delay: 0.3 },
      ],
      [
        {
          text: "combine",
          x: 90,
          y: 930,
          size: 170,
          align: "start",
          weight: 800,
        },
        {
          text: "to create",
          x: 958,
          y: 1060,
          size: 104,
          align: "end",
          fill: muted,
          delay: 0.15,
        },
      ],
      [
        {
          text: "astonishing —",
          x: 90,
          y: 365,
          size: 60,
          align: "start",
          fill: muted,
        },
        { text: "masterpiece", y: 515, size: 132, weight: 800, delay: 0.12 },
      ],
      [
        {
          text: "that appeals to",
          y: 930,
          size: 62,
          fill: "#f8f8f4",
          weight: 500,
        },
        {
          text: "human eye",
          y: 1070,
          size: 133,
          fill: muted,
          weight: 700,
          delay: 0.13,
        },
      ],
    ]
    return content[index].map(line)
  }
  const big = (
    text: string,
    y: number,
    size: number,
    delay: number,
    x = 540,
    align: LineProps["align"] = "middle",
  ) =>
    line({
      text,
      y,
      size,
      delay,
      fill: red,
      weight: 900,
      brand: true,
      x,
      align,
    })
  switch (index) {
    case 0:
      return (
        <>
          {line({
            text: "here's the branding secret",
            y: 410,
            size: 48,
            weight: 400,
            brand: true,
          })}
          {big("no one", 610, 213, 0.25, 113, "start")}
          {big("tells", 805, 213, 0.34, 113, "start")}
          {big("you", 1000, 213, 0.43, 113, "start")}
        </>
      )
    case 1:
      return (
        <>
          {line({
            text: "A brand without a content strategy",
            y: 460,
            size: 45,
            weight: 400,
            brand: true,
          })}
          {big("is just", 640, 156, 0.25)}
          {big("posting and", 795, 156, 0.34)}
          {big("hoping", 950, 156, 0.43)}
        </>
      )
    case 2:
      return (
        <>
          {line({
            text: "and hope is",
            y: 920,
            size: 66,
            weight: 400,
            fill: "#f6f4f0",
            brand: true,
          })}
          {big("not a growth plane", 1035, 92, 0.2)}
        </>
      )
    case 3:
      return (
        <>
          {line({
            text: "Every piece of content should",
            y: 445,
            size: 46,
            weight: 400,
            brand: true,
          })}
          {big("either", 635, 171, 0.25)}
          {big("attract", 805, 181, 0.36)}
          {big("new eyes", 968, 163, 0.48)}
        </>
      )
    case 4:
      return (
        <>
          {line({
            text: "or convert attention",
            y: 915,
            size: 60,
            weight: 400,
            fill: "#f6f4f0",
            brand: true,
          })}
          {big("into action", 1044, 105, 0.2)}
        </>
      )
    case 5:
      return (
        <>
          {line({
            text: "Posting randomly does",
            y: 430,
            size: 49,
            weight: 400,
            brand: true,
          })}
          {big("none of the", 615, 150, 0.2, 105, "start")}
          {big("three", 765, 150, 0.3, 105, "start")}
          {big("consistently", 915, 145, 0.4, 105, "start")}
        </>
      )
    default:
      return line({
        text: "Follow for more branding secrets",
        y: 1160,
        size: 48,
        weight: 400,
        brand: true,
        delay: 0.12,
      })
  }
}
function shotsFor(id: EditorialId, time: number): ObjectShot[] {
  const editing = id === "editing-collage"
  const sceneAssets = editing
    ? [
        "crowd",
        "screens",
        "target",
        "graphics",
        "screen",
        "flowers",
        "",
        "clock",
        "",
        "masterpiece",
        "eyes",
      ]
    : ["statue", "chess", "", "phone", "", "laptop", "avatar"]
  const heights = editing
    ? [1150, 1800, 730, 890, 1000, 790, 820, 740, 0, 820, 1740]
    : [1310, 620, 0, 900, 0, 1030, 340]
  const centers = editing
    ? [1440, 960, 1220, 1190, 995, 1140, 1120, 1080, 0, 1140, 960]
    : [1390, 1290, 0, 1450, 0, 1400, 860]
  const shots: ObjectShot[] = []
  editorialScenes[id].forEach((scene, index) => {
    const pose = scenePose(time, scene.start, scene.end, index === editorialScenes[id].length - 1)
    const presentation = shotPresentation(id, index, pose)
    const opacity = presentation.opacity
    if (!sceneAssets[index] || !pose.visible || opacity < 0.002) return
    const t = time - scene.start
    const enter =
      scene.start === 0
        ? ramp(t, -0.35, 0.75)
        : ramp(time, scene.start - 0.3, scene.start + 0.58)
    const leave = ramp(time, scene.end - 0.12, scene.end + 0.4)
    const drift = Math.sin(time * 0.67 + index) * 10
    const irisIn = transitionKind(id, index - 1) === "iris" && pose.incoming < 1
    const irisOut = transitionKind(id, index) === "iris" && pose.outgoing > 0
    shots.push({
      key: `${id}-${index}`,
      asset: sceneAssets[index],
      x:
        presentation.x +
        540 +
        (drift + (index === 0 && !editing ? (1 - enter) * 240 : 0)) *
          presentation.scale,
      y:
        presentation.y +
        960 +
        (centers[index] -
          960 +
          (1 - enter) * (editing && index === 0 ? -100 : 120) +
          Math.sin(time * 0.9) * 7) *
          presentation.scale,
      height: heights[index] * (0.96 + enter * 0.04) * presentation.scale,
      yaw:
        (!editing && index === 0 ? -0.13 : editing && index === 2 ? -0.2 : 0) +
        Math.sin(time * 0.65 + index) * 0.1 +
        (1 - enter) * 0.28 -
        leave * 0.16,
      pitch:
        editing && index === 4
          ? 0.13
          : !editing && index === 3
            ? -0.08
            : Math.sin(time * 0.45) * 0.025,
      roll:
        (editing && index === 5
          ? -0.1
          : editing && index === 9
            ? 0.04
            : Math.sin(time * 0.6 + index) * 0.025) -
        (presentation.rotation * Math.PI) / 180,
      opacity,
      irisMode: irisIn ? 1 : irisOut ? -1 : 0,
      irisProgress: irisIn ? pose.incoming : irisOut ? pose.outgoing : 1,
    })
  })
  return shots
}

/** All imagery is constructed by models.ts. The reference MP4 is comparison-only. */
export default function EditorialSequence({ id, time }: SequenceProps) {
  const uid = useId().replace(/:/g, "")
  if (id === "brand-strategy") return <BrandSequence time={time} />
  const editing = id === "editing-collage"
  const current =
    editorialScenes[id].find(
      (scene) => time >= scene.start && time < scene.end,
    ) || editorialScenes[id].at(-1)!
  const shots = shotsFor(id, time)
  return (
    <svg
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      className="ml-art"
      role="img"
      data-editorial-version="2"
      data-editorial-renderer="procedural-webgl"
      aria-label={`${id} · ${current.title} · ${time.toFixed(2)} s`}
    >
      <defs>
        <filter id="editorial-organic-soft">
          <feGaussianBlur stdDeviation="20" />
        </filter>
      </defs>
      <rect width="1080" height="1920" fill={editing ? "#f8f8f6" : "#ffffff"} />
      {editorialScenes[id].map((scene, index) => {
      const pose = scenePose(time, scene.start, scene.end, index === editorialScenes[id].length - 1)
        const p = shotPresentation(id, index, pose)
        if (!pose.visible || p.opacity < 0.002) return null
        const irisIn =
          transitionKind(id, index - 1) === "iris" && pose.incoming < 1
        const irisOut =
          transitionKind(id, index) === "iris" && pose.outgoing > 0
        const radius = 1115 * (irisIn ? pose.incoming : pose.outgoing)
        return (
          <g
            key={index}
            data-editorial-scene={index}
            opacity={p.opacity}
            clipPath={irisIn ? `url(#iris-in-${uid}-${index})` : undefined}
            mask={irisOut ? `url(#iris-out-${uid}-${index})` : undefined}
            transform={`translate(${p.x} ${p.y}) translate(540 960) scale(${p.scale}) rotate(${p.rotation}) translate(-540 -960)`}
          >
            <defs>
              <clipPath id={`iris-in-${uid}-${index}`}>
                <circle cx="540" cy="960" r={radius} />
              </clipPath>
              <mask id={`iris-out-${uid}-${index}`}>
                <rect width="1080" height="1920" fill="white" />
                <circle cx="540" cy="960" r={radius} fill="black" />
              </mask>
            </defs>
            <rect
              width="1080"
              height="1920"
              fill={
                editing
                  ? index === 10
                    ? "#09090b"
                    : "#f8f8f6"
                  : index === 2 || index === 4
                    ? "#09090b"
                    : "#ffffff"
              }
            />
            {!editing && index !== 0 && index !== 6 && (
              <Organic time={time} dark={index === 2 || index === 4 ? 1 : 0} />
            )}
            {!editing && index === 6 && (
              <circle cx="540" cy="850" r="210" fill="#eeedeb" />
            )}
            {sceneLines(id, index, time - scene.start)}
            {editing && index === 6 && (
              <svg x="170" y="730" width="780" height="810" overflow="visible">
                <AnatomicalEngraving />
              </svg>
            )}
          </g>
        )
      })}
      <Stage3D shots={shots} time={time} />
      {!editing && time >= 2.5 && time <= 5.85 && (
        <g opacity={sceneEnvelope(time, 2.35, 5.85)} fill={ink}>
          {Array.from({ length: 66 }, (_, i) => (
            <rect
              key={i}
              x={331 + i * 6.2}
              y="1700"
              width={i % 3 ? 2 : 4}
              height={i % 5 ? 80 : 88}
            />
          ))}
        </g>
      )}
      {!editing && time > 9.3 && time < 11.9 && (
        <g opacity={ramp(time, 9.3, 9.8) * (1 - ramp(time, 11.65, 12))}>
          <Line
            text="build trust"
            x={238}
            y={1575}
            size={39}
            t={10}
            weight={400}
            brand
          />
          <Line
            text="with existing"
            x={238}
            y={1622}
            size={39}
            t={10}
            weight={400}
            brand
          />
          <Line
            text="ones"
            x={238}
            y={1669}
            size={39}
            t={10}
            weight={400}
            brand
          />
        </g>
      )}
    </svg>
  )
}
