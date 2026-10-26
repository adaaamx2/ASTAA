import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
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
  const errors = []
  const client = page._client()
  await client.send("Runtime.enable")
  client.on("Runtime.exceptionThrown", (event) => {
    const text =
      event.exceptionDetails?.exception?.description ||
      event.exceptionDetails?.text ||
      "Runtime exception"
    errors.push(text)
  })
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 })
  await mkdir(".production/qa/recovery", { recursive: true })
  for (const route of [
    "",
    "#video/enbu",
    "#video/brand-strategy",
    "#video/editing-collage",
  ]) {
    await page.goto({
      url: `http://localhost:${process.env.PORT || 3000}/?smoke=${encodeURIComponent(route)}${route}`,
      timeout: 30000,
    })
    const state = await page.evaluate(async (route) => {
      const deadline = Date.now() + 15000
      while (Date.now() < deadline) {
        const mounted = document.querySelector(".wg-shell")
        const editorial = document.querySelector(
          '.wg-editor svg[data-editorial-version="4"]',
        )
        const thumbnail = document.querySelector(
          '.wg-thumb svg[data-editorial-version="4"]',
        )
        const guide = document.querySelector('textarea[aria-label^="Guía de"]')
        if (
          mounted &&
          (route === "#video/brand-strategy"
            ? editorial && guide
            : route === "#video/enbu"
              ? guide
              : document.querySelector(".wg-gallery[open]") && thumbnail)
        ) {
          return {
            mounted: true,
            cards: document.querySelectorAll(".wg-cards article").length,
            editorial: !!editorial,
          }
        }
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      return {
        mounted: !!document.querySelector(".wg-shell"),
        body: document.body.innerText.slice(0, 200),
        ready: false,
      }
    }, route)
    assert.equal(
      state.mounted,
      true,
      errors.join("\n") || JSON.stringify(state),
    )
    assert.notEqual(
      state.ready,
      false,
      errors.join("\n") || `Route not ready: ${route}`,
    )
    assert.deepEqual(errors, [], "App import/render raised a runtime exception")
    const image = await client.send("Page.captureScreenshot", { format: "png" })
    await writeFile(
      `.production/qa/recovery/${route.replace(/[^a-zA-Z0-9-]/g, "") || "gallery"}.png`,
      Buffer.from(image.value.data, "base64"),
    )
    console.log(`App mounted without runtime exceptions: ${route || "gallery"}`)
  }
  const isolated = await page.evaluate(async () => {
    const { probeBoundary } = await import("/scripts/app-recovery-probe.tsx")
    const cleanup = probeBoundary()
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    const survived = !!document.querySelector(".wg-shell")
    const contained = !!document.querySelector(
      "#app-recovery-probe [role=alert]",
    )
    cleanup()
    return { survived, contained }
  })
  assert.deepEqual(isolated, { survived: true, contained: true })
  assert.ok(
    errors.every((error) =>
      error.includes("Intentional isolated preview probe"),
    ),
    "Unexpected runtime error during isolation probe",
  )
  console.log(
    "An intentionally broken preview is contained; the workspace survives.",
  )
} finally {
  await browser.close({ silent: true })
}
