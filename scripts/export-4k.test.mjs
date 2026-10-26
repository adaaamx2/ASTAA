import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { mp4Metadata } from "../src/media/mp4-metadata.ts"
import {
  uhdDimensions,
  uhdSegments,
  uhdVideoFilter,
} from "../src/media/export-4k-plan.ts"

test("4K output respects orientation and does not crop the original", () => {
  assert.deepEqual(uhdDimensions(1080, 1920), { width: 2160, height: 3840 })
  assert.deepEqual(uhdDimensions(1920, 1080), { width: 3840, height: 2160 })
  assert.deepEqual(uhdDimensions(1920, 1292), { width: 3840, height: 2160 })
  assert.throws(() => uhdDimensions(0, 1))
  const filter = uhdVideoFilter(2160, 3840, 2)
  assert.match(filter, /fps=60/)
  assert.match(filter, /force_original_aspect_ratio=decrease/)
  assert.match(filter, /pad=2160:3840/)
  assert.ok(!filter.includes("crop="))
})

test("reads real MP4 dimensions and sample-table fps, rejects incomplete files", () => {
  const bytes = readFileSync("public/exports/study-brand-strategy.mp4")
  const metadata = mp4Metadata(bytes)
  assert.equal(metadata.width, 1080)
  assert.equal(metadata.height, 1920)
  assert.equal(metadata.fps, 60)
  assert.equal(metadata.duration, 17.5)
  assert.throws(() => mp4Metadata(bytes.subarray(0, bytes.length - 100)))
  assert.throws(() => mp4Metadata(new Uint8Array([1, 2, 3])))
})

test("bounded segments preserve every 60fps frame without boundary losses", () => {
  for (const duration of [0.1, 1, 2, 2.1, 17.5, 18.1]) {
    const segments = uhdSegments(duration)
    assert.equal(
      segments.reduce((sum, segment) => sum + segment.frames, 0),
      Math.ceil(duration * 60),
    )
    assert.equal(segments[0].start, 0)
    for (let index = 1; index < segments.length; index++)
      assert.ok(
        Math.abs(
          segments[index].start -
            (segments[index - 1].start + segments[index - 1].duration),
        ) < 0.00001,
      )
    assert.ok(
      segments.every((segment) => segment.frames > 0 && segment.frames <= 120),
    )
  }
  for (const duration of [NaN, 0, -1, 601])
    assert.throws(() => uhdSegments(duration))
})

test("4K is an isolated component and encoder, not a change to the working export handlers", () => {
  const component = readFileSync("src/media/Export4kButton.tsx", "utf8")
  const encoder = readFileSync("src/media/export-4k.ts", "utf8")
  assert.ok(!component.includes("mixMp4("))
  assert.ok(!encoder.includes("mixMp4("))
  assert.ok(component.includes("currentExportCaptions(projectId)"))
  assert.ok(component.includes("tracksForExport(state)"))
  assert.ok(encoder.includes("new FFmpeg()"))
  assert.ok(encoder.includes("mp4Metadata(bytes)"))
})
