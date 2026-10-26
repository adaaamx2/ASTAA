import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile } from "node:fs/promises"
import ts from "typescript"

test("missing private index reports the actual pre-provider blocker without charging", async () => {
  const source = await readFile(
    new URL("../supabase/functions/server/audio-routes.tsx", import.meta.url),
    "utf8",
  )
  const provider = new URL(
    "../supabase/functions/server/audio-provider.mjs",
    import.meta.url,
  ).href
  const compiled = ts.transpileModule(
    source
      .replace('"./audio-provider.mjs"', JSON.stringify(provider))
      .replace(
        '"./storage.mjs"',
        JSON.stringify(
          new URL("../supabase/functions/server/storage.mjs", import.meta.url)
            .href,
        ),
      ),
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
  const previousDeno = globalThis.Deno,
    previousFetch = globalThis.fetch
  let providerCalls = 0
  globalThis.Deno = { env: { get: () => "fake-local-test-key" } }
  globalThis.fetch = async () => {
    providerCalls++
    throw new Error("Must not reach provider")
  }
  const routes = new Map()
  try {
    installAudioRoutes(
      {
        get() {},
        post: (path, handler) => routes.set(path, handler),
      },
      "/server",
      () => {
        throw new Error("Must stop before storage")
      },
      {
        get: async () => {
          throw new Error(
            "Could not find the table public.kv_store_4bc3557f in the schema cache",
          )
        },
      },
      async () => "cache-id",
    )
    const result = await routes.get("/server/studio/audio/generate")({
      req: {
        json: async () => ({
          kind: "voice",
          text: "Hola",
          voiceId: "sampleVoice",
        }),
      },
      set: () => {},
      get: () => "owner",
      json: (body, status = 200) => ({ body, status }),
    })
    assert.equal(result.status, 503)
    assert.equal(result.body.code, "audio_index_unavailable")
    assert.match(result.body.error, /Falta la tabla privada/)
    assert.equal(providerCalls, 0)
  } finally {
    globalThis.Deno = previousDeno
    globalThis.fetch = previousFetch
  }
})

test("voice previews use existing samples and metadata, never paid generation", async () => {
  const source = await readFile(
    new URL("../supabase/functions/server/audio-routes.tsx", import.meta.url),
    "utf8",
  )
  const provider = new URL(
    "../supabase/functions/server/audio-provider.mjs",
    import.meta.url,
  ).href
  const compiled = ts.transpileModule(
    source
      .replace('"./audio-provider.mjs"', JSON.stringify(provider))
      .replace(
        '"./storage.mjs"',
        JSON.stringify(
          new URL("../supabase/functions/server/storage.mjs", import.meta.url)
            .href,
        ),
      ),
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
  const previousDeno = globalThis.Deno,
    previousFetch = globalThis.fetch
  const calls = [],
    routes = new Map()
  globalThis.Deno = { env: { get: () => "fake-local-test-key" } }
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method || "GET" })
    assert.equal(init?.method || "GET", "GET")
    assert.ok(!String(url).includes("text-to-speech"))
    const voice = {
      voice_id: "sampleVoice",
      name: "Sample",
      labels: {},
      preview_url: "https://example.test/sample.mp3",
    }
    return Response.json(
      String(url).endsWith("/voices") ? { voices: [voice] } : voice,
    )
  }
  try {
    installAudioRoutes(
      { get: (path, handler) => routes.set(path, handler), post() {} },
      "/server",
      () => ({}),
      {},
      () => "",
    )
    const context = (id) => ({
      req: { param: () => id },
      get: () => undefined,
      json: (body, status = 200) => ({ body, status }),
    })
    const list = await routes.get("/server/studio/audio/voices")(context())
    assert.equal(
      list.body.voices[0].previewUrl,
      "https://example.test/sample.mp3",
    )
    const single = await routes.get("/server/studio/audio/voices/:id")(
      context("sampleVoice"),
    )
    assert.equal(single.body.voice.id, "sampleVoice")
    assert.equal(
      single.body.voice.previewUrl,
      "https://example.test/sample.mp3",
    )
    assert.equal(calls.length, 2)
    const invalid = await routes.get("/server/studio/audio/voices/:id")(
      context("sk_not-a-voice"),
    )
    assert.equal(invalid.status, 400)
    assert.equal(calls.length, 2)
  } finally {
    globalThis.Deno = previousDeno
    globalThis.fetch = previousFetch
  }
})
