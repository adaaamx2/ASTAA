import assert from "node:assert/strict"
import { test } from "node:test"
import { Hono } from "hono"
import { installVoiceLabRoutes } from "../supabase/functions/server/voice-lab-routes.mjs"
import { AudioError } from "../supabase/functions/server/audio-provider.mjs"

test("private voice library persists takes/uploads across clients without duplicate billing or modifying old projects", async () => {
  const rows = new Map(),
    files = new Map()
  const canary = {
    id: "untouched",
    text: "Original script",
    tracks: { music: "existing-track" },
  }
  rows.set("studio:project:owner:untouched", structuredClone(canary))
  const kv = {
    get: async (key) => structuredClone(rows.get(key)),
    set: async (key, value) => rows.set(key, structuredClone(value)),
    del: async (key) => rows.delete(key),
    getByPrefix: async (prefix) =>
      [...rows]
        .filter(([key]) => key.startsWith(prefix))
        .map(([, value]) => structuredClone(value)),
  }
  let generations = 0,
    alignmentCalls = 0,
    failSecond = false,
    uploadFails = false
  const admin = () => ({
    from: () => ({
      insert: async ({ key, value }) => {
        if (rows.has(key)) return { error: { code: "23505" } }
        rows.set(key, structuredClone(value))
        return { error: null }
      },
      update: ({ value }) => {
        const where = {}
        const query = {
          eq: (key, expected) => {
            where[key] = expected
            return query
          },
          select: async () => {
            if (
              String(rows.get(where.key)?.revision) !==
              where["value->>revision"]
            )
              return { data: [], error: null }
            rows.set(where.key, structuredClone(value))
            return { data: [{ key: where.key }], error: null }
          },
        }
        return query
      },
    }),
    storage: {
      getBucket: async () => ({ data: { public: false }, error: null }),
      from: () => ({
        upload: async (path, bytes) => {
          if (uploadFails) return { error: { status: 403 } }
          files.set(path, bytes)
          return { error: null }
        },
        download: async (path) => ({
          data: new Blob([files.get(path)]),
          error: null,
        }),
        createSignedUrl: async (path) => ({
          data: { signedUrl: `https://private.test/${path}` },
          error: null,
        }),
      }),
    },
  })
  const make = () => {
    const app = new Hono()
    app.use("*", async (c, next) => {
      if (!c.req.header("test-owner")) return c.json({ error: "Sign in" }, 401)
      c.set("ownerId", c.req.header("test-owner"))
      await next()
    })
    installVoiceLabRoutes(app, "", admin, kv, {
      key: () => "fixture-not-a-real-key",
      generate: async (key, job, take) => {
        generations++
        if (take === 1 && failSecond)
          throw new AudioError(403, "eleven_403", "Permission denied")
        return {
          bytes: new Uint8Array([1, 2, 3]),
          base64: btoa("ID3audio-fixture"),
          duration: 1,
          words: [{ text: "Hola.", start: 0, end: 1 }],
        }
      },
      fetcher: async (url, options) => {
        alignmentCalls++
        assert.match(url, /forced-alignment$/)
        assert.ok(options.body instanceof FormData)
        return Response.json({
          words: [{ text: "Subido.", start: 0.2, end: 0.8 }],
        })
      },
    })
    return app
  }
  let app = make()
  const request = (path, body, owner = "owner", method) =>
    app.request("/studio/voice-lab" + path, {
      method: method || (body === undefined ? "GET" : "POST"),
      headers: {
        "test-owner": owner,
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      ...(body === undefined
        ? {}
        : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    })
  assert.equal((await request("/bootstrap", undefined, "")).status, 401)
  const character = await (
    await request("/characters", { name: "Mi personaje", voiceId: "voice" })
  ).json()
  const characterId = character.character.id
  const newJob = async () => {
    const jobId = crypto.randomUUID()
    const response = await request("/jobs", {
      jobId,
      voiceId: "voice",
      characterId,
      script: "Hola.",
      taggedScript: "[excited] Hola.",
      name: "Toma privada",
    })
    assert.equal(response.status, 200)
    return jobId
  }
  const jobId = await newJob()
  const first = await (await request(`/jobs/${jobId}/takes/0`, {})).json()
  const second = await (await request(`/jobs/${jobId}/takes/1`, {})).json()
  assert.notEqual(first.audio.id, second.audio.id)
  assert.equal(generations, 2)
  app = make() // A fresh server/client recovers the same durable library.
  const library = await (await request("/bootstrap")).json()
  assert.equal(library.audio.length, 2)
  assert.equal(library.characters[0].name, "Mi personaje")
  const cache = await (await request(`/jobs/${jobId}/takes/0`, {})).json()
  assert.equal(cache.cacheHit, true)
  assert.equal(generations, 2)
  assert.equal(
    (await request(`/audio/${first.audio.id}`, undefined, "other-owner"))
      .status,
    404,
  )
  assert.equal(
    (await request("/bootstrap", undefined, "other-owner")).status,
    200,
  )
  assert.deepEqual(
    (await (await request("/bootstrap", undefined, "other-owner")).json())
      .audio,
    [],
  )

  const upload = new FormData()
  upload.set(
    "file",
    new File(
      [new TextEncoder().encode("RIFF0000WAVEfixture")],
      "original.wav",
      { type: "audio/wav" },
    ),
  )
  upload.set("script", "Subido.")
  upload.set("duration", "1")
  upload.set("kind", "audio")
  const uploaded = await (await request("/upload", upload)).json()
  assert.equal(uploaded.record.origin, "uploaded")
  assert.equal(uploaded.record.words.length, 0)
  assert.equal(generations, 2)
  assert.equal(
    (await request(`/audio/${uploaded.record.id}/align`, { script: "Subido." }))
      .status,
    400,
  )
  assert.equal(alignmentCalls, 0)
  const aligned = await (
    await request(`/audio/${uploaded.record.id}/align`, {
      script: "Subido.",
      authorized: true,
    })
  ).json()
  assert.equal(aligned.audio.timingSource, "forced-alignment")
  await request(`/audio/${uploaded.record.id}/align`, {
    script: "Subido.",
    authorized: true,
  })
  assert.equal(alignmentCalls, 1)
  const project = await (
    await request("/projects", {
      characterId,
      audioId: uploaded.record.id,
      title: "Nuevo vídeo",
      scenes: [],
      sfx: "Paper swish",
      music: "Piano",
    })
  ).json()
  assert.equal(project.project.words[0].start, 0.2)
  assert.equal(project.project.duration, 1)
  assert.equal(
    (await request("/projects", { ...project.project, revision: 0 })).status,
    409,
  )

  failSecond = true
  const partialId = await newJob()
  const kept = await (await request(`/jobs/${partialId}/takes/0`, {})).json()
  assert.equal((await request(`/jobs/${partialId}/takes/1`, {})).status, 403)
  const beforeRecover = generations
  assert.equal((await request(`/jobs/${partialId}/takes/1`)).status, 409)
  assert.equal(generations, beforeRecover)
  assert.equal((await request(`/audio/${kept.audio.id}`)).status, 200)

  uploadFails = true
  const pendingId = await newJob()
  const pending = await (await request(`/jobs/${pendingId}/takes/0`, {})).json()
  assert.equal(pending.audio.persistencePending, true)
  const paid = generations
  uploadFails = false
  const recovered = await (await request(`/jobs/${pendingId}/takes/0`)).json()
  assert.equal(recovered.audio.id, pending.audio.id)
  assert.equal(generations, paid)
  assert.deepEqual(rows.get("studio:project:owner:untouched"), canary)
})
