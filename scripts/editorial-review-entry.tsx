import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import EditorialSequence, {
  editorialAssetUrls,
  loadEditorialFonts,
  type EditorialId,
} from "../src/motion-lab/EditorialSequence"
import "../src/editorial-fonts.css"

let root: Root | null = null
let container: HTMLDivElement | null = null
let loaded: Promise<unknown> | null = null
function prepare() {
  loaded ??= Promise.all([loadEditorialFonts()])
  return loaded
}
function mount(width: number, height: number) {
  if (!container) {
    container = document.createElement("div")
    container.id = "editorial-review-root"
    document.body.appendChild(container)
    root = createRoot(container)
  }
  Object.assign(container.style, {
    position: "fixed",
    inset: "0 auto auto 0",
    zIndex: "2147483647",
    width: `${width}px`,
    height: `${height}px`,
    background: "#fafaf9",
    overflow: "hidden",
  })
}
const settle = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
async function imagesReady() {
  await Promise.all(
    [...container!.querySelectorAll("image")].map(async (node) => {
      const image = new Image()
      image.src = node.getAttribute("href")!
      await image.decode()
    }),
  )
  const deadline = Date.now() + 60000
  while (
    [...container!.querySelectorAll("canvas[data-procedural-3d]")].some(
      (node) => !(node as HTMLCanvasElement).dataset.ready,
    )
  ) {
    const failure = [
      ...container!.querySelectorAll("canvas[data-error]"),
    ][0] as HTMLCanvasElement | undefined
    if (failure) throw new Error(failure.dataset.error)
    if (Date.now() > deadline)
      throw new Error("3D review frame did not become ready")
    await settle()
  }
}
export async function mountFrame(id: EditorialId, time: number, width = 1080) {
  await prepare()
  mount(width, (width * 16) / 9)
  flushSync(() =>
    root!.render(
      <EditorialSequence key={`${id}:${width}`} id={id} time={time} />,
    ),
  )
  await imagesReady()
  await settle()
}
export async function mountBoard(id: EditorialId, samples: number[]) {
  await prepare()
  const height = Math.ceil(samples.length / 3) * 674
  mount(1080, height)
  flushSync(() =>
    root!.render(
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 360px)",
          color: "#fff",
          background: "#141517",
        }}
      >
        {samples.map((time) => (
          <div key={time}>
            <div style={{ width: 360, height: 640 }}>
              <EditorialSequence id={id} time={time} />
            </div>
            <div
              style={{
                height: 34,
                padding: "8px 12px",
                font: "12px monospace",
              }}
            >
              {id} · {time.toFixed(3)} s
            </div>
          </div>
        ))}
      </div>,
    ),
  )
  await imagesReady()
  await settle()
  return height
}
/** Raster boards keep one live WebGL context instead of nine concurrent worlds. */
export async function mountRasterBoard(
  id: EditorialId,
  samples: number[],
  frames: string[],
) {
  const height = Math.ceil(samples.length / 3) * 674
  mount(1080, height)
  flushSync(() =>
    root!.render(
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 360px)",
          color: "#fff",
          background: "#141517",
        }}
      >
        {samples.map((time, i) => (
          <div key={time}>
            <img
              src={`data:image/png;base64,${frames[i]}`}
              width={360}
              height={640}
            />
            <div
              style={{
                height: 34,
                padding: "8px 12px",
                font: "12px monospace",
              }}
            >
              {id} · {time.toFixed(3)} s
            </div>
          </div>
        ))}
      </div>,
    ),
  )
  await Promise.all(
    [...container!.querySelectorAll("img")].map((image) => image.decode()),
  )
  await settle()
  return height
}
