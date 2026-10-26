import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile } from "node:fs/promises"
import {
  AudioError,
  callProvider,
  generateAudio,
  validateAudio,
  wordsFromCharacters,
} from "../supabase/functions/server/audio-provider.mjs"
import { studioSession } from "../supabase/functions/server/authorization.mjs"
import ts from "typescript"
import { createHash } from "node:crypto"

test("owner authorization rejects absent, anonymous and user-editable claims", () => {
  assert.equal(studioSession(null).authenticated, false)
  assert.equal(
    studioSession({ id: "a", user_metadata: { studio_owner: true } })
      .authorized,
    false,
  )
  assert.equal(
    studioSession({
      id: "a",
      is_anonymous: true,
      app_metadata: { studio_owner: true },
    }).authorized,
    false,
  )
  assert.equal(studioSession({ id: "a" }, "a").authorized, true)
})
test("empty key never calls the provider; invalid keys produce actionable Spanish without echoing bodies", async () => {
  let calls = 0
  await assert.rejects(
    () =>
      callProvider("", "voices", undefined, () => {
        calls++
      }),
    (e) => e.code === "missing_key" && /Guarda/.test(e.message),
  )
  await assert.rejects(
    () =>
      callProvider(
        "test-only-not-a-real-key",
        "voices",
        undefined,
        async () => {
          calls++
          return new Response(
            JSON.stringify({
              detail: {
                code: "invalid_api_key",
                message: "private-provider-body",
              },
            }),
            { status: 401 },
          )
        },
      ),
    (e) =>
      /Clave inválida/.test(e.message) &&
      !e.message.includes("private-provider-body"),
  )
  assert.equal(calls, 1)
})
test("quota, permissions and temporary errors do not cause duplicate billable requests", async () => {
  for (const [status, code, pattern] of [
    [403, "missing_permissions", /permiso/],
    [401, "quota_exceeded", /Recarga/],
    [429, "rate_limit_exceeded", /Espera/],
    [503, "unavailable", /historial/],
  ]) {
    let calls = 0
    await assert.rejects(
      () =>
        callProvider("fixture", "music", {}, async () => {
          calls++
          return new Response(JSON.stringify({ detail: { code } }), { status })
        }),
      (e) => pattern.test(e.message),
    )
    assert.equal(calls, 1)
  }
})
test("new requests are independent; dictionary and bounds are validated before generation", () => {
  const config = validateAudio({
    kind: "voice",
    text: "YT explica",
    voiceId: "voice-id",
    dictionary: { YT: "YouTube" },
  })
  assert.equal(config.text, "YouTube explica")
  assert.throws(
    () => validateAudio({ kind: "music", text: "mood", duration: 2 }),
    AudioError,
  )
  assert.throws(
    () =>
      validateAudio({ kind: "voice", text: "x".repeat(5001), voiceId: "id" }),
    AudioError,
  )
  assert.equal(
    validateAudio({ kind: "sfx", text: "click", duration: 0.5 }).kind,
    "sfx",
  )
})
test("music is explicitly instrumental and voice uses timestamp API", async () => {
  let path, payload
  const fetcher = async (url, init) => {
    path = url
    payload = JSON.parse(init.body)
    return new Response(new Uint8Array([1, 2, 3]))
  }
  await generateAudio(
    "fixture",
    validateAudio({ kind: "music", text: "calm", duration: 3 }),
    fetcher,
  )
  assert.match(path, /\/v1\/music\?/)
  assert.equal(payload.force_instrumental, true)
  assert.equal(payload.music_length_ms, 3000)
  const voice = await generateAudio(
    "fixture",
    validateAudio({ kind: "voice", text: "Hola", voiceId: "id" }),
    async (url) => {
      assert.match(url, /with-timestamps/)
      return new Response(
        JSON.stringify({
          audio_base64: "AQID",
          alignment: {
            characters: ["H", "o", "l", "a"],
            character_start_times_seconds: [0, 0.1, 0.2, 0.3],
            character_end_times_seconds: [0.1, 0.2, 0.3, 0.4],
          },
        }),
      )
    },
  )
  assert.equal(voice.words[0].text, "Hola")
  assert.equal(wordsFromCharacters(null).length, 0)
})
test("server gate precedes application routes and old paid route is removed", async () => {
  const source = await readFile(
    new URL("../supabase/functions/server/app.ts", import.meta.url),
    "utf8",
  )
  assert.ok(
    source.indexOf("app.use(`${prefix}/*`") <
      source.indexOf("installAudioRoutes(app"),
  )
  assert.ok(
    source.indexOf("app.use(`${prefix}/*`") <
      source.indexOf("app.get(`${prefix}/studio/session`"),
  )
  assert.ok(!source.includes("app.post(`${prefix}/studio/generate`"))
  assert.ok(source.includes('c.set("ownerId", user.id)'))
})

