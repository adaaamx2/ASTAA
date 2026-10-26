import { execFileSync } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import assert from "node:assert/strict"

const blender = process.env.BLENDER_BIN || "blender"
const all = ["bust", "king", "queen", "target", "camera", "clock", "phone", "laptop", "eye", "foil", "flowers"]
const only = process.argv.find((value) => value.startsWith("--only="))?.slice(7).split(",")
const names = only || all
assert.ok(names.every((name) => all.includes(name)), "Unknown editorial asset")
await mkdir(".production/editorial-generation", { recursive: true })
// Isolate masters in separate, sequential processes; no denoiser memory spikes.
// Never run two Blender processes concurrently.
for (const name of names) {
  console.log(`Generating original studio master: ${name}`)
  try {
    const log = execFileSync(blender, [
      "-b", "-t", "4", "--python-exit-code", "1",
      "-P", "scripts/generate-editorial-assets.py",
      "--", "--only", name, "--size", "1600", "--samples", "48",
    ], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
    await writeFile(`.production/editorial-generation/${name}.log`, log)
    const bytes = await readFile(`public/references/editorial-generated-v2/${name}.png`)
    assert.equal(bytes.readUInt32BE(16), 1600)
    assert.equal(bytes.readUInt32BE(20), 1600)
    console.log(`Generated and verified ${name}: ${bytes.length} bytes`)
  } catch (error) {
    if (error.stdout) await writeFile(`.production/editorial-generation/${name}.failed.log`, error.stdout)
    throw new Error(`Asset ${name} failed (${error.signal || error.status || error.message}). See .production/editorial-generation/${name}.failed.log.`)
  }
}
