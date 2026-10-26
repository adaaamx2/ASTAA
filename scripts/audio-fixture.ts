import { FFmpeg } from "@ffmpeg/ffmpeg"
import coreURL from "@ffmpeg/core?url"
import wasmURL from "@ffmpeg/core/wasm?url"
export async function silentVideo() {
  const ffmpeg = new FFmpeg()
  try {
    await ffmpeg.load({ coreURL, wasmURL })
    const code = await ffmpeg.exec([
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=160x284:r=60:d=1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "fixture.mp4",
    ])
    if (code) throw new Error("Could not create local visual fixture")
    const bytes = await ffmpeg.readFile("fixture.mp4")
    return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "video/mp4" })
  } finally {
    ffmpeg.terminate()
  }
}
