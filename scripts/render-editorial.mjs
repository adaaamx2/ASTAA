import { createRequire } from "node:module"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { readFile, writeFile, mkdir, rename } from "node:fs/promises"
import { createHash } from "node:crypto"
import { studies } from "../src/motion-lab/studies.ts"
import { brandSpec } from "../src/motion-lab/brand-spec.ts"

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
await mkdir("public/exports", { recursive: true })
await mkdir(".production/editorial", { recursive: true })
for (const study of studies.filter(
  (row) =>
    (row.id === "editing-collage" || row.id === "brand-strategy") &&
    (!process.argv[2] || row.id === process.argv[2]),
)) {
  const partial = `.production/editorial/${study.id}.mp4`
  execFileSync(
    process.execPath,
    [
      cli,
      "render",
      "src/remotion/index.tsx",
      study.composition,
      partial,
      "--codec=h264",
      "--pixel-format=yuv420p",
      "--crf=18",
      "--concurrency=1",
      "--gl=swangle",
      "--log=error",
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
  const fps = 60
  if (
    video.width !== study.width ||
    video.height !== study.height ||
    Number(video.nb_frames) !== Math.round(study.duration * fps)
  )
    throw new Error(`Invalid render ${study.id}`)
  const bytes = await readFile(partial)
  await rename(partial, `public${study.url}`)
  // Update only this artifact. Preserve existing ENBU / BLUE HOUR renders and QA.
  const manifest = JSON.parse(
    await readFile("public/exports/studies.json", "utf8"),
  )
  manifest.artifacts = manifest.artifacts.filter(
    (artifact) => artifact.id !== study.id,
  )
  manifest.artifacts.push({
    id: study.id,
    url: study.url,
    width: study.width,
    height: study.height,
    duration: Number(video.duration),
    fps,
    frames: Number(video.nb_frames),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    audio: "none-new-voice-optional",
    voice: false,
    reconstruction:
      "v4-living-motion-editorial-original-vector-devices-CC0-sculpture-render",
    visualApproval: brandSpec.visualApproval,
    minimumSceneScore: brandSpec.minimumSceneScore,
  })
  await writeFile(
    "public/exports/studies.json",
    JSON.stringify(manifest, null, 2) + "\n",
  )
  console.log(
    `Verified ${study.id}: ${video.width}x${video.height}, ${video.nb_frames} frames`,
  )
}
