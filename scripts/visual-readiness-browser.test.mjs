import assert from "node:assert/strict"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const cli = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cli("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
try {
  const page = await browser.newPage({
    context: () => null,
    logLevel: "error",
    indent: false,
    pageIndex: 0,
    onBrowserLog: null,
    onLog: () => {},
  })
  const client = page._client()
  await client.send("Network.enable")
  await client.send("Network.setCacheDisabled", { cacheDisabled: true })
  await client.send("Page.enable")
  let released = false
  const paused = []
  let firstPaused
  const firstAsset = new Promise((resolve) => {
    firstPaused = resolve
  })
  client.on("Fetch.requestPaused", (event) => {
    if (released)
      void client.send("Fetch.continueRequest", { requestId: event.requestId })
    else {
      paused.push(event.requestId)
      firstPaused()
    }
  })
  await client.send("Fetch.enable", {
    patterns: [
      { urlPattern: "*editorial-generated-v2/*", requestStage: "Request" },
    ],
  })
  const dom = new Promise((resolve) =>
    client.once("Page.domContentEventFired", resolve),
  )
  await client.send("Page.navigate", {
    url: `http://localhost:${process.env.PORT || 3000}/#video/brand-strategy`,
  })
  let timeout
  await Promise.race([
    Promise.all([dom, firstAsset]),
    new Promise((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error("No intercepted editorial asset request")),
        20000,
      )
    }),
  ]).finally(() => clearTimeout(timeout))
  const before = await page.evaluate(async () => {
    const deadline = Date.now() + 15000
    while (!document.querySelector(".wg-editor .ml-stage")) {
      if (Date.now() > deadline) throw new Error("Brand editor did not mount")
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    const play = document.querySelector(".wg-editor .ml-play")
    if (play.getAttribute("aria-label") === "Reproducir estudio") play.click()
    for (let i = 0; i < 6; i++)
      await new Promise((resolve) => requestAnimationFrame(resolve))
    const stage = document.querySelector(".wg-editor .ml-stage")
    return {
      time: Number(stage.dataset.playhead),
      ready: stage.dataset.visualReady,
      playing: play.getAttribute("aria-label") === "Pausar estudio",
    }
  })
  assert.ok(paused.length > 0)
  assert.deepEqual(before, { time: 0, ready: "false", playing: true })
  released = true
  await Promise.all(
    paused.map((requestId) =>
      client.send("Fetch.continueRequest", { requestId }),
    ),
  )
  const after = await page.evaluate(async () => {
    const deadline = Date.now() + 20000
    while (
      document.querySelector(".wg-editor .ml-stage")?.dataset.visualReady !==
      "true"
    ) {
      if (Date.now() > deadline)
        throw new Error("Visual assets did not become ready")
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    for (let i = 0; i < 5; i++)
      await new Promise((resolve) => requestAnimationFrame(resolve))
    const stage = document.querySelector(".wg-editor .ml-stage")
    return {
      time: Number(stage.dataset.playhead),
      scene: !!stage.querySelector('svg[data-editorial-version="4"]'),
    }
  })
  assert.equal(after.scene, true)
  assert.ok(
    after.time > 0 && after.time < 0.5,
    `The entrance was skipped while loading: ${after.time}`,
  )
  console.log(
    `Asset requests delayed: ${paused.length}; playhead stayed at 0 and resumed at ${after.time.toFixed(3)}s.`,
  )
} finally {
  await browser.close({ silent: true })
}
