import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const cli = createRequire(require.resolve("@remotion/cli/package.json"))
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
const runtimeErrors = []
page.on("error", (error) => runtimeErrors.push(String(error)))
await page.evaluateOnNewDocument(() => {
  window.__workspaceConsoleErrors = []
  const original = console.error
  console.error = (...args) => {
    window.__workspaceConsoleErrors.push(args.map(String).join(" "))
    original.apply(console, args)
  }
})
try {
  await page.goto({
    url: `http://localhost:${process.env.PORT || 8443}/#video/blue-hour`,
    timeout: 30000,
  })
  for (const id of ["blue-hour", "enbu", "blue-hour", "enbu", "blue-hour"]) {
    await page.evaluate((id) => {
      location.hash = `video/${id}`
    }, id)
    await page.evaluate(
      (id) =>
        new Promise((resolve, reject) => {
          const end = Date.now() + 15000
          const title = id === "blue-hour" ? "BLUE HOUR" : "ENBU"
          function check() {
            if (
              document
                .querySelector(".ml-stage h2")
                ?.textContent.includes(title) &&
              document.querySelectorAll(".wg-files").length === 1
            )
              return resolve()
            if (Date.now() > end)
              return reject(new Error(`Missing editor/files for ${id}`))
            requestAnimationFrame(check)
          }
          check()
        }),
      id,
    )
  }
  const duplicates = await page.evaluate(() =>
    window.__workspaceConsoleErrors.filter((message) =>
      /same key|unique.*key/i.test(message),
    ),
  )
  assert.deepEqual(duplicates, [])
  assert.deepEqual(runtimeErrors, [])
  console.log(
    "PASS: switching BLUE HOUR/ENBU retains one editor and one file panel without duplicate-key warnings.",
  )
} finally {
  await browser.close({ silent: true })
}
