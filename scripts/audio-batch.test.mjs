import { test } from "node:test"
import assert from "node:assert/strict"
import { runAudioBatch, AudioBatchError } from "../src/audio/batch.ts"

const initial = () => ({
  duration: 10,
  dictionary: "{}",
  voiceId: "sampleVoice",
  voiceName: "Sample",
  stability: 0.48,
  speed: 1,
  mood: "Warm instrumental",
  master: 1,
  normalize: false,
  strips: Object.fromEntries(
    ["voice", "sfx", "music"].map((k) => [
      k,
      { volume: 1, mute: false, solo: false, enabled: true },
    ]),
  ),
  clips: [
    {
      id: "seed",
      kind: "voice",
      start: 0,
      duration: 10,
      text: "Hola mundo",
      description: "Hola mundo",
    },
  ],
})
test("one batch generates all three tracks once; an unchanged second click spends nothing", async () => {
  const calls = [],
    stages = []
  const request = async (body, clip) => {
    calls.push(body.kind)
    return { ...clip, asset: body.kind, duration: 2 }
  }
  const state = await runAudioBatch(
    initial(),
    request,
    (s) => stages.push(s),
    () => {},
  )
  assert.deepEqual(calls, ["voice", "sfx", "music"])
  assert.equal(stages.length, 3)
  assert.equal(
    state.duration,
    10,
    "a shorter voice must not truncate the video",
  )
  assert.equal(state.clips.find((c) => c.kind === "music").duration, 10)
  await runAudioBatch(
    state,
    request,
    () => {},
    () => {},
  )
  assert.equal(calls.length, 3)
})
test("invalid music is rejected before paying for voice", async () => {
  let calls = 0
  await assert.rejects(() =>
    runAudioBatch(
      { ...initial(), mood: "" },
      async () => {
        calls++
      },
      () => {},
      () => {},
    ),
  )
  assert.equal(calls, 0)
})
test("changing sound design regenerates only SFX when explicitly running the batch", async () => {
  const calls = []
  const request = async (body, clip) => {
    calls.push(body.kind)
    return { ...clip, asset: body.kind, duration: 2 }
  }
  const state = await runAudioBatch(initial(), request, () => {}, () => {})
  calls.length = 0
  await runAudioBatch(
    { ...state, soundDesign: "Camera shutters and wooden chess moves" },
    request,
    () => {},
    () => {},
  )
  assert.deepEqual(calls, ["sfx"])
})
test("partial failure stops immediately and resumes without regenerating the completed voice", async () => {
  const calls = []
  let saved = initial()
  await assert.rejects(
    () =>
      runAudioBatch(
        saved,
        async (body, clip) => {
          calls.push(body.kind)
          if (body.kind === "sfx") throw new Error("Permission denied")
          return { ...clip, asset: "voice-ready", duration: 3 }
        },
        (s) => {
          saved = s
        },
        () => {},
      ),
    /Permission/,
  )
  assert.deepEqual(calls, ["voice", "sfx"])
  assert.equal(saved.clips.find((c) => c.kind === "voice").asset, "voice-ready")
  await runAudioBatch(
    saved,
    async (body, clip) => {
      calls.push(body.kind)
      return { ...clip, asset: body.kind, duration: 1 }
    },
    (s) => {
      saved = s
    },
    () => {},
  )
  assert.deepEqual(calls, ["voice", "sfx", "sfx", "music"])
})

test("SFX provider rejection does not prevent independently authorized music; no stage is retried", async () => {
  const calls = []
  let saved = initial()
  const failures = []
  await assert.rejects(
    runAudioBatch(
      saved,
      async (body, clip) => {
        calls.push(body.kind)
        if (body.kind === "sfx")
          throw Object.assign(new Error("SFX permission denied"), {
            code: "eleven_403",
            status: 403,
          })
        return { ...clip, asset: body.kind, duration: 3 }
      },
      (state) => {
        saved = state
      },
      () => {},
      { onFailure: (failure) => failures.push(failure) },
    ),
    (error) =>
      error instanceof AudioBatchError && error.failures[0].kind === "sfx",
  )
  assert.deepEqual(calls, ["voice", "sfx", "music"])
  assert.deepEqual(
    saved.clips.filter((clip) => clip.asset).map((clip) => clip.kind),
    ["voice", "music"],
  )
  assert.equal(failures[0].error.code, "eleven_403")
})

test("music-only has no dependency on Voice ID, dictionary or invalid SFX fields", async () => {
  const calls = []
  const state = await runAudioBatch(
    {
      ...initial(),
      voiceId: "",
      dictionary: "invalid-json",
      sfxStart: -1,
      sfxDuration: 90,
    },
    async (body, clip) => {
      calls.push(body.kind)
      return { ...clip, asset: "music-only", duration: 3 }
    },
    () => {},
    () => {},
    { only: "music" },
  )
  assert.deepEqual(calls, ["music"])
  assert.equal(
    state.clips.find((clip) => clip.kind === "music").asset,
    "music-only",
  )
  assert.equal(
    state.clips.find((clip) => clip.kind === "voice").text,
    "Hola mundo",
  )
})

test("quota, invalid owner session and uncertain provider results stop before spending on more stages", async () => {
  for (const code of [
    "eleven_402_quota",
    "eleven_401",
    "result_uncertain",
    "owner_not_authorized",
  ]) {
    const calls = []
    await assert.rejects(
      runAudioBatch(
        initial(),
        async (body, clip) => {
          calls.push(body.kind)
          if (body.kind === "sfx")
            throw Object.assign(new Error("Stop"), { code })
          return { ...clip, asset: body.kind, duration: 3 }
        },
        () => {},
        () => {},
      ),
      /Stop/,
    )
    assert.deepEqual(calls, ["voice", "sfx"])
  }
})

test("silent SFX is retained and reported as failure, never successful generation or an automatic paid retry", async () => {
  const calls = []
  let saved = initial()
  const request = async (body, clip) => {
    calls.push(body.kind)
    return {
      ...clip,
      asset: body.kind,
      duration: 3,
      silent: body.kind === "sfx",
    }
  }
  await assert.rejects(
    runAudioBatch(
      saved,
      request,
      (state) => {
        saved = state
      },
      () => {},
    ),
    AudioBatchError,
  )
  assert.deepEqual(calls, ["voice", "sfx", "music"])
  assert.equal(saved.clips.find((clip) => clip.kind === "sfx").silent, true)
  calls.length = 0
  await assert.rejects(
    runAudioBatch(
      saved,
      request,
      () => {},
      () => {},
      { only: "sfx" },
    ),
    /silencio/,
  )
  assert.deepEqual(calls, [])
})
