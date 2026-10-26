import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
import { laboralPlan } from "../src/motion-lab/laboral-plan.ts"

const require = createRequire(import.meta.url)
const cliPackage = require.resolve("@remotion/cli/package.json")
const cli = path.join(path.dirname(cliPackage), "remotion-cli.js")
const cliRequire = createRequire(cliPackage)
const renderer = createRequire(
  cliRequire.resolve("@remotion/renderer/package.json"),
)
const bin = path.dirname(
  renderer.resolve("@remotion/compositor-linux-x64-gnu/package.json"),
)
await mkdir(".production/laboral", { recursive: true })
await mkdir("public/exports", { recursive: true })
const verifying = process.argv.includes("--verify-existing")
const output = `public${laboralPlan.renderUrl}`
const partial = verifying
  ? output
  : ".production/laboral/laboral-visual.mp4"
if (!verifying)
  execFileSync(
    process.execPath,
    [
      cli,
      "render",
      "src/remotion/index.tsx",
      "Study-LaboralClothing",
      partial,
      "--codec=h264",
      "--pixel-format=yuv420p",
      "--crf=18",
      "--concurrency=1",
      "--offthreadvideo-cache-size-in-bytes=134217728",
      "--offthreadvideo-video-threads=1",
      "--log=info",
    ],
    { stdio: "inherit" },
  )
const info = JSON.parse(
  execFileSync(
    `${bin}/ffprobe`,
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", partial],
    { encoding: "utf8" },
  ),
)
const video = info.streams.find((stream) => stream.codec_type === "video")
if (
  video?.width !== 1920 ||
  video?.height !== 1080 ||
  video.r_frame_rate !== "60/1" ||
  Number(video.nb_frames) !== 1080 ||
  Math.abs(Number(info.format.duration) - 18) > 0.05 ||
  info.streams.some((stream) => stream.codec_type === "audio")
)
  throw new Error(
    "El render no confirmó horizontal 1920×1080, 18 s, 60 fps y ninguna pista de audio generada.",
  )
const bytes = await readFile(partial)
const sha256 = createHash("sha256").update(bytes).digest("hex")
if (!verifying)
  await rename(partial, output)
const manifest = JSON.parse(
  await readFile("public/exports/studies.json", "utf8"),
)
manifest.artifacts = (manifest.artifacts || []).filter(
  (artifact) => artifact.id !== laboralPlan.id,
)
manifest.artifacts.push({
  id: laboralPlan.id,
  url: laboralPlan.renderUrl,
  width: 1920,
  height: 1080,
  duration: 18,
  fps: 60,
  frames: 1080,
  bytes: bytes.length,
  sha256,
  voice: false,
  audio: "none-music-and-sfx-prepared-not-generated",
  identityStatus: laboralPlan.identityStatus,
  visualApproval: false,
  reconstruction: "editable-workwear-commercial-with-licensed-footage",
})
const samples = []
await mkdir("public/exports/studies-qa", { recursive: true })
for (const [index, time] of [1.6, 4.9, 8.6, 12.7, 16.6].entries()) {
  const file = `public/exports/studies-qa/laboral-clothing-${index}.png`
  execFileSync(`${bin}/ffmpeg`, [
    "-v",
    "error",
    "-y",
    "-ss",
    String(time),
    "-i",
    output,
    "-frames:v",
    "1",
    "-vf",
    "scale=768:-1",
    file,
  ])
  samples.push({
    time,
    frame: Math.round(time * 60),
    url: file.slice(6),
    visualReview: "pending",
  })
}
manifest.qa = (manifest.qa || []).filter((item) => item.id !== laboralPlan.id)
manifest.qa.push({
  id: laboralPlan.id,
  technical: "passed",
  visual: "pending-review",
  samples,
})
await writeFile(
  "public/exports/studies.json.tmp",
  JSON.stringify(manifest, null, 2) + "\n",
)
await rename("public/exports/studies.json.tmp", "public/exports/studies.json")
await writeFile(
  "public/exports/laboral-clothing-receta.json",
  JSON.stringify(
    {
      ...laboralPlan,
      note: "Logo proporcionado y metraje de trabajo con licencia; no es catálogo verificado de la marca. No se han generado voz, SFX ni música. Revisión visual pendiente.",
    },
    null,
    2,
  ) + "\n",
)
console.log(
  JSON.stringify({
    file: output,
    width: video.width,
    height: video.height,
    fps: video.r_frame_rate,
    duration: info.format.duration,
    frames: video.nb_frames,
    audioStreams: 0,
    bytes: bytes.length,
    sha256,
    review: samples,
  }),
)
