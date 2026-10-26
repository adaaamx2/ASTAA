import assert from "node:assert/strict"
import { test } from "node:test"
import { smooth, scenePose, shotPresentation, transitionKind, TRANSITION_SECONDS, EDITORIAL_FPS } from "../src/motion-lab/editorial-motion.ts"
import { editorialScenes } from "../src/motion-lab/editorial-timeline.ts"
test("motion is clamped, monotonic, and C2 at transition endpoints", () => {
  assert.equal(smooth(-1), 0)
  assert.equal(smooth(2), 1)
  let previous = 0
  for (let i = 0; i <= 1000; i++) {
    const value = smooth(i / 1000)
    assert.ok(value >= previous && value <= 1)
    previous = value
  }
  const h = .00001
  assert.ok(smooth(h) / h < .0001)
  assert.ok((1 - smooth(1 - h)) / h < .0001)
  assert.ok(Math.abs((smooth(2 * h) - 2 * smooth(h)) / h ** 2) < .01)
})
for (const [id, scenes] of Object.entries(editorialScenes)) {
  test(`${id}: adjacent shots use the same continuous transition clock`, () => {
    for (let index = 0; index < scenes.length - 1; index++) {
      const a = scenes[index], b = scenes[index + 1]
      assert.equal(a.end, b.start)
      for (let frame = 1; frame < TRANSITION_SECONDS * EDITORIAL_FPS; frame++) {
        const time = a.end - TRANSITION_SECONDS / 2 + frame / EDITORIAL_FPS
        const old = scenePose(time, a.start, a.end)
        const next = scenePose(time, b.start, b.end)
        assert.ok(old.visible && next.visible)
        assert.ok(Math.abs((old.x + 1080) - next.x) < .000001)
        assert.ok(Number.isFinite(old.blur) && Number.isFinite(next.blur))
        const oldFrame = shotPresentation(id, index, old)
        const newFrame = shotPresentation(id, index + 1, next)
        for (const frame of [oldFrame, newFrame]) {
          assert.ok([frame.x, frame.y, frame.scale, frame.rotation, frame.opacity].every(Number.isFinite))
          assert.ok(frame.opacity >= 0 && frame.opacity <= 1 && frame.scale > .5)
        }
        const kind = transitionKind(id, index)
        if (kind === "pan") assert.ok(Math.abs(oldFrame.x + 1080 - newFrame.x) < .000001)
        if (kind === "vertical") assert.ok(Math.abs(oldFrame.y + 1920 - newFrame.y) < .000001)
      }
    }
  })
  test(`${id}: stable scene IDs and positive reviewable shot lengths`, () => {
    assert.equal(scenes[0].start, 0)
    for (const scene of scenes) {
      assert.ok(scene.end - scene.start > TRANSITION_SECONDS)
      assert.ok(scene.title && scene.detail)
    }
  })
}
test("the editorial cut is not one repeated slide transition", () => {
  const kinds = new Set(Object.entries(editorialScenes).flatMap(([id, scenes]) => scenes.slice(0, -1).map((_, index) => transitionKind(id, index))))
  assert.equal(kinds.size, 6)
})
test("the final shot holds through the last frame instead of cutting its title in half", () => {
  for (const [id, scenes] of Object.entries(editorialScenes)) {
    const index = scenes.length - 1, scene = scenes[index]
    const pose = scenePose(scene.end - 1 / EDITORIAL_FPS, scene.start, scene.end, true)
    const frame = shotPresentation(id, index, pose)
    assert.equal(pose.outgoing, 0)
    assert.equal(frame.x, 0)
    assert.equal(frame.y, 0)
    assert.equal(frame.opacity, 1)
  }
})
