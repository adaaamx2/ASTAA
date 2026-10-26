import { FFmpeg } from "@ffmpeg/ffmpeg"
import coreURL from "@ffmpeg/core?url"
import wasmURL from "@ffmpeg/core/wasm?url"
import { verifiedDownload, type DownloadFile } from "./files"
import type { MixTrack } from "./mux"
import type { CaptionRender } from "./caption-frames"
import { mp4Metadata } from "./mp4-metadata"
import {
  UHD_FPS,
  uhdDimensions,
  uhdSegments,
  uhdVideoFilter,
} from "./export-4k-plan"

interface Export4kOptions {
  source: DownloadFile
  tracks: MixTrack[]
  duration?: number
  captions?: CaptionRender
  normalize?: boolean
  preserveSourceAudio?: boolean
  signal?: AbortSignal
  progress: (message: string) => void
  diagnostic?: (message: string) => void
}
let exporting = false

function download(file: DownloadFile, signal: AbortSignal) {
  signal.throwIfAborted()
  return new Promise<Awaited<ReturnType<typeof verifiedDownload>>>(
    (resolve, reject) => {
      const abort = () => reject(signal.reason)
      signal.addEventListener("abort", abort, { once: true })
      verifiedDownload(file)
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", abort))
    },
  )
}

/** Independent pipeline: never calls or modifies the existing MP4/WAV exporters. */
export async function export4kMp4(options: Export4kOptions) {
  if (exporting) throw new Error("Ya hay una exportación 4K en marcha.")
  exporting = true
  const ffmpeg = new FFmpeg()
  if (options.diagnostic)
    ffmpeg.on("log", (event) => options.diagnostic?.(event.message))
  const timeout = AbortSignal.timeout(1800000)
  const signal = AbortSignal.any([
    timeout,
    ...(options.signal ? [options.signal] : []),
  ])
  const abort = () => ffmpeg.terminate()
  signal.addEventListener("abort", abort, { once: true })
  const check = () => signal.throwIfAborted()
  const exec = async (args: string[]) => {
    check()
    if ((await ffmpeg.exec(args, 180000, { signal })) !== 0)
      throw new Error(
        "El navegador no pudo completar la codificación 4K. No se han modificado tus vídeos ni pistas; puedes usar los exportadores anteriores.",
      )
  }
  try {
    check()
    options.progress("4K independiente · cargando codificador…")
    await ffmpeg.load({ coreURL, wasmURL }, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
    })
    const base = await download(options.source, signal)
    check()
    const sourceBytes = new Uint8Array(await base.blob.arrayBuffer())
    const metadata = mp4Metadata(sourceBytes)
    await ffmpeg.writeFile("source.mp4", sourceBytes, { signal })
    const dimensions = uhdDimensions(metadata.width, metadata.height)
    const sourceDuration = metadata.duration
    if (!Number.isFinite(sourceDuration) || sourceDuration <= 0)
      throw new Error("No se pudo comprobar la duración del vídeo.")
    const duration = options.duration ?? sourceDuration
    const segments = uhdSegments(duration)
    const files: string[] = []
    for (const [index, segment] of segments.entries()) {
      check()
      options.progress(
        `4K · tramo ${index + 1}/${segments.length} · ${Math.round((index / segments.length) * 90)} %`,
      )
      const seek = Math.min(segment.start, Math.max(0, sourceDuration - 0.1))
      const inputs = ["-ss", String(seek), "-i", "source.mp4"]
      let filter = `[0:v]${uhdVideoFilter(dimensions.width, dimensions.height, segment.duration)}[base]`
      let output = "[base]"
      let captionCount = 0
      if (options.captions?.words.length) {
        const { captionFrames } = await import("./caption-frames")
        const rendered = await captionFrames(
          {
            ...options.captions,
            ...dimensions,
            fps: UHD_FPS,
            words: options.captions.words.map((word) => ({
              ...word,
              start: word.start - segment.start,
              end: word.end - segment.start,
            })),
          },
          segment.duration,
          (name, bytes) => ffmpeg.writeFile(name, bytes, { signal }),
          (message) =>
            options.progress(
              `4K · tramo ${index + 1}/${segments.length} · ${message}`,
            ),
          signal,
        )
        captionCount = Math.ceil(segment.duration * rendered.fps)
        inputs.push(
          "-framerate",
          String(rendered.fps),
          "-i",
          "caption-%05d.png",
        )
        filter += `;[base][1:v]overlay=0:${rendered.cropY}:eof_action=repeat:shortest=0[captioned]`
        output = "[captioned]"
      }
      const file = `chunk-${String(index).padStart(4, "0")}.mp4`
      await exec([
        ...inputs,
        "-filter_complex",
        filter,
        "-map",
        output,
        "-an",
        "-frames:v",
        String(segment.frames),
        "-r",
        String(UHD_FPS),
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
        "-filter_complex_threads",
        "1",
        "-video_track_timescale",
        "60000",
        file,
      ])
      files.push(file)
      for (let frame = 0; frame < captionCount; frame++)
        await ffmpeg.deleteFile(
          `caption-${String(frame).padStart(5, "0")}.png`,
          { signal },
        )
    }
    options.progress("4K · uniendo vídeo y mezcla de audio · 92 %")
    await ffmpeg.writeFile(
      "chunks.txt",
      files.map((file) => `file '${file}'`).join("\n"),
      { signal },
    )
    const inputs = ["-f", "concat", "-safe", "0", "-i", "chunks.txt"]
    const filters: string[] = []
    let audioMap: string[] = ["-an"]
    for (const [index, track] of options.tracks.entries()) {
      const downloaded = await download(track.file, signal)
      check()
      const name = `audio-${index}.${downloaded.filename.split(".").pop()}`
      await ffmpeg.writeFile(
        name,
        new Uint8Array(await downloaded.blob.arrayBuffer()),
        { signal },
      )
      if (track.loop) inputs.push("-stream_loop", "-1")
      inputs.push("-i", name)
      filters.push(
        `[${index + 1}:a]volume=${track.volume},apad=whole_dur=${duration},atrim=duration=${duration},asetpts=PTS-STARTPTS[a${index}]`,
      )
    }
    if (options.tracks.length) {
      filters.push(
        `${options.tracks.map((_, i) => `[a${i}]`).join("")}amix=inputs=${options.tracks.length}:duration=longest:normalize=0,${
          options.normalize ? "loudnorm=I=-14:TP=-1:LRA=11," : ""
        }alimiter=limit=0.95:level=0[mix]`,
      )
      audioMap = ["-map", "[mix]"]
    } else if (options.preserveSourceAudio && metadata.hasAudio) {
      inputs.push("-i", "source.mp4")
      filters.push(
        `[1:a]apad=whole_dur=${duration},atrim=duration=${duration}[original]`,
      )
      audioMap = ["-map", "[original]"]
    }
    await exec([
      ...inputs,
      ...(filters.length ? ["-filter_complex", filters.join(";")] : []),
      "-map",
      "0:v:0",
      ...audioMap,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-threads",
      "1",
      "-filter_complex_threads",
      "1",
      "-t",
      String(duration),
      "-movflags",
      "+faststart",
      "export-4k.mp4",
    ])
    options.progress("4K · comprobando resolución, fps y audio…")
    // Release intermediate encoded chunks before copying the final file out of WASM.
    for (const file of files) await ffmpeg.deleteFile(file, { signal })
    const bytes = await ffmpeg.readFile("export-4k.mp4", "binary", { signal })
    if (!(bytes instanceof Uint8Array))
      throw new Error("No se obtuvo un MP4 válido.")
    const verified = mp4Metadata(bytes)
    const fps = verified.fps
    if (
      verified.width !== dimensions.width ||
      verified.height !== dimensions.height ||
      !Number.isFinite(fps) ||
      Math.abs(fps - UHD_FPS) > 0.01
    )
      throw new Error(
        "El archivo no confirmó 4K a 60 fps; no se descargará con una etiqueta incorrecta.",
      )
    const videoDuration = verified.duration
    if (
      !Number.isFinite(videoDuration) ||
      videoDuration < duration - 1 / UHD_FPS - 0.01
    )
      throw new Error(
        "El vídeo 4K quedó incompleto; no se descargará como una exportación terminada.",
      )
    const hasAudio = verified.hasAudio
    if ((options.tracks.length || audioMap[0] !== "-an") && !hasAudio)
      throw new Error(
        "La exportación no confirmó el audio. Se conservan tus pistas originales.",
      )
    return {
      blob: new Blob([new Uint8Array(bytes)], { type: "video/mp4" }),
      ...dimensions,
      fps,
      duration: verified.duration,
      hasAudio,
    }
  } catch (error) {
    if (signal.aborted)
      throw new Error(
        options.signal?.aborted
          ? "Exportación 4K cancelada. Tus archivos originales no han cambiado."
          : "La exportación 4K superó el tiempo máximo del navegador. No se ha sustituido ningún archivo.",
      )
    throw error
  } finally {
    signal.removeEventListener("abort", abort)
    ffmpeg.terminate()
    exporting = false
  }
}
