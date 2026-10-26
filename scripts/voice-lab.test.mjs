import assert from "node:assert/strict"
import { test } from "node:test"
import {
  autoTag,
  spokenText,
  prepareScenes,
  timelineWords,
} from "../src/voice-lab/model.ts"
import {
  validateVoiceJob,
  generateVoiceTake,
  alignedWords,
  uploadedType,
} from "../supabase/functions/server/voice-lab-provider.mjs"

test("auto-tag is local, editable and preserves every spoken word", () => {
  const script = "Hola, este es mi personaje. ¡Hoy empieza una historia!"
  const tagged = autoTag(script, "cercano")
  assert.match(tagged, /\[playful\]/)
  assert.match(tagged, /\[excited\]/)
  assert.equal(spokenText(tagged), spokenText(script))
  assert.equal(
    autoTag("[whispering] Hola.", "entusiasta"),
    "[whispering] Hola.",
  )
})
test("two takes are two separate v3 requests with distinct seeds, not two fictitious variants", async () => {
  const config = validateVoiceJob({
    jobId: crypto.randomUUID(),
    voiceId: "exampleVoice",
    script: "Hola.",
    taggedScript: "[excited] Hola.",
  })
  const job = { ...config, seeds: [10, 20] }
  const calls = []
  const fetcher = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    return Response.json({
      audio_base64: btoa("ID3fixture-not-real"),
      normalized_alignment: {
        characters: ["H", "o", "l", "a", "."],
        character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4],
        character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5],
      },
    })
  }
  for (const take of [0, 1]) {
    const result = await generateVoiceTake("test-fixture", job, take, fetcher)
    assert.equal(result.words[0].text, "Hola.")
    assert.equal(result.duration, 0.5)
  }
  assert.equal(calls.length, 2)
  assert.deepEqual(
    calls.map((call) => call.body.seed),
    [10, 20],
  )
  assert.ok(calls.every((call) => call.body.model_id === "eleven_v3"))
  assert.ok(calls.every((call) => call.url.includes("/with-timestamps?")))
  assert.throws(
    () => validateVoiceJob({ ...config, taggedScript: "Texto diferente" }),
    /palabras/,
  )
})
test("audio tags are not captions and uploaded audio is explicitly estimated before alignment", () => {
  const tagged = "[laughing] Hola"
  const starts = [...tagged].map((_, index) =>
    index < 11 ? 0 : (index - 11) * 0.1,
  )
  const result = alignedWords({
    characters: [...tagged],
    character_start_times_seconds: starts,
    character_end_times_seconds: starts.map((time) => time + 0.1),
  })
  assert.equal(result[0].text, "Hola")
  const words = timelineWords({
    script: "Mi guion original.",
    duration: 6,
    words: [],
  })
  assert.equal(words[0].start, 0)
  assert.equal(words.at(-1).end, 6)
  const scenes = prepareScenes(words)
  assert.equal(scenes[0].text, "Mi guion original.")
  assert.equal(scenes[0].end, 6)
})
test("uploads are classified by content, not a filename or claimed MIME", () => {
  const wav = new TextEncoder().encode("RIFF0000WAVEfixture")
  assert.deepEqual(uploadedType(wav), ["audio/wav", "wav"])
  assert.throws(
    () => uploadedType(new TextEncoder().encode("<html>not audio</html>")),
    /válido/,
  )
  assert.throws(
    () => uploadedType(new TextEncoder().encode("<svg onload='bad'/>"), true),
    /PNG/,
  )
})
