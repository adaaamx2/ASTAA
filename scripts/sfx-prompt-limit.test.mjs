import assert from "node:assert/strict"
import { test } from "node:test"
import {
  SFX_TEXT_LIMIT,
  compactSfxText,
  validateAudio,
  generateAudio,
  callProvider,
} from "../supabase/functions/server/audio-provider.mjs"
import { sfxPrompt } from "../src/audio/sound-design.ts"
import { studies } from "../src/motion-lab/studies.ts"

test("BRAND STRATEGY prompt fits 450 characters while retaining all scene cues", () => {
  const study = studies.find((study) => study.id === "brand-strategy")
  const prompt = sfxPrompt({
    duration: 17.5,
    soundDesign: study.sfx,
    drafts: { voice: study.narration },
    clips: [],
  })
  assert.ok(
    prompt.length <= SFX_TEXT_LIMIT,
    `SFX prompt length: ${prompt.length}`,
  )
  for (const cue of ["chess", "camera", "arrow", "editing", "logo"])
    assert.ok(prompt.includes(cue), `Missing ${cue}`)
})

test("old long drafts are compacted before requesting SFX, with the same rule in client and server", async () => {
  const oldDraft =
    "Paper swish, wooden chess pieces, camera shutter, editing clicks. ".repeat(
      25,
    )
  const clientText = sfxPrompt({ drafts: { sfx: oldDraft }, clips: [] })
  const config = validateAudio({ kind: "sfx", text: oldDraft, duration: 17.5 })
  assert.equal(config.text, clientText)
  assert.ok(config.text.length <= 450)
  let calls = 0
  const result = await generateAudio(
    "test-not-a-real-key",
    config,
    async (url, init) => {
      calls++
      const body = JSON.parse(init.body)
      assert.match(url, /\/sound-generation\?output_format=mp3_44100_128$/)
      assert.ok(body.text.length <= 450)
      assert.equal(body.duration_seconds, 17.5)
      assert.equal(body.model_id, "eleven_text_to_sound_v2")
      return new Response(new Uint8Array([1, 2, 3]))
    },
  )
  assert.equal(calls, 1)
  assert.equal(result.bytes.length, 3)
  assert.equal(compactSfxText(config.text), config.text)
})

test("provider 400 is an explicit rejection, not an uncertain result; private body is never exposed", async () => {
  let calls = 0
  await assert.rejects(
    callProvider("test-not-a-real-key", "sound-generation", {}, async () => {
      calls++
      return Response.json(
        {
          detail: {
            status: "text_too_long",
            message: "Private input value, maximum 450 characters",
          },
        },
        { status: 400 },
      )
    }),
    (error) =>
      error.status === 400 &&
      error.code === "eleven_400_text_too_long" &&
      /450/.test(error.message) &&
      !error.message.includes("Private input"),
  )
  assert.equal(calls, 1)
  await assert.rejects(
    callProvider("test-not-a-real-key", "sound-generation", {}, async () =>
      Response.json({ detail: "private details unrelated to length" }, {
        status: 400,
      }),
    ),
    (error) =>
      error.code === "eleven_400" &&
      /rechazó/.test(error.message) &&
      !/temporalmente incierto/.test(error.message),
  )
})

test("music and voice text normalization and cache revisions are not changed by the SFX fix", () => {
  for (const config of [
    { kind: "voice", text: "Existing narration. ".repeat(40), voiceId: "existingVoice" },
    { kind: "music", text: "Existing instrumental mood. ".repeat(25), duration: 17.5 },
  ]) {
    const normalized = validateAudio(config)
    assert.equal(normalized.text, config.text.trim())
    assert.ok(normalized.text.length > 450)
    assert.equal(normalized.revision, 1)
  }
})
