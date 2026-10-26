import type { Character, LabProject } from "./model"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import coreURL from "@ffmpeg/core?url"
import wasmURL from "@ffmpeg/core/wasm?url"

export interface PaintPalette {
  background: string
  panel: string
  text: string
  muted: string
  accent: string
  ink: string
}
export function palette(element: HTMLElement): PaintPalette {
  const styles = getComputedStyle(element)
  const value = (name: string) => styles.getPropertyValue(name).trim()
  return {
    background: value("--ml-bg"),
    panel: value("--ml-panel"),
    text: value("--ml-text"),
    muted: value("--ml-muted"),
    accent: value("--ml-accent"),
    ink: value("--ml-ink"),
  }
}
export function envelope(buffer: AudioBuffer) {
  const samples = buffer.getChannelData(0)
  const step = Math.max(1, Math.round(buffer.sampleRate / 25))
  const values = []
  for (let at = 0; at < samples.length; at += step) {
    let sum = 0
    const end = Math.min(samples.length, at + step)
    for (let i = at; i < end; i++) sum += samples[i] * samples[i]
    values.push(Math.min(1, Math.sqrt(sum / (end - at)) * 8))
  }
  return values
}
export async function characterImage(character?: Character) {
  if (!character?.imageUrl) return null
  const response = await fetch(character.imageUrl, {
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok)
    throw new Error(
      "No se pudo recuperar la imagen del personaje. Actualiza la biblioteca.",
    )
  return createImageBitmap(await response.blob())
}
export function paintCharacter(
  canvas: HTMLCanvasElement,
  time: number,
  project: LabProject,
  character: Character | undefined,
  image: ImageBitmap | null,
  levels: number[],
  colors: PaintPalette,
) {
  const c = canvas.getContext("2d")
  if (!c) throw new Error("El navegador no puede dibujar el personaje.")
  const scene =
    project.scenes.find((scene) => time >= scene.start && time < scene.end) ||
    project.scenes.at(-1)
  const energy = levels[Math.min(levels.length - 1, Math.floor(time * 25))] || 0
  c.save()
  c.scale(canvas.width / 540, canvas.height / 960)
  c.fillStyle = colors.background
  c.fillRect(0, 0, 540, 960)
  c.fillStyle = colors.accent
  c.globalAlpha = 0.09
  c.beginPath()
  c.ellipse(270, 570, 240, 290, 0, 0, Math.PI * 2)
  c.fill()
  c.globalAlpha = 1
  c.fillStyle = colors.muted
  c.font = '500 14px "Manrope Variable"'
  c.fillText(character?.name.toUpperCase() || "PERSONAJE", 42, 56)
  c.textAlign = "right"
  c.fillText(`${scene?.id || 1}/${project.scenes.length}`, 498, 56)
  c.textAlign = "left"
  const words = (scene?.text || project.title).split(/\s+/)
  c.font = '800 35px "Manrope Variable"'
  c.fillStyle = colors.text
  let line = "",
    y = 128
  for (const word of words) {
    if (c.measureText(`${line} ${word}`).width > 450 && line) {
      c.fillText(line, 42, y)
      y += 45
      line = word
      if (y > 300) break
    } else line = line ? `${line} ${word}` : word
  }
  if (y <= 300) c.fillText(line, 42, y)
  c.save()
  c.translate(270, 570 - energy * 9)
  c.rotate(Math.sin(time * 7) * energy * 0.015)
  if (image) {
    const scale = Math.min(390 / image.width, 400 / image.height)
    c.drawImage(
      image,
      (-image.width * scale) / 2,
      (-image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    )
  } else {
    c.fillStyle = colors.panel
    c.beginPath()
    c.roundRect(-140, -150, 280, 320, 70)
    c.fill()
    c.fillStyle = colors.accent
    c.beginPath()
    c.arc(0, -30, 83, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = colors.ink
    c.font = '800 65px "Manrope Variable"'
    c.textAlign = "center"
    c.fillText((character?.name || "P").slice(0, 1).toUpperCase(), 0, -8)
  }
  c.restore()
  c.fillStyle = colors.muted
  c.font = '500 13px "Manrope Variable"'
  c.fillText("VOZ Y ESCENA · UN MISMO RELOJ", 42, 918)
  c.fillStyle = colors.accent
  c.fillRect(0, 956, 540 * Math.min(1, time / project.duration), 4)
  c.restore()
}

/** Render only the visual base. Audio/captions are mixed by the existing exporters. */
export async function renderCharacterBase(
  project: LabProject,
  character: Character | undefined,
  buffer: AudioBuffer,
  colors: PaintPalette,
  signal: AbortSignal,
  progress: (message: string) => void,
) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream)
    throw new Error(
      "Este navegador no permite grabar el lienzo. Usa Chrome o Edge de escritorio.",
    )
  const mimeType = ["video/webm;codecs=vp8", "video/webm"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  )
  if (!mimeType)
    throw new Error("No se encontró un códec de grabación compatible.")
  const image = await characterImage(character)
  const levels = envelope(buffer)
  const canvas = document.createElement("canvas")
  canvas.width = 1080
  canvas.height = 1920
  const context = new AudioContext()
  const source = context.createBufferSource()
  source.buffer = buffer
  const gain = context.createGain()
  gain.gain.value = 0
  source.connect(gain)
  gain.connect(context.destination)
  const stream = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6000000,
  })
  const chunks: Blob[] = []
  let frame = 0
  const abort = () => {
    if (recorder.state !== "inactive") recorder.stop()
  }
  const visibility = () => {
    if (document.hidden) abort()
  }
  signal.addEventListener("abort", abort, { once: true })
  document.addEventListener("visibilitychange", visibility)
  try {
    await context.resume()
    signal.throwIfAborted()
    paintCharacter(canvas, 0, project, character, image, levels, colors)
    const finished = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onerror = () => reject(new Error("No se pudo grabar el vídeo."))
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }))
    })
    recorder.start(1000)
    const origin = context.currentTime
    source.start(origin)
    const tick = () => {
      if (signal.aborted || recorder.state === "inactive") return
      if (document.hidden) {
        abort()
        return
      }
      const time = Math.min(project.duration, context.currentTime - origin)
      paintCharacter(canvas, time, project, character, image, levels, colors)
      progress(
        `Grabando composición · ${Math.round((time / project.duration) * 100)} % · mantén esta pestaña visible`,
      )
      if (time >= project.duration) recorder.stop()
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const webm = await finished
    signal.throwIfAborted()
    if (context.currentTime - origin < project.duration - 0.1)
      throw new Error(
        "La grabación se interrumpió al ocultar la pestaña. Puedes repetir el render sin generar voz otra vez.",
      )
    progress("Convirtiendo la composición a MP4…")
    const ffmpeg = new FFmpeg()
    const terminate = () => ffmpeg.terminate()
    signal.addEventListener("abort", terminate, { once: true })
    try {
      await ffmpeg.load({ coreURL, wasmURL }, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
      })
      await ffmpeg.writeFile(
        "character.webm",
        new Uint8Array(await webm.arrayBuffer()),
        { signal },
      )
      const code = await ffmpeg.exec(
        [
          "-i",
          "character.webm",
          "-vf",
          "tpad=stop_mode=clone:stop_duration=1,fps=30",
          "-t",
          String(project.duration),
          "-an",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "20",
          "-pix_fmt",
          "yuv420p",
          "-threads",
          "1",
          "character.mp4",
        ],
        180000,
        { signal },
      )
      if (code)
        throw new Error(
          "No se pudo convertir la composición. El audio se conserva.",
        )
      const bytes = await ffmpeg.readFile("character.mp4")
      if (!(bytes instanceof Uint8Array))
        throw new Error("El render no devolvió un MP4.")
      return new Blob([new Uint8Array(bytes)], { type: "video/mp4" })
    } finally {
      signal.removeEventListener("abort", terminate)
      ffmpeg.terminate()
    }
  } finally {
    cancelAnimationFrame(frame)
    signal.removeEventListener("abort", abort)
    document.removeEventListener("visibilitychange", visibility)
    if (recorder.state !== "inactive") recorder.stop()
    stream.getTracks().forEach((track) => track.stop())
    try {
      source.stop()
    } catch {}
    await context.close()
    image?.close()
  }
}
