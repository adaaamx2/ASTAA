import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile } from "node:fs/promises"
import ts from "typescript"
import { Hono } from "hono"

test("audio route handles Supabase 400 missing bucket, generates once and recovers cached bytes", async () => {
  const oldDeno = globalThis.Deno
  const oldFetch = globalThis.fetch
  globalThis.Deno = { env: { get: () => "test-key-not-a-real-secret" } }
  let paidCalls = 0
  // Regression test only: no real provider request or credit consumption.
  globalThis.fetch = async () => {
    paidCalls++
    return Response.json({ audio_base64: btoa("test-audio-bytes") })
  }
  try {
    let source = await readFile(
      new URL("../supabase/functions/server/audio-routes.tsx", import.meta.url),
      "utf8",
    )
    for (const name of ["audio-provider", "storage"])
      source = source.replace(
        `"./${name}.mjs"`,
        JSON.stringify(
          new URL(`../supabase/functions/server/${name}.mjs`, import.meta.url)
            .href,
        ),
      )
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
    const { installAudioRoutes } = await import(
      `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
    )
    const rows = new Map()
    let created = 0
    let uploadError = null
    let signedError = null
    let bucketError = { status: 400, message: "Bucket not found" }
    const client = {
      from: () => ({
        insert: async ({ key, value }) => {
          if (rows.has(key)) return { error: { code: "23505" } }
          rows.set(key, value)
          return { error: null }
        },
      }),
      storage: {
        getBucket: async () => ({ data: null, error: bucketError }),
        createBucket: async () => {
          created++
          return { error: null }
        },
        from: () => ({
          upload: async () => ({ error: uploadError }),
          createSignedUrl: async () => ({
            data: { signedUrl: "https://storage.test/audio.mp3" },
            error: signedError,
          }),
          remove: async () => ({ error: null }),
        }),
      },
    }
    const app = new Hono()
    app.use("*", async (c, next) => {
      c.set("ownerId", "owner")
      await next()
    })
    installAudioRoutes(
      app,
      "",
      () => client,
      {
        get: async (key) => rows.get(key),
        set: async (key, value) => rows.set(key, value),
        del: async (key) => rows.delete(key),
      },
      async () => "hash",
    )
    const request = () =>
      app.request("/studio/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "voice",
          text: "Prueba",
          voiceId: "voice123",
        }),
      })
    const first = await request()
    assert.equal(first.status, 200)
    assert.equal((await first.json()).cacheHit, false)
    assert.equal(created, 1)
    assert.equal(paidCalls, 1)
    const cached = await request()
    assert.equal(cached.status, 200)
    assert.equal((await cached.json()).cacheHit, true)
    assert.equal(paidCalls, 1)

    rows.clear()
    bucketError = { status: 403, message: "private details" }
    const denied = await request()
    assert.equal(denied.status, 503)
    const diagnostic = await denied.json()
    assert.equal(diagnostic.code, "storage_permission_denied")
    assert.equal(diagnostic.operation, "bucket_read")
    assert.equal(paidCalls, 1, "no provider call when bucket access fails")
    assert.ok(!JSON.stringify(diagnostic).includes("private details"))

    bucketError = { statusCode: "404" }
    uploadError = { statusCode: "403" }
    const writeDenied = await request()
    assert.equal(writeDenied.status, 503)
    assert.equal((await writeDenied.json()).operation, "preflight_audio_upload")
    assert.equal(paidCalls, 1, "real write preflight must stop before provider")

    uploadError = null
    const preflight = await app.request("/studio/audio/preflight", {
      method: "POST",
    })
    assert.equal(preflight.status, 200)
    assert.equal((await preflight.json()).ready, true)
    assert.equal(paidCalls, 1, "preflight is always free")

    // An index entry may exist while signing failed after a previous upload.
    // Pending bytes must remain recoverable instead of being shadowed by cache.
    rows.set("audio:v2:owner:hash", { id: "hash", path: "owner/hash.mp3" })
    rows.set("audio:v2:owner:hash:pending", {
      record: { id: "hash", path: "owner/hash.mp3" },
      base64: btoa("previous-paid-bytes"),
    })
    signedError = { status: 503 }
    const pending = await request()
    assert.equal(pending.status, 200)
    const recovered = await pending.json()
    assert.equal(recovered.persistencePending, true)
    assert.equal(atob(recovered.url.split(",")[1]), "previous-paid-bytes")
    assert.equal(paidCalls, 1, "pending recovery must not call provider")
  } finally {
    globalThis.Deno = oldDeno
    globalThis.fetch = oldFetch
  }
})
