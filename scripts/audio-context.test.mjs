import assert from "node:assert/strict"
import { test } from "node:test"
import { sfxDuration, sfxPrompt } from "../src/audio/sound-design.ts"
import { audioCaptionWords } from "../src/audio/caption-timeline.ts"

test("default SFX covers the video and incorporates visual actions and script", () => {
  const state = {
    duration: 17.5,
    soundDesign:
      "Chess queen landing at 5 seconds, camera shutter and timeline clicks",
    drafts: { voice: "Build trust and convert attention into action." },
    clips: [],
  }
  assert.equal(sfxDuration(state), 17.5)
  const prompt = sfxPrompt(state)
  assert.match(prompt, /queen landing/)
  assert.match(prompt, /Build trust/)
  assert.match(prompt, /Throughout 17.5s/)
  assert.ok(prompt.length <= 450)
  assert.equal(sfxDuration({ ...state, duration: 80 }), 30)
  assert.equal(
    sfxPrompt({ ...state, drafts: { sfx: "My custom effect" } }),
    "My custom effect",
  )
  assert.equal(sfxDuration({ ...state, sfxDuration: 1 }), 1)
})

test("captions use the actual batch narration even without per-scene IDs or alignment", () => {
  const state = {
    clips: [
      {
        kind: "voice",
        asset: "actual-voice",
        start: 2,
        duration: 3,
        text: "Actual edited narration.",
        description: "Actual edited narration.",
      },
    ],
  }
  const words = audioCaptionWords(state, [])
  assert.equal(
    words.map((word) => word.text).join(" "),
    "Actual edited narration.",
  )
  assert.equal(words[0].start, 2)
  assert.equal(words.at(-1).end, 5)
  assert.ok(words.every((word) => word.source === "estimated"))
  state.clips[0].words = [{ text: "Aligned", start: 0.2, end: 0.8 }]
  const aligned = audioCaptionWords(state, [])
  assert.equal(aligned[0].start, 2.2)
  assert.equal(aligned[0].end, 2.8)
  assert.equal(aligned[0].source, "provider-character-alignment")
})
