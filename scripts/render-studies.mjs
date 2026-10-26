import { spawn, execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import {
  readFile,
  writeFile,
  rename,
  mkdir,
  stat,
  statfs,
} from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
import { studies } from "../src/motion-lab/studies.ts"
import { swordEnergy } from "../src/motion-lab/art.ts"

const require = createRequire(import.meta.url),
  cliPackage = require.resolve("@remotion/cli/package.json")
const cli = path.join(path.dirname(cliPackage), "remotion-cli.js"),
  cliRequire = createRequire(cliPackage)
const renderer = createRequire(
  cliRequire.resolve("@remotion/renderer/package.json"),
)
const bin = path.dirname(
  renderer.resolve("@remotion/compositor-linux-x64-gnu/package.json"),
)
const output = "public/exports",
  working = ".production/studies"
await mkdir(working, { recursive: true })
await mkdir(`${output}/studies-qa`, { recursive: true })
const disk = await statfs(".")
if (disk.bavail * disk.bsize < 300_000_000)
  throw new Error("Less than 300 MB available; render did not start.")
const sources = [
  "src/motion-lab/art.ts",
  "src/motion-lab/studies.ts",
  "src/motion-lab/StudyCanvas.tsx",
  "src/remotion/Root.tsx",
  "remotion.config.ts",
  "scripts/render-studies.mjs",
]
const sourceHash = createHash("sha256")
  .update(
    (await Promise.all(sources.map((file) => readFile(file))))
      .map((bytes) => bytes.toString())
      .join("\n"),
  )
  .digest("hex")
let manifest = { sourceHash, status: "rendering", artifacts: [], qa: [] }
try {
  const old = JSON.parse(await readFile(`${output}/studies.json`, "utf8"))
  if (old.sourceHash === sourceHash) manifest = { ...old, status: "rendering" }
  else {
    // Editorial renders have their own generator and must survive this refresh.
    manifest.artifacts = (old.artifacts || []).filter((artifact) => artifact.id !== "enbu" && artifact.id !== "blue-hour")
    manifest.qa = (old.qa || []).filter((row) => row.id !== "enbu" && row.id !== "blue-hour")
  }
} catch {}
async function persist() {
  await writeFile(
    `${output}/studies.json.tmp`,
    JSON.stringify(manifest, null, 2),
  )
  await rename(`${output}/studies.json.tmp`, `${output}/studies.json`)
}
let child
let cancelled = false
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    cancelled = true
    child?.kill("SIGTERM")
  })