test("Make function slug, CORS headers and private audio routes stay wired together", async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8")
  const [source, api, config] = await Promise.all([
    read("../supabase/functions/server/app.ts"),
    read("../src/motion-lab/api.ts"),
    read("../supabase/config.toml"),
  ])
  const slug = api.match(/functions\/v1\/([^/]+)\/studio/)?.[1]
  assert.ok(slug)
  assert.ok(config.includes(`[functions.${slug}]`))
  assert.ok(source.includes(`"/${slug}"`))
  assert.ok(source.includes('"apikey"'))
  assert.ok(
    source.includes("installAudioRoutes(app, prefix, admin, kv, digest)"),
  )
  assert.ok(source.includes("auth.getUser(token)"))
  assert.ok(source.includes("if (!user || !state.authorized)"))
  const entry = await read("../supabase/functions/server/index.tsx")
  assert.ok(
    entry.includes('import app from "./app.ts"') ||
      (entry.includes('import studioApp from "./app.ts"') &&
        entry.includes('app.route("/", studioApp)')),
  )
  assert.ok(entry.includes("Deno.serve(app.fetch)"))
})

test("route recovers pending paid bytes after storage failure without paying twice", async () => {
  const source = await readFile(
    new URL("../supabase/functions/server/audio-routes.tsx", import.meta.url),
    "utf8",
  )
  const provider = new URL(
    "../supabase/functions/server/audio-provider.mjs",
    import.meta.url,
  ).href
  const storageModule = new URL(
    "../supabase/functions/server/storage.mjs",
    import.meta.url,
  ).href
  const compiled = ts.transpileModule(
    source
      .replace('"./audio-provider.mjs"', JSON.stringify(provider))
      .replace('"./storage.mjs"', JSON.stringify(storageModule)),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText
  const { installAudioRoutes } = await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  )
  const originalFetch = globalThis.fetch,
    originalDeno = globalThis.Deno
  const store = new Map(),
    routes = new Map()
  let paid = 0,
    uploadFails = true
  globalThis.Deno = { env: { get: () => "fixture-not-real" } }
  globalThis.fetch = async () => {
    paid++
    return new Response(
      JSON.stringify({ audio_base64: "AQID", alignment: null }),
    )
  }
  const bucket = {
    upload: async (path) => ({
      error:
        uploadFails && !path.includes("/checks/")
          ? { status: 403, message: "storage offline" }
          : null,
    }),
    createSignedUrl: async () => ({
      data: { signedUrl: "https://audio.example.test/cached.mp3" },
      error: null,
    }),
  }
  const admin = () => ({
    storage: {
      getBucket: async () => ({ data: { id: "exists" } }),
      from: () => bucket,
    },
    from: () => ({
      insert: async (record) => {
        if (store.has(record.key)) return { error: { code: "23505" } }
        store.set(record.key, record.value)
        return { error: null }
      },
    }),
  })
  const kv = {
    get: async (key) => store.get(key),
    set: async (key, value) => store.set(key, value),
    del: async (key) => store.delete(key),
  }
  const app = {
    get: (path, fn) => routes.set(path, fn),
    post: (path, fn) => routes.set(path, fn),
  }
  try {
    installAudioRoutes(app, "/server", admin, kv, (value) =>
      createHash("sha256").update(JSON.stringify(value)).digest("hex"),
    )
    const request = {
      req: {
        json: async () => ({ kind: "voice", text: "Hola", voiceId: "id" }),
      },
      set: () => {},
      get: () => "owner",
      json: (body, status = 200) => ({ body, status }),
    }
    const handler = routes.get("/server/studio/audio/generate")
    const first = await handler(request)
    assert.equal(first.status, 200)
    assert.equal(first.body.persistencePending, true)
    assert.ok(first.body.url.startsWith("data:audio/mpeg;base64,"))
    assert.equal(paid, 1)
    uploadFails = false
    const recovered = await handler(request)
    assert.equal(recovered.status, 200)
    assert.equal(recovered.body.cacheHit, true)
    assert.ok(recovered.body.url.startsWith("https:"))
    const cached = await handler(request)
    assert.equal(cached.body.cacheHit, true)
    assert.equal(paid, 1)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.Deno = originalDeno
  }
})
