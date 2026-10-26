import { renderToStaticMarkup } from "react-dom/server"
import Captions from "../production/Captions"
import type { WordTiming } from "../production/timing"
import fontURL from "@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url"

export interface CaptionRender {
  words: WordTiming[]
  pack: string
  width: number
  height: number
  viewport: Record<"width" | "height", number>
  accent?: string
  fps?: number
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  signal.throwIfAborted()
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener("abort", abort, { once: true })
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort))
  })
}

/** Rasterize the actual preview component, not a second subtitle implementation. */
export async function captionFrames(
  options: CaptionRender,
  duration: number,
  write: (name: string, bytes: Uint8Array) => Promise<unknown>,
  progress: (message: string) => void,
  signal?: AbortSignal,
) {
  if (!options.words.length)
    throw new Error("No hay palabras temporizadas para exportar captions.")
  await abortable(document.fonts.load('800 24px "Manrope Variable"'), signal)
  const response = await fetch(fontURL, {
    signal: AbortSignal.any([
      ...(signal ? [signal] : []),
      AbortSignal.timeout(15000),
    ]),
  })
  if (!response.ok)
    throw new Error("No se pudo cargar la fuente de las captions.")
  const font = await response.blob()
  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(font)
  })
  // Captions sample at up to 30 fps; the source video keeps its output frame rate.
  const fps = Math.min(30, options.fps || 30)
  const cropY = Math.floor((options.height * 0.7) / 2) * 2
  const canvas = document.createElement("canvas")
  canvas.width = options.width
  canvas.height = options.height - cropY
  const context = canvas.getContext("2d")
  if (!context) throw new Error("El navegador no puede dibujar las captions.")
  const count = Math.ceil(duration * fps)
  for (let frame = 0; frame < count; frame++) {
    signal?.throwIfAborted()
    const markup = renderToStaticMarkup(
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={options.width}
        height={options.height}
        viewBox={`0 0 ${options.viewport.width} ${options.viewport.height}`}
      >
        <defs>
          <style>{`@font-face{font-family:"Manrope Variable";src:url("${dataURL}") format("woff2");font-weight:200 800}`}</style>
        </defs>
        <Captions
          time={frame / fps}
          words={options.words}
          pack={options.pack}
          width={options.viewport.width}
          height={options.viewport.height}
          accent={options.accent}
        />
      </svg>,
    )
    const url = URL.createObjectURL(
      new Blob([markup], { type: "image/svg+xml" }),
    )
    try {
      const image = new Image()
      image.src = url
      await abortable(image.decode(), signal)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, -cropY)
      const blob = await abortable(
        new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (blob) =>
              blob
                ? resolve(blob)
                : reject(
                    new Error("No se pudo dibujar un fotograma de captions."),
                  ),
            "image/png",
          ),
        ),
        signal,
      )
      await write(
        `caption-${String(frame).padStart(5, "0")}.png`,
        new Uint8Array(await blob.arrayBuffer()),
      )
    } finally {
      URL.revokeObjectURL(url)
    }
    if (frame % fps === 0)
      progress(`Dibujando captions · ${Math.round((frame / count) * 100)} %`)
  }
  return { fps, cropY }
}
