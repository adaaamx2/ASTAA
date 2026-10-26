import assert from "node:assert/strict"
import { test } from "node:test"
import {
  generateAudio,
  validateAudio,
} from "../supabase/functions/server/audio-provider.mjs"

test("malformed successful provider responses are not misreported as Storage failures or retried", async () => {
  const config = validateAudio({
    kind: "voice",
    voiceId: "testVoice",
    text: "Hola",
  })
  for (const [body, code] of [
    ["not-json", "eleven_invalid_response"],
    ["null", "empty_audio"],
    [JSON.stringify({ audio_base64: "%%%" }), "eleven_invalid_audio"],
    [JSON.stringify({ audio_base64: "" }), "empty_audio"],
  ]) {
    let calls = 0
    await assert.rejects(
      generateAudio("local-test-not-real", config, async () => {
        calls++
        return new Response(body)
      }),
      (error) => error.code === code,
    )
    assert.equal(calls, 1)
  }
})
