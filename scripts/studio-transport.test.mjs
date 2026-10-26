import assert from "node:assert/strict"
import { test } from "node:test"
import {
  checkStudioConnection,
  requestStudio,
  StudioRequestError,
  checkAudioStorage,
  requestGeneration,
} from "../src/motion-lab/transport.ts"

const endpoint = {
  url: "https://example.supabase.co/functions/v1/make-server-test/studio",
  publicKey: "public-test-key",
}
test("obsolete audio backend is diagnosed before any paid request", async () => {
  const calls = []
  await assert.rejects(
    requestStudio(endpoint, "/audio/preflight", {
      body: {},
      fetcher: async (url) => {
        calls.push(url)
        return new Response("404 Not Found", { status: 404 })
      },
    }),
    (error) =>
      error.code === "audio_backend_outdated" &&
      /proyecto conectado/.test(error.message),
  )
  assert.equal(calls.length, 1)
  assert.ok(!calls[0].endsWith("/generate"))
})
test("missing Edge Function is diagnosed before catalog preflight, without asking for a new API key", async () => {
  const calls = []
  await assert.rejects(
    () =>
      requestStudio(endpoint, "/voices", {
        fetcher: async (url, init) => {
          calls.push({ url, init })
          return new Response(JSON.stringify({ code: "NOT_FOUND" }), {
            status: 404,
          })
        },
      }),
    (error) =>
      error instanceof StudioRequestError &&
      error.kind === "deployment" &&
      error.status === 404 &&
      /ajustes de Make/.test(error.message) &&
      !/Failed to fetch/.test(error.message),
  )
  assert.equal(calls.length, 1)
  assert.ok(calls[0].url.endsWith("/health"))
  assert.equal(calls[0].init.headers, undefined)
  assert.equal(calls[0].init.credentials, "omit")
})
test("a structured Storage 404 is never disguised as missing deployment", async () => {
  const calls = []
  await assert.rejects(
    requestGeneration(endpoint, {
      body: { voiceId: "approved", text: "Hola" },
      fetcher: async (url) => {
        calls.push(url)
        return new Response(
          JSON.stringify({
            error: "No se encuentra el archivo de Storage.",
            code: "storage_object_missing",
            operation: "preflight_signed_url",
          }),
          { status: 404 },
        )
      },
    }),
    (error) =>
      error.kind === "response" &&
      error.code === "storage_object_missing" &&
      error.operation === "preflight_signed_url",
  )
  assert.equal(calls.length, 1)
})
test("missing optional route uses an inline free check, followed by exactly one authorized generation", async () => {
  const calls = []
  const body = { voiceId: "approved", text: "Hola", authorizedCharacters: 4 }
  const result = await requestGeneration(endpoint, {
    body,
    fetcher: async (url, init) => {
      const sent = JSON.parse(init.body)
      calls.push({ url, sent })
      if (url.endsWith("/storage-check"))
        return new Response("404 Not Found", { status: 404 })
      if (sent.operation === "storage-check") {
        assert.equal(sent.voiceId, undefined)
        assert.equal(sent.text, undefined)
        assert.equal(sent.authorizedCharacters, undefined)
        return new Response(JSON.stringify({ ready: true }))
      }
      assert.deepEqual(sent, body)
      return new Response(JSON.stringify({ voice: { id: "audio" } }))
    },
  })
  assert.equal(result.voice.id, "audio")
  assert.equal(calls.length, 3)
  assert.equal(calls.filter((call) => call.sent.voiceId).length, 1)
})
test("legacy validation rejection keeps the original generation route usable without retrying it", async () => {
  let paid = 0
  const result = await requestGeneration(endpoint, {
    body: { voiceId: "approved", text: "Hola" },
    fetcher: async (url, init) => {
      if (url.endsWith("/storage-check"))
        return new Response(JSON.stringify({ code: "NOT_FOUND" }), {
          status: 404,
        })
      const sent = JSON.parse(init.body)
      if (sent.operation)
        return new Response(
          JSON.stringify({ error: "Elige una voz válida." }),
          { status: 400 },
        )
      paid++
      return new Response(JSON.stringify({ voice: { id: "legacy-audio" } }))
    },
  })
  assert.equal(paid, 1)
  assert.equal(result.voice.id, "legacy-audio")
})
test("free compatibility diagnosis itself never sends a billable payload", async () => {
  let requests = 0
  const result = await checkAudioStorage(endpoint, {
    // Even an accidental billable body passed by a caller is replaced.
    body: { text: "Must not send", voiceId: "approved" },
    fetcher: async (url, init) => {
      requests++
      const sent = JSON.parse(init.body)
      assert.equal(sent.text, undefined)
      assert.equal(sent.voiceId, undefined)
      return url.endsWith("/storage-check")
        ? new Response("404 Not Found", { status: 404 })
        : new Response(JSON.stringify({ error: "Voz no válida." }), {
            status: 400,
          })
    },
  })
  assert.equal(result.mode, "legacy")
  assert.equal(requests, 2)
})
test("permission, transport, malformed and real Storage failures never fall through to generation", async () => {
  for (const response of [
    () => new Response(JSON.stringify({ error: "Denied" }), { status: 403 }),
    () =>
      new Response(
        JSON.stringify({
          error: "Storage failed",
          code: "storage_operation_failed",
        }),
        { status: 502 },
      ),
    () =>
      new Response(
        JSON.stringify({
          error: "MIME rejected",
          code: "storage_operation_failed",
        }),
        { status: 400 },
      ),
    () => new Response("<html>Upstream unavailable</html>", { status: 502 }),
    () => {
      throw new TypeError("Network error")
    },
  ]) {
    let requests = 0
    await assert.rejects(
      requestGeneration(endpoint, {
        body: { voiceId: "approved", text: "Hola" },
        fetcher: async () => {
          requests++
          return response()
        },
      }),
    )
    assert.equal(requests, 1)
  }
})
test("a 404 or lost response on the paid request is never retried through another route", async () => {
  for (const fail of [
    () =>
      new Response(
        JSON.stringify({
          error: "Audio missing",
          code: "storage_object_missing",
        }),
        { status: 404 },
      ),
    () => {
      throw new TypeError("Network lost")
    },
  ]) {
    let paid = 0
    await assert.rejects(
      requestGeneration(endpoint, {
        body: { voiceId: "approved", text: "Hola" },
        fetcher: async (url) => {
          if (url.endsWith("/storage-check"))
            return new Response(JSON.stringify({ ready: true }))
          paid++
          return fail()
        },
      }),
    )
    assert.equal(paid, 1)
  }
})
test("a protected health check is allowed; actual catalog request retains public authorization", async () => {
  const calls = []
  const result = await requestStudio(endpoint, "/voices", {
    fetcher: async (url, init) => {
      calls.push(url)
      if (url.endsWith("/health")) return new Response("", { status: 401 })
      assert.equal(init.headers.Authorization, "Bearer public-test-key")
      return new Response(
        JSON.stringify({
          voices: [{ id: "real-shaped-id", name: "Catalog voice", labels: {} }],
        }),
      )
    },
  })
  assert.equal(result.voices.length, 1)
  assert.equal(calls.length, 2)
})
test("network/CORS failure never reaches the UI as raw Failed to fetch", async () => {
  await assert.rejects(
    () =>
      checkStudioConnection(endpoint, {
        fetcher: async () => {
          throw new TypeError("Failed to fetch")
        },
      }),
    (error) =>
      error.kind === "connection" &&
      /red o CORS/.test(error.message) &&
      !/Failed to fetch/.test(error.message),
  )
})
test("old deployed backend with missing studio routes receives the deployment diagnosis", async () => {
  await assert.rejects(
    () =>
      requestStudio(endpoint, "/voices", {
        fetcher: async (url) =>
          url.endsWith("/health")
            ? new Response("{}")
            : new Response("404 Not Found", { status: 404 }),
      }),
    (error) => error.kind === "deployment",
  )
})
test("paid operations never retry after transport uncertainty", async () => {
  let calls = 0
  await assert.rejects(
    () =>
      requestStudio(endpoint, "/generate", {
        body: { preview: true },
        token: "session-test-token",
        fetcher: async (url, init) => {
          calls++
          assert.equal(init.headers.Authorization, "Bearer session-test-token")
          assert.ok(url.endsWith("/generate"))
          throw new TypeError("Failed to fetch")
        },
      }),
    (error) =>
      error.kind === "connection" &&
      /confirmar el resultado/.test(error.message),
  )
  assert.equal(calls, 1)
})
test("session preflight failure diagnoses a missing function without replaying the session", async () => {
  const calls = []
  await assert.rejects(
    () =>
      requestStudio(endpoint, "/session", {
        token: "session-test-token",
        fetcher: async (url, init) => {
          calls.push(url)
          if (url.endsWith("/session")) throw new TypeError("Failed to fetch")
          assert.ok(url.endsWith("/health"))
          assert.equal(init.headers, undefined)
          return new Response('{"code":"NOT_FOUND"}', { status: 404 })
        },
      }),
    (error) => error.kind === "deployment" && error.status === 404,
  )
  assert.equal(calls.length, 2)
  assert.equal(calls.filter((url) => url.endsWith("/session")).length, 1)
})
test("caller cancellation remains cancellation, rather than becoming a user-visible connection error", async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    () =>
      checkStudioConnection(endpoint, {
        signal: controller.signal,
        fetcher: async () => {
          throw new DOMException("Aborted", "AbortError")
        },
      }),
    (error) => error.name === "AbortError",
  )
})
test("malformed responses are diagnosed without returning the raw body", async () => {
  await assert.rejects(
    () =>
      requestStudio(endpoint, "/generate", {
        body: {},
        fetcher: async () => new Response("<html>private upstream text</html>"),
      }),
    (error) =>
      error.kind === "response" && !error.message.includes("private upstream"),
  )
})
test("server authorization errors are not mislabeled as an ElevenLabs credential failure", async () => {
  await assert.rejects(
    () =>
      requestStudio(endpoint, "/generate", {
        body: {},
        fetcher: async () =>
          new Response(
            JSON.stringify({ error: "Sesión de propietario requerida." }),
            { status: 403 },
          ),
      }),
    (error) =>
      error.kind === "authorization" &&
      error.message === "Sesión de propietario requerida.",
  )
})
test("storage diagnostics survive transport without exposing raw provider bodies", async () => {
  await assert.rejects(
    requestStudio(endpoint, "/storage-check", {
      body: {},
      fetcher: async () =>
        new Response(
          JSON.stringify({
            error: "No se ha confirmado preflight_audio_upload (HTTP 400).",
            code: "storage_operation_failed",
            operation: "preflight_audio_upload",
            storageStatus: 400,
          }),
          { status: 502 },
        ),
    }),
    (error) =>
      error.code === "storage_operation_failed" &&
      error.operation === "preflight_audio_upload" &&
      error.storageStatus === 400,
  )
})