function run(command, args) {
  return new Promise((resolve, reject) => {
    if (cancelled) return reject(new Error("Cancelled"))
    child = spawn(command, args, { stdio: "inherit" })
    child.once("error", reject)
    child.once("exit", (code) => {
      child = null
      code === 0
        ? resolve()
        : reject(new Error(`${path.basename(command)} exited ${code}`))
    })
  })
}
function atmosphere(id) {
  const rate = 44100,
    frames = rate * 18,
    data = new Float32Array(frames * 2)
  let rng = id === "enbu" ? 73129 : 98455,
    low = 0,
    middle = 0,
    crackle = 0,
    energy = 0
  const random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) | 0
    return ((rng >>> 0) / 4294967296) * 2 - 1
  }
  for (let i = 0; i < frames; i++) {
    const t = i / rate,
      phase = (t / 18) * Math.PI * 2,
      noise = random()
    low = low * 0.995 + noise * 0.005
    middle = middle * 0.8 + noise * 0.2
    let value
    if (id === "enbu") {
      if (i % 220 === 0) energy = swordEnergy(t)
      if (random() > 0.9992) crackle = random() * 0.2
      crackle *= 0.984
      value =
        low * 0.78 +
        middle * (0.035 + energy * 0.2) +
        crackle +
        Math.sin(t * 132 * Math.PI * 2) * energy * 0.009
    } else {
      const wave = 0.75 + Math.sin(phase * 3) * 0.25
      value = low * 1.25 * wave + middle * 0.018 * wave
      const creak = Math.sin(phase * 3) ** 12 * 0.008
      value +=
        (Math.sin(t * 101 * Math.PI * 2) + Math.sin(t * 103.7 * Math.PI * 2)) *
        creak
      for (const event of [2.5, 6.8, 11.2, 15.3])
        if (t >= event && t < event + 0.18) {
          const elapsed = t - event
          value +=
            Math.sin(elapsed * (1350 - elapsed * 2700) * Math.PI * 2) *
            Math.exp(-elapsed * 34) *
            0.027
        }
    }
    const edge = Math.min(1, t / 0.15, (18 - t) / 0.15)
    data[i * 2] = value * edge
    data[i * 2 + 1] = (value * 0.91 + random() * 0.006) * edge
  }
  let peak = 0,
    sum = 0
  for (const value of data) {
    peak = Math.max(peak, Math.abs(value))
    sum += value * value
  }
  const gain = Math.min(3, 0.6 / Math.max(0.001, peak))
  const wav = Buffer.alloc(44 + data.length * 2)
  wav.write("RIFF", 0)
  wav.writeUInt32LE(wav.length - 8, 4)
  wav.write("WAVEfmt ", 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(2, 22)
  wav.writeUInt32LE(rate, 24)
  wav.writeUInt32LE(rate * 4, 28)
  wav.writeUInt16LE(4, 32)
  wav.writeUInt16LE(16, 34)
  wav.write("data", 36)
  wav.writeUInt32LE(data.length * 2, 40)
  for (let i = 0; i < data.length; i++)
    wav.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, data[i] * gain)) * 32767),
      44 + i * 2,
    )
  return {
    wav,
    rmsDb: 20 * Math.log10(Math.sqrt(sum / data.length) * gain),
    peakDb: 20 * Math.log10(peak * gain),
  }
}
await persist()
try {
  for (const study of studies.filter((study) => study.id === "enbu" || study.id === "blue-hour")) {
    const destination = `${output}/study-${study.id}.mp4`
    const cached = manifest.artifacts.find(
      (artifact) => artifact.id === study.id,
    )
    if (cached) {
      const hash = createHash("sha256")
        .update(await readFile(destination))
        .digest("hex")
      if (hash === cached.sha256) {
        console.log(`Cache verified: ${study.id}`)
        continue
      }
    }
    const started = Date.now()
    const sound = atmosphere(study.id)
    const soundPath = `${output}/study-${study.id}-atmosphere.wav`
    await writeFile(soundPath, sound.wav)
    const visual = `${working}/${study.id}-visual.mp4`,
      complete = `${working}/${study.id}-complete.mp4`
    await run(process.execPath, [
      cli,
      "render",
      "src/remotion/index.tsx",
      study.composition,
      visual,
      "--codec=h264",
      "--pixel-format=yuv420p",
      "--crf=18",
      "--concurrency=2",
      "--log=error",
    ])
    await run(`${bin}/ffmpeg`, [
      "-v",
      "error",
      "-y",
      "-i",
      visual,
      "-i",
      soundPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-shortest",
      "-movflags",
      "+faststart",
      complete,
    ])
    const info = JSON.parse(
      execFileSync(
        `${bin}/ffprobe`,
        [
          "-v",
          "error",
          "-show_streams",
          "-show_format",
          "-of",
          "json",
          complete,
        ],
        { encoding: "utf8" },
      ),
    )
    const video = info.streams.find((stream) => stream.codec_type === "video"),
      audio = info.streams.filter((stream) => stream.codec_type === "audio")
    if (
      video.width !== study.width ||
      video.height !== study.height ||
      video.r_frame_rate !== "60/1" ||
      Number(video.nb_frames) !== 1080 ||
      Math.abs(Number(info.format.duration) - 18) > 0.05 ||
      audio.length !== 1
    )
      throw new Error(`Invalid output ${study.id}`)
    await run(`${bin}/ffmpeg`, [
      "-v",
      "error",
      "-i",
      complete,
      "-c:v",
      "rawvideo",
      "-c:a",
      "pcm_s16le",
      "-threads",
      "1",
      "-f",
      "null",
      "-",
    ])
    await rename(complete, destination)
    const samples = []
    for (const frame of [0, 150, 330, 540, 660, 870, 1079]) {
      const filename = `${study.id}-${frame}.png`
      execFileSync(`${bin}/ffmpeg`, [
        "-v",
        "error",
        "-y",
        "-ss",
        String(frame / 60),
        "-i",
        destination,
        "-frames:v",
        "1",
        "-vf",
        "scale=720:-1",
        `${output}/studies-qa/${filename}`,
      ])
      samples.push({
        frame,
        time: frame / 60,
        url: `/exports/studies-qa/${filename}`,
        visualReview: "pending",
      })
    }
    const bytes = (await stat(destination)).size
    manifest.artifacts = manifest.artifacts.filter(
      (artifact) => artifact.id !== study.id,
    )
    manifest.artifacts.push({
      id: study.id,
      url: study.url,
      width: study.width,
      height: study.height,
      duration: 18,
      fps: 60,
      frames: 1080,
      bytes,
      sha256: createHash("sha256")
        .update(await readFile(destination))
        .digest("hex"),
      audio: "procedural-sfx-not-elevenlabs",
      voice: false,
      soundRmsDb: Number(sound.rmsDb.toFixed(2)),
      soundPeakDb: Number(sound.peakDb.toFixed(2)),
      elapsedSeconds: (Date.now() - started) / 1000,
    })
    manifest.qa = manifest.qa.filter((qa) => qa.id !== study.id)
    manifest.qa.push({
      id: study.id,
      technical: "passed",
      visual: "pending",
      samples,
    })
    await persist()
    console.log(
      `Verified ${study.id}: ${study.width}x${study.height}, 1080 frames, audio, ${bytes} bytes`,
    )
  }
  manifest.status = "rendered-needs-visual-review"
  await persist()
} catch (error) {
  manifest.status = cancelled ? "cancelled" : "failed"
  manifest.error = error.message
  await persist()
  throw error
}
