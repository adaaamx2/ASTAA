import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { studies } from "../src/motion-lab/studies.ts"
import { brandSpec, cue, ease, settle } from "../src/motion-lab/brand-spec.ts"

test("EDITING is retired without removing other video families", () => {
  assert.deepEqual(
    studies.map((study) => study.id),
    ["enbu", "blue-hour", "brand-strategy"],
  )
  const brand = studies.find((study) => study.id === "brand-strategy")
  assert.equal(brand.width, 1080)
  assert.equal(brand.height, 1920)
  assert.equal(brand.duration, 17.5)
})
test("the supplied repeated reference is the one being compared", async () => {
  const bytes = await readFile("public/references/brand-strategy-original.mp4")
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    brandSpec.referenceSha256,
  )
})
test("seven measured scenes cover the reference without extending its duration", () => {
  assert.equal(brandSpec.cuts.length, 8)
  assert.equal(brandSpec.cuts[0], 0)
  assert.equal(brandSpec.cuts.at(-1), 17.5)
  assert.equal(brandSpec.fps, 60)
  for (let i = 1; i < brandSpec.cuts.length; i++)
    assert.ok(brandSpec.cuts[i] > brandSpec.cuts[i - 1])
})
test("object entrances are smooth, bounded and never oscillate", () => {
  assert.equal(settle(-1), 0)
  assert.equal(settle(0), 0)
  let previous = 0
  for (let i = 0; i <= 1000; i++) {
    const value = settle(i / 100)
    assert.ok(value >= previous && value <= 1)
    previous = value
  }
  assert.equal(cue(4.2, 4.56), 0)
  assert.equal(cue(5.5, 4.56), 1)
  assert.equal(ease(-1), 0)
  assert.equal(ease(2), 1)
})
