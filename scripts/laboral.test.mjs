import assert from "node:assert/strict"
import { test } from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { laboralPlan } from "../src/motion-lab/laboral-plan.ts"
import { studies } from "../src/motion-lab/studies.ts"
import { sfxPrompt } from "../src/audio/sound-design.ts"
import { mp4Metadata } from "../src/media/mp4-metadata.ts"

test("Laboral Clothing is horizontal, Spanish, 18 seconds and separate from the existing studies", () => {
  const study = studies.find((item) => item.id === "laboral-clothing")
  assert.ok(study)
  assert.equal(study.width, 1920)
  assert.equal(study.height, 1080)
  assert.equal(study.duration, 18)
  assert.equal(study.narration, laboralPlan.narration)
  assert.match(study.narration, /Ropa de trabajo/)
  assert.equal(laboralPlan.identityStatus, "logo-provided")
  assert.equal(study.url, laboralPlan.renderUrl)
  assert.equal(study.url, "/exports/study-laboral-clothing-v2.mp4")
  assert.equal(laboralPlan.scenes[0].start, 0)
  assert.equal(laboralPlan.scenes.at(-1).end, 18)
  laboralPlan.scenes.forEach((scene, index) => {
    assert.ok(scene.end > scene.start)
    if (index) assert.equal(scene.start, laboralPlan.scenes[index - 1].end)
  })
  for (const id of ["enbu", "blue-hour", "brand-strategy"])
    assert.ok(studies.some((item) => item.id === id))
})
test("music and SFX are prepared as prompts, not generated or presented as brand products", () => {
  assert.match(laboralPlan.music, /105 BPM/)
  assert.match(laboralPlan.music, /sin voces/i)
  assert.ok(laboralPlan.sfx.length <= 450)
  const prompt = sfxPrompt({
    duration: 18,
    soundDesign: laboralPlan.sfx,
    drafts: { voice: laboralPlan.narration },
    clips: [],
  })
  assert.ok(prompt.length <= 450)
  for (const path of Object.values(laboralPlan.clips)) assert.ok(existsSync(`public${path}`))
  assert.ok(existsSync(`public${laboralPlan.logo}`))
  const credits = JSON.parse(
    readFileSync("public/references/laboral-clothing/workwear/credits.json", "utf8"),
  )
  assert.equal(credits.clips.length, 5)
  assert.match(credits.note, /no es catálogo/)
})
test("native rendered MP4 confirms horizontal 1080p, 60fps and no generated audio", () => {
  const path = `public${laboralPlan.renderUrl}`
  assert.ok(existsSync(path), "Run node scripts/render-laboral.mjs first")
  const metadata = mp4Metadata(readFileSync(path))
  assert.equal(metadata.width, 1920)
  assert.equal(metadata.height, 1080)
  assert.equal(metadata.fps, 60)
  assert.equal(metadata.duration, 18)
  assert.equal(metadata.hasAudio, false)
  const manifest = JSON.parse(
    readFileSync("public/exports/studies.json", "utf8"),
  )
  const artifact = manifest.artifacts.find(
    (item) => item.id === "laboral-clothing",
  )
  assert.equal(artifact.frames, 1080)
  assert.equal(artifact.voice, false)
  assert.equal(artifact.url, laboralPlan.renderUrl)
})
