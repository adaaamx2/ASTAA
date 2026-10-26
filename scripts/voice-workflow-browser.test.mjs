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
const client = page._client(),
  base = `http://localhost:${process.env.PORT || 8443}`
const uid = "11111111-1111-4111-8111-111111111111"
let permitted = false,
  generations = 0,
  lookups = 0
let fixtureGeneration = null
const failures = []
const wave = Buffer.alloc(44 + 8000 * 4 * 2)
wave.write("RIFF", 0)
wave.writeUInt32LE(wave.length - 8, 4)
wave.write("WAVEfmt ", 8)
wave.writeUInt32LE(16, 16)
wave.writeUInt16LE(1, 20)
wave.writeUInt16LE(1, 22)
wave.writeUInt32LE(8000, 24)
wave.writeUInt32LE(16000, 28)
wave.writeUInt16LE(2, 32)
wave.writeUInt16LE(16, 34)
wave.write("data", 36)
wave.writeUInt32LE(wave.length - 44, 40)
const headers = [
  { name: "Access-Control-Allow-Origin", value: "*" },
  {
    name: "Access-Control-Allow-Headers",
    value: "authorization,apikey,content-type",
  },
  { name: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
  { name: "Content-Type", value: "application/json" },
]
function voice(id) {
  return {
    id,
    name: id === "manual-castilian" ? "Voz por ID" : "Voz de cuenta",
    labels: {
      language: "español",
      accent: id === "manual-castilian" ? "peninsular" : "mexicano",
    },
    previewUrl: `${base}/studio-test-audio.wav?preview=${id}`,
  }
}
client.on("Fetch.requestPaused", (event) => {
  void (async () => {
    const url = new URL(event.request.url)
    async function reply(data, status = 200) {
      await client.send("Fetch.fulfillRequest", {
        requestId: event.requestId,
        responseCode: status,
        responseHeaders: headers,
        body: Buffer.from(JSON.stringify(data)).toString("base64"),
      })
    }
    if (url.pathname === "/studio-test-audio.wav") {
      const range = Object.entries(event.request.headers).find(
        ([name]) => name.toLowerCase() === "range",
      )?.[1]
      const match = range?.match(/^bytes=(\d+)-(\d*)$/)
      const start = match ? Number(match[1]) : 0
      const end = match?.[2]
        ? Math.min(wave.length - 1, Number(match[2]))
        : wave.length - 1
      const bytes = wave.subarray(start, end + 1)
      await client.send("Fetch.fulfillRequest", {
        requestId: event.requestId,
        responseCode: match ? 206 : 200,
        responseHeaders: [
          { name: "Content-Type", value: "audio/wav" },
          { name: "Access-Control-Allow-Origin", value: "*" },
          { name: "Accept-Ranges", value: "bytes" },
          { name: "Content-Length", value: String(bytes.length) },
          ...(match
            ? [
                {
                  name: "Content-Range",
                  value: `bytes ${start}-${end}/${wave.length}`,
                },
              ]
            : []),
        ],
        body: bytes.toString("base64"),
      })
      return
    }
    if (event.request.method === "OPTIONS") {
      await client.send("Fetch.fulfillRequest", {
        requestId: event.requestId,
        responseCode: 204,
        responseHeaders: headers,
        body: "",
      })
      return
    }
    if (url.pathname.endsWith("/health")) return reply({ status: "ok" })
    if (url.pathname.endsWith("/auth/v1/token"))
      return reply({ access_token: "fixture-owner-session" })
    if (url.pathname.endsWith("/studio/session"))
      return reply({
        authenticated: true,
        authorized: permitted,
        userId: uid,
        reason: permitted ? "authorized" : "owner_not_authorized",
        message: permitted
          ? "Cuenta autorizada."
          : "Tu sesión existe, pero falta autorizar esta cuenta.",
      })
    if (url.pathname.endsWith("/studio/voices"))
      return reply({ voices: [voice("account-latam")] })
    if (url.pathname.endsWith("/studio/projects"))
      return reply({ projects: [] })
    if (url.pathname.endsWith("/studio/projects/enbu"))
      return reply({
        project: {
          id: "enbu",
          revision: 1,
          settings: {},
          tracks: { sfx: "existing-sfx" },
          renders: { master: "existing-render" },
          generation: fixtureGeneration,
        },
      })
    if (url.pathname.includes("/studio/voices/")) {
      lookups++
      return reply({
        voice: voice(decodeURIComponent(url.pathname.split("/").at(-1))),
      })
    }
    if (url.pathname.endsWith("/studio/generate")) {
      const body = JSON.parse(event.request.postData)
      if (body.operation === "storage-check") return reply({ ready: true })
      generations++
      assert.ok(
        permitted,
        "Anonymous or unapproved generation request escaped the UI guard",
      )
      assert.equal(body.voiceId, "manual-castilian")
      const tokens = body.text.trim().split(/\s+/),
        weights = tokens.map((_, i) => 1 + (i % 3)),
        total = weights.reduce((s, w) => s + w, 0)
      let t = 0.05
      const words = tokens.map((text, i) => {
        const start = t
        t += (3.7 * weights[i]) / total
        return {
          text,
          start,
          end: t,
          source: "provider-character-alignment",
          sceneId: 0,
        }
      })
      fixtureGeneration = {
        voice: {
          id: "fixture-audio",
          url: `${base}/studio-test-audio.wav?voice=1`,
          words,
          timingSource: "provider-character-alignment",
          cacheHit: false,
          billedCharacters: body.text.length,
        },
        sfx: null,
        text: body.text,
        timingSource: "provider-character-alignment",
        status: "generated-needs-listening",
      }
      return reply(fixtureGeneration)
    }
    if (url.pathname.endsWith("/studio/storage-check"))
      return reply({ ready: true })
    throw Error(`Unexpected fixture route ${url.pathname}`)
  })().catch((e) => failures.push(e.message))
})
async function wait(fn) {
  await page.evaluate(
    (source) =>
      new Promise((resolve, reject) => {
        const deadline = Date.now() + 20000
        const predicate = new Function(`return (${source})`)()
        function tick() {
          if (predicate()) return resolve()
          if (Date.now() > deadline)
            return reject(Error("Workflow UI condition timed out"))
          requestAnimationFrame(tick)
        }
        tick()
      }),
    fn.toString(),
  )
}
async function fill(selector, value) {
  await page.evaluate(
    (selector, value) => {
      const input = document.querySelector(selector)
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set.call(input, value)
      input.dispatchEvent(new Event("input", { bubbles: true }))
      return new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )
    },
    selector,
    value,
  )
}
try {
  await client.send("Fetch.enable", {
    patterns: [
      { urlPattern: "*supabase.co/functions/v1/make-server-*/*" },
      { urlPattern: "*supabase.co/auth/v1/token*" },
      { urlPattern: "*studio-test-audio.wav*" },
    ],
  })
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 })
  await page.goto({ url: `${base}/#video/enbu`, timeout: 30000 })
  await wait(
    () =>
      document.querySelector("#ml-voice-picker")?.options.length === 1 &&
      !document.querySelector("#ml-voice-picker").disabled,
  )
  await page.evaluate(() => {
    const b = document.querySelector(".ml-play")
    if (b.getAttribute("aria-label") === "Pausar estudio") b.click()
    document.querySelector(".ml-voice-id").open = true
  })
  await fill(".ml-voice-id input", "manual-castilian")
  await page.evaluate(() =>
    document.querySelector(".ml-voice-id form").requestSubmit(),
  )
  await wait(
    () =>
      document.querySelector("#ml-voice-picker")?.value === "manual-castilian",
  )
  assert.equal(lookups, 1)
  assert.equal(generations, 0)
  await page.evaluate(async () => {
    const audio = document.querySelector(".ml-catalog-sample audio")
    audio.muted = true
    await audio.play()
  })
  assert.equal(generations, 0, "Free sample playback must not generate TTS")
  await page.evaluate(() => {
    ;[...document.querySelectorAll("button")]
      .find((button) => button.textContent.trim() === "Nube y cuenta")
      .click()
  })
  await wait(() => Boolean(document.querySelector(".ml-session")))
  await page.evaluate(() => {
    document.querySelector(".ml-session").open = true
  })
  await fill(".ml-session input[type=email]", "owner@example.test")
  await fill(".ml-session input[type=password]", "fixture-password")
  await page.evaluate(() =>
    document.querySelector(".ml-session form").requestSubmit(),
  )
  await wait(() =>
    document
      .querySelector(".ml-owner-status textarea")
      ?.value.includes("raw_app_meta_data"),
  )
  assert.ok(
    await page.evaluate(() =>
      document
        .querySelector(".ml-owner-status textarea")
        .value.includes("11111111-1111-4111-8111-111111111111"),
    ),
  )
  assert.ok(
    await page.evaluate(() => document.querySelector(".ml-generate").disabled),
  )
  await page.evaluate(() => document.querySelector(".ml-generate").click())
  assert.equal(generations, 0)
  permitted = true
  await page.evaluate(() =>
    [...document.querySelectorAll(".ml-owner-status button")]
      .find((b) => b.textContent === "Comprobar permisos de mi sesión")
      .click(),
  )
  await wait(() =>
    document
      .querySelector(".ml-session summary")
      .textContent.includes("Sesión autorizada"),
  )
  await page.evaluate(() => {
    const sfx = document.querySelector(".ml-voice>.ml-check input")
    if (sfx.checked) sfx.click()
  })
  await page.evaluate(() =>
    document.querySelector(".ml-authorization input").click(),
  )
  await wait(() => !document.querySelector(".ml-generate").disabled)
  await page.evaluate(() => document.querySelector(".ml-generate").click())
  await wait(() =>
    document
      .querySelector(".ml-sync-report summary")
      ?.textContent.includes("tiempos comprobados"),
  )
  assert.equal(generations, 1)
  assert.ok(
    await page.evaluate(() =>
      document.querySelector(".ml-sync-report").textContent.includes("4.00 s"),
    ),
  )
  assert.ok(
    await page.evaluate(
      () => !document.querySelector(".ml-sync-report .ml-check input").checked,
    ),
    "Technical validity must not auto-approve an auditory review",
  )
  await page.evaluate(() => {
    const track = document.querySelector('audio[data-audio-track="voice"]')
    track.muted = true
    const input = document.querySelector(
      'input[aria-label="Posición del estudio"]',
    )
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(input, "1")
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await wait(
    () =>
      Math.abs(
        document.querySelector('audio[data-audio-track="voice"]').currentTime -
          1,
      ) < 0.05,
  )
  await page.evaluate(() => document.querySelector(".ml-play").click())
  await wait(
    () =>
      document.querySelector('audio[data-audio-track="voice"]').currentTime >
      1.2,
  )
  await page.evaluate(() =>
    document.querySelector('audio[data-audio-track="voice"]').pause(),
  )
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 350)))
  const clock = await page.evaluate(() => ({
    source: document.querySelector(".ml-stage").dataset.playbackClock,
    visual: Number(document.querySelector(".ml-stage").dataset.playhead),
    audio: document.querySelector('audio[data-audio-track="voice"]')
      .currentTime,
  }))
  assert.equal(clock.source, "voice")
  assert.ok(
    Math.abs(clock.visual - clock.audio) < 0.035,
    `Visual clock continued without voice: ${JSON.stringify(clock)}`,
  )
  assert.deepEqual(failures, [])
  console.log(
    "PASS (mocked services, local silent WAV fixture): custom ID and free preview use no TTS; unapproved account cannot generate; explicit admin permission enables generation; decoded duration/transcript/timings checked; no automatic listening approval; paused audio freezes the subtitle clock. No provider credits consumed.",
  )
} catch (error) {
  console.error(
    "Controlled audio fixture diagnostics:",
    await page.evaluate(() => {
      const track = document.querySelector('audio[data-audio-track="voice"]')
      return track
        ? {
            currentTime: track.currentTime,
            duration: track.duration,
            paused: track.paused,
            seeking: track.seeking,
            readyState: track.readyState,
            error: track.error?.code,
            seekable: Array.from({ length: track.seekable.length }, (_, i) => [
              track.seekable.start(i),
              track.seekable.end(i),
            ]),
            playhead: document.querySelector(".ml-stage").dataset.playhead,
            slider: document.querySelector(
              'input[aria-label="Posición del estudio"]',
            ).value,
          }
        : { hasVoice: false, visible: document.body.innerText.slice(-2200) }
    }),
  )
  throw error
} finally {
  await browser.close({ silent: true })
}
