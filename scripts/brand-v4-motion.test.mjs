import { test } from "node:test"
import assert from "node:assert/strict"
import {
  chapters,
  sceneBlend,
  living,
  cubicPoint,
  shotCamera,
} from "../src/motion-lab/brand-motion-v4.ts"
import { brandSpec } from "../src/motion-lab/brand-spec.ts"

test("v4 preserves seven chapters, project duration and 60fps export", () => {
  assert.equal(brandSpec.version, 4)
  assert.equal(chapters.length, 7)
  assert.deepEqual(
    chapters.map((chapter) => chapter.start),
    brandSpec.cuts.slice(0, -1),
  )
  assert.equal(chapters.at(-1).end, brandSpec.duration)
  assert.equal(brandSpec.fps, 60)
})
test("every shot has continuous foreground camera and lighting motion", () => {
  for (const chapter of chapters) {
    const a = living(chapter.start + 0.4, chapter.start)
    const b = living(chapter.start + 0.7, chapter.start)
    assert.notEqual(a.x, b.x)
    assert.notEqual(a.push, b.push)
    assert.notEqual(a.light, b.light)
    assert.ok(Object.values(a).every(Number.isFinite))
  }
})
test("chapter compositing remains bounded and never leaves the film empty", () => {
  for (let frame = 0; frame < 1050; frame++) {
    const time = frame / 60
    const values = chapters.map((chapter) =>
      sceneBlend(time, chapter.start, chapter.end),
    )
    assert.ok(values.every((value) => value >= 0 && value <= 1))
    assert.ok(Math.max(...values) > 0.35, `Empty blend at ${time}`)
  }
})
test("the strategic trajectory is a continuous bounded curve", () => {
  assert.deepEqual(cubicPoint(0), { x: 180, y: 1510 })
  assert.deepEqual(cubicPoint(1), { x: 905, y: 1250 })
  for (let i = 0; i <= 100; i++) {
    const point = cubicPoint(i / 100)
    assert.ok(point.x >= 180 && point.x <= 905)
    assert.ok(point.y >= 1200 && point.y <= 1510)
  }
})
test("directed shot cameras stay finite, bounded and continuous at 60fps", () => {
  chapters.forEach((chapter, index) => {
    let previous = shotCamera(chapter.start, index)
    for (let time = chapter.start; time <= chapter.end; time += 1 / 60) {
      const camera = shotCamera(time, index)
      assert.ok(Object.values(camera).every(Number.isFinite))
      assert.ok(camera.scale >= 0.965 && camera.scale <= 1.035)
      assert.ok(Math.abs(camera.x - previous.x) < 2)
      assert.ok(Math.abs(camera.scale - previous.scale) < 0.004)
      previous = camera
    }
  })
})
