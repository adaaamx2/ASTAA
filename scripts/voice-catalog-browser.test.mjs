import assert from "node:assert/strict"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url),
  cli = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cli("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
const page = await browser.newPage({
  context: () => null,
  logLevel: "error",
  indent: false,
  pageIndex: 0,
  onBrowserLog: null,
  onLog: () => {},
})
const session = page._client()
let mode = "missing",
  catalogCalls = 0
const interceptedErrors = []
const headers = [
  { name: "Access-Control-Allow-Origin", value: "*" },
  {
    name: "Access-Control-Allow-Headers",
    value: "authorization, apikey, content-type",
  },
  { name: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
  { name: "Content-Type", value: "application/json" },
]
session.on("Fetch.requestPaused", (event) => {
  void (async () => {
    if (event.request.method === "OPTIONS") {
      await session.send("Fetch.fulfillRequest", {
        requestId: event.requestId,
        responseCode: 204,
        responseHeaders: headers,
        body: "",
      })
      return
    }
    if (mode === "network") {
      await session.send("Fetch.failRequest", {
        requestId: event.requestId,
        errorReason: "Failed",
      })
      return
    }
    const health = event.request.url.endsWith("/health")
    if (!health) catalogCalls++
    const body =
      mode === "missing"
        ? { code: "NOT_FOUND" }
        : health
          ? { status: "ok" }
          : {
              voices: [
                {
                  id: "test-spain",
                  name: "Prueba España",
                  labels: { language: "español", accent: "peninsular" },
                  previewUrl: null,
                },
                {
                  id: "test-latam",
                  name: "Prueba Latinoamérica",
                  labels: { language: "español", accent: "latinoamericano" },
                  previewUrl: null,
                },
              ],
            }
    await session.send("Fetch.fulfillRequest", {
      requestId: event.requestId,
      responseCode: mode === "missing" ? 404 : 200,
      responseHeaders: headers,
      body: Buffer.from(JSON.stringify(body)).toString("base64"),
    })
  })().catch((error) => interceptedErrors.push(error.message))
})
async function waitFor(test) {
  await page.evaluate(
    (test) =>
      new Promise((resolve, reject) => {
        const end = Date.now() + 15000
        function check() {
          if (new Function(`return (${test})`)()()) return resolve()
          if (Date.now() > end)
            return reject(Error("Voice UI condition timed out"))
          requestAnimationFrame(check)
        }
        check()
      }),
    test.toString(),
  )
}
async function retry() {
  await page.evaluate(() =>
    document.querySelector(".ml-field>span>button").click(),
  )
}
try {
  await session.send("Fetch.enable", {
    patterns: [
      { urlPattern: "*supabase.co/functions/v1/make-server-*/health" },
      { urlPattern: "*supabase.co/functions/v1/make-server-*/studio/*" },
    ],
  })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 8443}`,
    timeout: 30000,
  })
  await waitFor(() =>
    document
      .querySelector(".ml-error")
      ?.textContent.includes("pendiente de despliegue"),
  )
  assert.equal(catalogCalls, 0)
  assert.ok(
    await page.evaluate(
      () => document.querySelector("#ml-voice-picker").disabled,
    ),
  )
  assert.ok(
    await page.evaluate(() =>
      document
        .querySelector(".ml-error")
        .textContent.includes("No vuelvas a introducir la API key"),
    ),
  )
  assert.ok(
    !(await page.evaluate(() =>
      document
        .querySelector(".ml-error")
        .textContent.includes("Failed to fetch"),
    )),
  )
  mode = "healthy"
  await retry()
  await waitFor(
    () =>
      document.querySelector("#ml-voice-picker")?.options.length === 2 &&
      !document.querySelector("#ml-voice-picker").disabled,
  )
  assert.equal(
    await page.evaluate(() => document.querySelector("#ml-voice-picker").value),
    "test-spain",
  )
  await page.evaluate(() => {
    const select = document.querySelector("#ml-voice-picker")
    select.value = "test-latam"
    select.dispatchEvent(new Event("change", { bubbles: true }))
  })
  assert.equal(
    await page.evaluate(() => localStorage.getItem("yt-studio-voice")),
    "test-latam",
  )
  assert.ok(
    await page.evaluate(() => document.querySelector(".ml-generate").disabled),
  )
  mode = "network"
  await retry()
  await waitFor(() =>
    document.querySelector(".ml-error")?.textContent.includes("red o CORS"),
  )
  assert.ok(
    await page.evaluate(
      () => document.querySelector("#ml-voice-picker").disabled,
    ),
  )
  assert.ok(
    !(await page.evaluate(() =>
      document
        .querySelector(".ml-error")
        .textContent.includes("Failed to fetch"),
    )),
  )
  mode = "healthy"
  await retry()
  await waitFor(
    () =>
      document.querySelector("#ml-voice-picker")?.options.length === 2 &&
      !document.querySelector("#ml-voice-picker").disabled,
  )
  assert.equal(
    await page.evaluate(() => document.querySelector("#ml-voice-picker").value),
    "test-latam",
  )
  assert.deepEqual(interceptedErrors, [])
  console.log(
    "PASS (mocked Supabase only): missing deployment diagnosis, no catalog preflight on 404, successful voice selection, network failure clears stale voices, recovery preserves selection, anonymous billing remains disabled. No paid calls.",
  )
} finally {
  await browser.close({ silent: true })
}
