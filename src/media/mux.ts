import { FFmpeg } from "@ffmpeg/ffmpeg"
import coreURL from "@ffmpeg/core?url"
import wasmURL from "@ffmpeg/core/wasm?url"
import { verifiedDownload, type DownloadFile } from "./files"
import type { CaptionRender } from "./caption-frames"

export interface MixTrack {
  file: DownloadFile
  volume: number
  loop?: boolean
}

// Single-threaded WASM works without cross-origin isolation in the Make preview.
export async function mixMp4(
  video: DownloadFile,
  tracks: MixTrack[],
  duration: number,
  progress: (message: string) => void,
  captions?: CaptionRender,
  options?: { normalize?: boolean },
) {
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error("La duración de exportación no es válida.")
  const ffmpeg = new FFmpeg()
  const controller = new AbortController()
  const watchdog = setTimeout(
    () => {
      controller.abort()
      ffmpeg.terminate()
    },
    captions ? 600000 : 180000,
  )
  try {
    progress("Cargando mezclador de audio…")
    await ffmpeg.load({ coreURL, wasmURL }, {
      signal: AbortSignal.timeout(60000),
    })
    progress("Descargando vídeo y pistas…")
    const base = await verifiedDownload(video)
    await ffmpeg.writeFile(
      "video.mp4",
      new Uint8Array(await base.blob.arrayBuffer()),
    )
    const args = ["-i", "video.mp4"]
    for (const [index, track] of tracks.entries()) {
      const result = await verifiedDownload(track.file)
      const name = `track-${index}.${result.filename.split(".").pop()}`
      await ffmpeg.writeFile(
        name,
        new Uint8Array(await result.blob.arrayBuffer()),
      )
      if (track.loop) args.push("-stream_loop", "-1")
      args.push("-i", name)
    }
    const filters = tracks.map(
      (track, i) =>
        `[${i + 1}:a]volume=${track.volume},apad=whole_dur=${duration},atrim=duration=${duration},asetpts=PTS-STARTPTS[a${i}]`,
    )
    if (tracks.length)
      filters.push(
        `${tracks.map((_, i) => `[a${i}]`).join("")}amix=inputs=${tracks.length}:duration=longest:normalize=0,${
          options?.normalize ? "loudnorm=I=-14:TP=-1:LRA=11," : ""
        }alimiter=limit=0.95:level=0[mix]`,
      )
    if (captions) {
      const { captionFrames } = await import("./caption-frames")
      const rendered = await captionFrames(
        captions,
        duration,
        (name, bytes) => ffmpeg.writeFile(name, bytes),
        progress,
        controller.signal,
      )
      args.push("-framerate", String(rendered.fps), "-i", "caption-%05d.png")
      filters.push(
        `[0:v]tpad=stop_mode=clone:stop_duration=${duration}[base]`,
        `[base][${tracks.length + 1}:v]overlay=0:${rendered.cropY}:shortest=1[captioned]`,
      )
    }
    progress(
      captions
        ? "Grabando captions y audio en el MP4… Puede tardar varios minutos."
        : "Mezclando voz, SFX y música…",
    )
    ffmpeg.on("progress", ({ time }) =>
      progress(
        `Exportando MP4${
          captions ? " con captions" : ""
        } · ${Math.min(99, Math.max(0, Math.round((time / (duration * 1000000)) * 100)))} %`,
      ),
    )
    const exit = await ffmpeg.exec(
      [
        ...args,
        ...(filters.length ? ["-filter_complex", filters.join(";")] : []),
        "-map",
        captions ? "[captioned]" : "0:v:0",
        ...(tracks.length ? ["-map", "[mix]"] : ["-an"]),
        "-c:v",
        captions ? "libx264" : "copy",
        "-threads",
        "1",
        "-filter_complex_threads",
        "1",
        ...(captions
          ? [
              "-preset",
              "ultrafast",
              "-crf",
              "18",
              "-pix_fmt",
              "yuv420p",
              "-r",
              String(captions.fps || 30),
            ]
          : []),
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        String(duration),
        "-movflags",
        "+faststart",
        "output.mp4",
      ],
      captions ? 600000 : 180000,
      { signal: controller.signal },
    )
    if (exit !== 0)
      throw new Error(
        "No se pudo mezclar el MP4. Las pistas originales no se han modificado.",
      )
    const data = await ffmpeg.readFile("output.mp4")
    if (!(data instanceof Uint8Array))
      throw new Error("El mezclador no devolvió un MP4.")
    return new Blob([new Uint8Array(data)], { type: "video/mp4" })
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        "La exportación superó el tiempo máximo del navegador. Se detuvo el proceso; tus pistas y captions se conservan.",
      )
    throw error
  } finally {
    clearTimeout(watchdog)
    ffmpeg.terminate()
  }
}

export async function mixWav(
  tracks: MixTrack[],
  duration: number,
  normalize: boolean,
  progress: (message: string) => void,
) {
  const ffmpeg = new FFmpeg()
  try {
    progress("Construyendo mezcla WAV…")
    await ffmpeg.load({ coreURL, wasmURL }, {
      signal: AbortSignal.timeout(60000),
    })
    const args: string[] = []
    for (const [i, track] of tracks.entries()) {
      const result = await verifiedDownload(track.file)
      await ffmpeg.writeFile(
        `audio-${i}.wav`,
        new Uint8Array(await result.blob.arrayBuffer()),
      )
      args.push("-i", `audio-${i}.wav`)
    }
    if (!tracks.length)
      args.push("-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo")
    const filters = tracks.map(
      (t, i) =>
        `[${i}:a]volume=${t.volume},apad=whole_dur=${duration},atrim=duration=${duration},asetpts=PTS-STARTPTS[a${i}]`,
    )
    if (tracks.length)
      filters.push(
        `${tracks.map((_, i) => `[a${i}]`).join("")}amix=inputs=${tracks.length}:normalize=0,${
          normalize ? "loudnorm=I=-14:TP=-1:LRA=11," : ""
        }alimiter=limit=0.95:level=0[mix]`,
      )
    const code = await ffmpeg.exec(
      [
        ...args,
        ...(filters.length
          ? ["-filter_complex", filters.join(";"), "-map", "[mix]"]
          : []),
        "-t",
        String(duration),
        "-ar",
        "44100",
        "-c:a",
        "pcm_s16le",
        "mix.wav",
      ],
      180000,
    )
    if (code !== 0) throw new Error("No se pudo exportar la mezcla WAV.")
    const bytes = await ffmpeg.readFile("mix.wav")
    if (!(bytes instanceof Uint8Array))
      throw new Error("Respuesta WAV inválida.")
    return new Blob([new Uint8Array(bytes)], { type: "audio/wav" })
  } finally {
    ffmpeg.terminate()
  }
}
