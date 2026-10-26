import assert from "node:assert/strict"
import { test } from "node:test"
import {
  persistPendingAudio,
  deliverGeneratedAudio,
} from "../supabase/functions/server/pending-audio.mjs"

test("a Storage outage and a fresh request reuse durable audio without generating again", async () => {
  const values = new Map()
  const store = {
    get: async (key) => structuredClone(values.get(key)),
    set: async (key, value) => values.set(key, structuredClone(value)),
    remove: async (key) => values.delete(key),
  }
  let paidCalls = 0
  const generate = async () => {
    paidCalls++
    return {
      base64: "SUQz",
      record: { id: "same-audio", words: [{ text: "Hola", start: 0, end: 1 }] },
    }
  }
  await assert.rejects(
    persistPendingAudio(store, "asset", generate, async () => {
      throw new Error("Storage unavailable")
    }),
    /Storage unavailable/,
  )
  assert.equal(paidCalls, 1)
  assert.ok(values.has("asset:pending"))
  const result = await persistPendingAudio(
    store,
    "asset",
    generate,
    async (pending) => {
      assert.equal(pending.base64, "SUQz")
      assert.deepEqual(pending.record.words, [
        { text: "Hola", start: 0, end: 1 },
      ])
      return pending.record
    },
  )
  assert.equal(paidCalls, 1)
  assert.equal(result.recovered, true)
  assert.equal(result.record.id, "same-audio")
  assert.equal(values.has("asset:pending"), false)
})

test("after generation, a Storage failure still delivers identical playable bytes and captions", async () => {
  const record = {
    id: "voice",
    sha256: "same-hash",
    words: [{ text: "Hola", start: 0, end: 1 }],
  }
  const delivered = await deliverGeneratedAudio(record, "SUQz", async () => {
    throw new Error("private provider details")
  })
  assert.equal(delivered.url, "data:audio/mpeg;base64,SUQz")
  assert.equal(delivered.persistencePending, true)
  assert.equal(delivered.sha256, record.sha256)
  assert.deepEqual(delivered.words, record.words)
  assert.ok(!JSON.stringify(delivered).includes("private"))
})

test("successful persistence keeps the hosted URL unchanged", async () => {
  const hosted = {
    id: "voice",
    url: "https://storage.test/voice.mp3",
    cacheHit: false,
  }
  assert.equal(
    await deliverGeneratedAudio({ id: "voice" }, "SUQz", async () => hosted),
    hosted,
  )
})

test("uncertain provider failures never produce a fabricated recoverable result", async () => {
  let saved = false
  await assert.rejects(
    persistPendingAudio(
      {
        get: async () => null,
        set: async () => {
          saved = true
        },
      },
      "asset",
      async () => {
        throw new Error("uncertain provider")
      },
      async () => {
        assert.fail("must not persist a nonexistent result")
      },
    ),
    /uncertain provider/,
  )
  assert.equal(saved, false)
})
