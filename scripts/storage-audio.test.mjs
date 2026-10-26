import assert from "node:assert/strict"
import { test } from "node:test"
import {
  uploadGeneratedAudio,
  storageFailure,
  verifyAudioStorage,
} from "../supabase/functions/server/storage.mjs"

test("free preflight checks both MIME types and signing, cleaning only its own probes", async () => {
  const uploaded = []
  let removed
  await verifyAudioStorage(
    {
      storage: {
        from: () => ({
          upload: async (path, bytes, options) => {
            uploaded.push({ path, options })
            return { error: null }
          },
          createSignedUrl: async (path) => {
            assert.equal(path, uploaded[0].path)
            return { error: null }
          },
          remove: async (paths) => {
            removed = paths
          },
        }),
      },
    },
    "audio",
    "user",
  )
  assert.deepEqual(
    uploaded.map((call) => call.options.contentType),
    ["audio/mpeg", "application/json"],
  )
  assert.deepEqual(
    removed,
    uploaded.map((call) => call.path),
  )
  assert.ok(removed.every((path) => path.startsWith("user/checks/")))
})

test("preflight write rejection stops immediately with a bounded operation diagnostic", async () => {
  let cleaned = false
  await assert.rejects(
    verifyAudioStorage(
      {
        storage: {
          from: () => ({
            upload: async () => ({ error: { statusCode: "403" } }),
            createSignedUrl: async () =>
              assert.fail("must stop on failed write"),
            remove: async () => {
              cleaned = true
            },
          }),
        },
      },
      "audio",
      "user",
    ),
    (error) =>
      error.code === "storage_permission_denied" &&
      error.operation === "preflight_audio_upload",
  )
  assert.equal(cleaned, true)
})

function storage(errors) {
  const calls = []
  return {
    calls,
    storage: {
      from: (bucket) => ({
        upload: async (path, bytes, options) => {
          calls.push({ bucket, path, bytes, options })
          const error = errors.shift()
          if (error instanceof Error) throw error
          return { error }
        },
      }),
    },
  }
}
test("transient upload failure retries the same bytes, never overwrites an existing file", async () => {
  const client = storage([{ statusCode: "503" }, null])
  const bytes = new Uint8Array([1, 2, 3])
  const delays = []
  await uploadGeneratedAudio(
    client,
    "audio",
    "user/hash.mp3",
    bytes,
    async (ms) => delays.push(ms),
  )
  assert.equal(client.calls.length, 2)
  assert.deepEqual(delays, [350])
  for (const call of client.calls) {
    assert.equal(call.bytes, bytes)
    assert.equal(call.path, "user/hash.mp3")
    assert.equal(call.options.upsert, false)
  }
})
test("an uncertain response followed by duplicate is a completed content-addressed upload", async () => {
  const client = storage([new Error("network lost"), { statusCode: "409" }])
  await uploadGeneratedAudio(
    client,
    "audio",
    "user/hash.mp3",
    new Uint8Array([1]),
    async () => {},
  )
  assert.equal(client.calls.length, 2)
})
test("permissions are not retried and exhausted transient failures report their operation", async () => {
  const denied = storage([{ status: 403 }])
  await assert.rejects(
    uploadGeneratedAudio(
      denied,
      "audio",
      "p",
      new Uint8Array(),
      async () => {},
    ),
    (error) => error.code === "storage_permission_denied",
  )
  assert.equal(denied.calls.length, 1)
  const down = storage(
    Array.from({ length: 3 }, () => ({
      status: 500,
      message: "sensitive provider body",
    })),
  )
  await assert.rejects(
    uploadGeneratedAudio(down, "audio", "p", new Uint8Array(), async () => {}),
    (error) =>
      error.operation === "generated_audio_upload" &&
      error.storageStatus === 500 &&
      !error.message.includes("sensitive"),
  )
  assert.equal(down.calls.length, 3)
})
test("generic failures expose safe diagnostics instead of the provider body", () => {
  const error = storageFailure(
    { statusCode: "400", message: "private details" },
    "bucket_read",
  )
  assert.match(error.message, /bucket_read.*400/)
  assert.equal(error.storageStatus, 400)
  assert.ok(!error.message.includes("private"))
})
