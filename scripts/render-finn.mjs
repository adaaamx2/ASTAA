import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { readFile, writeFile, rename, stat, mkdir, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { initialStore, validateStore } from "../src/production/data.ts"
import { activePacks, subtitleFile } from "../src/production/timing.ts"
import { renderSpec } from "../src/production/render-spec.ts"

const require = createRequire(import.meta.url)
const cliPackage = require.resolve("@remotion/cli/package.json")
const cli = path.join(path.dirname(cliPackage), "remotion-cli.js")
const cliRequire = createRequire(cliPackage)
const rendererRequire = createRequire(
  cliRequire.resolve("@remotion/renderer/package.json"),
)
const compositor = path.dirname(
  rendererRequire.resolve("@remotion/compositor-linux-x64-gnu/package.json"),
)
const output = "public/exports"
const documentIndex = process.argv.indexOf("--project")
const document =
  documentIndex >= 0
    ? validateStore(
        JSON.parse(await readFile(process.argv[documentIndex + 1], "utf8")),
      )
    : initialStore
const idIndex = process.argv.indexOf("--video")
const project =
  idIndex >= 0
    ? document.projects.find((p) => p.id === process.argv[idIndex + 1])
    : document.projects[0]
if (!project || project.scenes.at(-1)?.end !== 57)
  throw new Error(
    "This render job requires a 57-second project; no timing is silently rewritten.",
  )
const spec = renderSpec(project)
const native4k = process.argv.includes("--4k")
const manifestPath = `${output}/finn-animatics.json`
await mkdir(output, { recursive: true })
await mkdir(".production/jobs", { recursive: true })
let manifest = {
  status: "rendering",
  audio: "none",
  timing: "estimated",
  spec,
  variants: [],
}
// Existing validated files remain available; never publish incomplete artifacts.
try {
  const old = JSON.parse(await readFile(manifestPath, "utf8"))
  if (JSON.stringify(old.spec) === JSON.stringify(spec))
    manifest = { ...old, status: "rendering" }
} catch {}
delete manifest.error

async function persist() {
  await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2))
  await rename(`${manifestPath}.tmp`, manifestPath)
}
let activeChild = null
let cancelled = false
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    cancelled = true
    activeChild?.kill("SIGTERM")
  })
}
function run(command, args, capture = false) {
  return new Promise((resolve, reject) => {
    if (cancelled) return reject(new Error("Render cancelled"))
    const child = spawn(command, args, {
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    })
    activeChild = child
    let stdout = ""
    if (capture)
      child.stdout.on("data", (bytes) => {
        stdout += bytes
      })
    child.once("error", reject)
    child.once("exit", (code) => {
      activeChild = null
      code === 0
        ? resolve(stdout)
        : reject(new Error(`${path.basename(command)} exited ${code}`))
    })
  })
}
await persist()
try {
  for (const pack of activePacks) {
    const resolutions = native4k
      ? [
          { suffix: "4k", width: 2160, height: 3840 },
          { suffix: "1080", width: 1080, height: 1920 },
        ]
      : [{ suffix: "1080", width: 1080, height: 1920 }]
    for (const { suffix, width, height } of resolutions) {
      const name = `finn-${pack}-animatic-${suffix}.mp4`
      const destination = `${output}/${name}`
      const temporary = `${output}/.${name}.partial.mp4`
      const checkpoint = `.production/jobs/finn-${pack}-${suffix}.checkpoint.json`
      const identity = JSON.stringify({ spec, pack, width, height })
      const existing = manifest.variants.find(
        (v) => v.pack === pack && v.width === width,
      )
      if (existing) {
        try {
          const digest = createHash("sha256")
            .update(await readFile(destination))
            .digest("hex")
          if (digest === existing.sha256) {
            console.log(`Cache verified: ${name}`)
            continue
          }
        } catch {}
      }
      const started = Date.now()
      let reusePartial = false
      try {
        if ((await readFile(checkpoint, "utf8")) === identity) {
          const probe = JSON.parse(
            await run(
              `${compositor}/ffprobe`,
              [
                "-v",
                "error",
                "-show_streams",
                "-show_format",
                "-of",
                "json",
                temporary,
              ],
              true,
            ),
          )
          const stream = probe.streams.find((s) => s.codec_type === "video")
          reusePartial =
            stream?.width === width &&
            stream?.height === height &&
            Number(stream?.nb_frames) === 3420 &&
            Number(probe.format.duration) === 57
        }
      } catch {}
      if (reusePartial) {
        console.log(`Resuming verification without re-rendering: ${name}`)
      } else {
        await rm(temporary, { force: true })
        await writeFile(checkpoint, identity)
      }
      if (!reusePartial && native4k && suffix === "1080") {
        await run(`${compositor}/ffmpeg`, [
          "-v",
          "error",
          "-y",
          "-i",
          `${output}/finn-${pack}-animatic-4k.mp4`,
          "-vf",
          "scale=1080:1920:flags=lanczos",
          "-an",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "20",
          "-threads",
          "1",
          temporary,
        ])
      } else if (!reusePartial) {
        await run(process.execPath, [
          cli,
          "render",
          "src/remotion/index.tsx",
          `Finn-${pack}`,
          temporary,
          `--props=${JSON.stringify({ ...spec, pack })}`,
          `--width=${width}`,
          `--height=${height}`,
          "--codec=h264",
          "--pixel-format=yuv420p",
          "--crf=20",
          `--concurrency=${width === 2160 ? 1 : 2}`,
          "--log=error",
        ])
      }
      const info = JSON.parse(
        await run(
          `${compositor}/ffprobe`,
          [
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            temporary,
          ],
          true,
        ),
      )
      const video = info.streams.find((s) => s.codec_type === "video")
      if (
        video?.width !== width ||
        video?.height !== height ||
        video?.r_frame_rate !== "60/1" ||
        Number(video?.nb_frames) !== 3420 ||
        Math.abs(Number(info.format.duration) - 57) > 0.05 ||
        info.streams.some((s) => s.codec_type === "audio")
      )
        throw new Error(`Invalid output: ${name}`)
      await run(`${compositor}/ffmpeg`, [
        "-v",
        "error",
        "-i",
        temporary,
        "-c:v",
        "rawvideo",
        "-threads",
        "1",
        "-f",
        "null",
        "-",
      ])
      await rename(temporary, destination)
      await rm(checkpoint, { force: true })
      const bytes = (await stat(destination)).size
      const sha256 = createHash("sha256")
        .update(await readFile(destination))
        .digest("hex")
      manifest.variants = manifest.variants.filter(
        (v) => !(v.pack === pack && v.width === width),
      )
      manifest.variants.push({
        pack,
        width,
        height,
        fps: 60,
        duration: 57,
        frames: 3420,
        audio: "none",
        bytes,
        sha256,
        url: `/exports/${name}`,
        elapsedSeconds: (Date.now() - started) / 1000,
        qa: "technical-pass-visual-review-pending",
      })
      await persist()
      console.log(`Verified ${name}: ${bytes} bytes`)
    }
    for (const format of ["srt", "vtt"])
      await writeFile(
        `${output}/finn-${pack}-estimated.${format}`,
        subtitleFile(project.scenes, pack, format),
      )
  }
  manifest.status = "rendered-needs-review"
  manifest.completedAt = new Date().toISOString()
  await persist()
} catch (error) {
  manifest.status = cancelled ? "cancelled" : "failed"
  manifest.error = error.message
  await persist()
  throw error
}
