import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import assert from "node:assert/strict"

const names = ["bust", "king", "queen", "target", "camera", "clock", "phone", "laptop", "eye", "foil", "flowers"]
const directory = "public/references/editorial-generated-v2"
const assets = []
for (const name of names) {
  const bytes = await readFile(`${directory}/${name}.png`)
  assert.equal(bytes.subarray(1, 4).toString(), "PNG")
  assert.equal(bytes.readUInt32BE(16), 1600, `${name} is not the high-resolution master`)
  assert.equal(bytes.readUInt32BE(20), 1600)
  assert.equal(bytes[25], 6, `${name} has no RGBA transparency`)
  assets.push({
    name, width: 1600, height: 1600, bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    provenance: name === "bust" ? "new-studio-render-CC0-Poly-Haven-Rico-Cilliers-marble-bust-geometry" : "original-procedural-geometry-and-studio-render",
  })
}
const manifest = {
  version: 2, renderer: "Blender 4.3.2 / Cycles / AgX / 48 samples",
  script: "scripts/generate-editorial-assets.py",
  attribution: "assets/editorial-models/ATTRIBUTION.md",
  containsReferenceVideoPixels: false,
  assets,
}
await writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n")
console.log(`Verified ${assets.length} high-resolution RGBA masters; provenance manifest written.`)
