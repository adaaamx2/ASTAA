import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { initialStore, storageKey } from "../src/production/data.ts"

const require = createRequire(import.meta.url)
const cliRequire = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cliRequire("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
const page = await browser.newPage({
  context: () => null,
  logLevel: "error",
  indent: false,
  pageIndex: 0,
  onBrowserLog: null,
  onLog: () => {},
})
const base = `http://localhost:${process.env.PORT || 8443}`
const workspace = `${base}/#workspace`
let reloadCount = 0
// Navigating to the same hash can stay in the same document. Change the query
// to exercise a genuine reload when testing localStorage recovery/persistence.
const reloadWorkspace = () =>
  page.goto({
    url: `${base}/?workspace-check=${++reloadCount}#workspace`,
    timeout: 30000,
  })
const errors = []
page.on("error", (error) => errors.push(String(error)))
const ready = (selector) =>
  page.evaluate(
    (selector) =>
      new Promise((resolve, reject) => {
        const deadline = Date.now() + 20000
        function check() {
          if (document.querySelector(selector)) return resolve(true)
          if (Date.now() > deadline)
            return reject(new Error(`Missing ${selector}`))
          requestAnimationFrame(check)
        }
        check()
      }),
    selector,
  )
const click = (text) =>
  page.evaluate((text) => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === text,
    )
    if (!button) throw new Error(`Missing button ${text}`)
    button.click()
  }, text)
const screenshot = async (name) => {
  const image = await page
    ._client()
    .send("Page.captureScreenshot", { format: "png" })
  await writeFile(
    `.production/qa/browser/${name}.png`,
    Buffer.from(image.value.data, "base64"),
  )
}

try {
  await mkdir(".production/qa/browser", { recursive: true })
  await writeFile(
    ".production/qa/browser/access-check.txt",
    "private-file-guard-fixture",
  )
  for (const pathname of [
    "/hola.env.elevenlabs.local?raw",
    "/.production/qa/browser/access-check.txt",
  ]) {
    const response = await fetch(`${base}${pathname}`)
    assert.ok(
      response.status === 403 || response.status === 404,
      "Private server file was exposed",
    )
    await response.body?.cancel()
  }
  const old = structuredClone(initialStore)
  old.schema = 1
  old.projects[0].title = "Prueba de persistencia"
  await page.evaluateOnNewDocument(
    (key, old) => {
      if (!sessionStorage.getItem("test-seeded")) {
        localStorage.setItem(key, JSON.stringify(old))
        sessionStorage.setItem("test-seeded", "yes")
      }
    },
    storageKey,
    old,
  )
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 })
  await reloadWorkspace()
  await ready(".p-finn-player")
  assert.equal(
    await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".p-workspace"))
          .backgroundColor,
    ),
    "rgb(17, 17, 19)",
  )
  assert.equal(
    await page.evaluate(
      () => document.querySelectorAll(".p-sidebar-projects > button").length,
    ),
    1,
  )
  const persisted = await page.evaluate(
    (key) => ({
      schema: JSON.parse(localStorage.getItem(key)).schema,
      backup: JSON.parse(localStorage.getItem(`${key}-before-v2`)).schema,
      title: document.querySelector('input[aria-label="Título del vídeo"]')
        .value,
    }),
    storageKey,
  )
  assert.deepEqual(persisted, {
    schema: 2,
    backup: 1,
    title: "Prueba de persistencia",
  })
  await screenshot("desktop")
  await click("Reproducir")
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 600)))
  assert.ok(
    await page.evaluate(
      () =>
        Number(
          document.querySelector('input[aria-label="Posición del vídeo"]')
            .value,
        ) > 0.1,
    ),
  )
  await click("Pausar")
  await page.evaluate(() => {
    const range = document.querySelector(
      'input[aria-label="Posición del vídeo"]',
    )
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(range, "14")
    range.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
  assert.match(
    await page.evaluate(() =>
      document.querySelector(".p-finn-player svg").getAttribute("aria-label"),
    ),
    /Escena 3/,
  )
  await page.evaluate(() =>
    document.querySelectorAll(".p-finn-layout .p-variant")[1].click(),
  )
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  )
  assert.equal(
    await page.evaluate(() =>
      Number(
        document.querySelector('input[aria-label="Posición del vídeo"]').value,
      ),
    ),
    3,
  )
  assert.equal(
    await page.evaluate(() =>
      document
        .querySelector(".p-finn-layout .p-variant[aria-current]")
        .textContent.includes("Tokens"),
    ),
    true,
  )
  for (const label of ["Pop", "Karaoke", "Kinetic", "Cómic"]) {
    await click(label)
    assert.equal(
      await page.evaluate(() =>
        document
          .querySelector('.p-finn-pack-switch [aria-pressed="true"]')
          .textContent.trim(),
      ),
      label,
    )
  }
  await click("Reiniciar")
  assert.equal(
    await page.evaluate(() =>
      Number(
        document.querySelector('input[aria-label="Posición del vídeo"]').value,
      ),
    ),
    0,
  )
  await page.evaluate(() => {
    const input = document.querySelector('input[aria-label="Título del vídeo"]')
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(input, "Cambio conservado")
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
  await page.goto({ url: workspace, timeout: 30000 })
  await ready(".p-finn-player")
  assert.equal(
    await page.evaluate(
      () =>
        document.querySelector('input[aria-label="Título del vídeo"]').value,
    ),
    "Cambio conservado",
  )
  await click("Exportaciones")
  await ready(".p-finn-player")
  for (const width of [1440, 1024, 820, 768, 700, 650, 390, 320]) {
    await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 })
    const layout = await page.evaluate(() => {
      const review = document
        .querySelector(".p-finn-review")
        .getBoundingClientRect()
      const player = document
        .querySelector(".p-finn-player")
        .getBoundingClientRect()
      const notes = document
        .querySelector(".p-finn-review .p-mobile-notes")
        .getBoundingClientRect()
      return {
        fits:
          player.left >= review.left - 1 &&
          player.right <= review.right + 1 &&
          notes.left >= review.left - 1 &&
          notes.right <= review.right + 1,
        separate:
          player.right <= notes.left + 1 || player.bottom <= notes.top + 1,
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }
    })
    assert.ok(
      layout.fits && layout.separate && layout.scroll <= width + 1,
      `Player layout overflow at ${width}px: ${JSON.stringify(layout)}`,
    )
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await screenshot("mobile")
  const mobile = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  assert.ok(mobile.scroll <= mobile.width + 1, JSON.stringify(mobile))
  const originalDocument = await page.evaluate((key) => {
    const original = localStorage.getItem(key)
    const empty = JSON.parse(original)
    empty.projects[0].scenes = []
    localStorage.setItem(key, JSON.stringify(empty))
    return original
  }, storageKey)
  await reloadWorkspace()
  await ready(".p-finn-empty")
  const emptyPlayer = await page.evaluate(() => ({
    disabled: document.querySelector(".p-finn-controls .p-primary").disabled,
    seekDisabled: document.querySelector(
      'input[aria-label="Posición del vídeo"]',
    ).disabled,
    maximum: document.querySelector('input[aria-label="Posición del vídeo"]')
      .max,
    count: document.querySelector(".p-finn-review .p-eyebrow").textContent,
  }))
  assert.deepEqual(emptyPlayer, {
    disabled: true,
    seekDisabled: true,
    maximum: "0",
    count: "PREVIEW / 0 ESCENAS",
  })
  await page.evaluate(
    (key, original) => localStorage.setItem(key, original),
    storageKey,
    originalDocument,
  )
  await page.goto({ url: `${base}/#library`, timeout: 30000 })
  await ready(".yt-projects")
  assert.equal(
    await page.evaluate(() => document.querySelectorAll(".yt-card").length),
    2,
  )
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 })
    const returnLink = await page.evaluate(() => {
      const link = document.querySelector('.yt-topbar a[href="#workspace"]')
      const bounds = link.getBoundingClientRect()
      return {
        visible:
          bounds.width > 0 && bounds.left >= 0 && bounds.right <= innerWidth,
        label: link.textContent.trim(),
      }
    })
    assert.ok(
      returnLink.visible,
      `Finn Lab return link is not visible at ${width}px`,
    )
    assert.match(returnLink.label, /Finn Lab/)
    await screenshot(`library-${width}`)
    await page.evaluate(() =>
      document.querySelector('.yt-topbar a[href="#workspace"]').click(),
    )
    await ready(".p-finn-player")
    assert.equal(await page.evaluate(() => location.hash), "#workspace")
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector('input[aria-label="Título del vídeo"]').value,
      ),
      "Cambio conservado",
    )
    await page.evaluate(() =>
      document.querySelector('.p-legacy[href="#library"]').click(),
    )
    await ready(".yt-projects")
  }
  for (const id of ["discord", "youtube-reference-002"]) {
    await page.goto({ url: `${base}/#video/${id}`, timeout: 30000 })
    await ready(id === "discord" ? ".film" : ".fs-studio")
  }
  if (process.argv.includes("--require-exports")) {
    const response = await fetch(`${base}/exports/finn-animatics.json`)
    assert.ok(response.ok)
    const manifest = await response.json()
    assert.equal(manifest.status, "rendered-needs-review")
    assert.equal(manifest.variants.filter((v) => v.width === 1080).length, 4)
    for (const artifact of manifest.variants) {
      const download = await fetch(`${base}${artifact.url}`)
      assert.ok(download.ok)
      const bytes = Buffer.from(await download.arrayBuffer())
      assert.equal(bytes.length, artifact.bytes)
      assert.equal(bytes.subarray(4, 8).toString(), "ftyp")
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        artifact.sha256,
      )
    }
    await page.goto({ url: workspace, timeout: 30000 })
    await ready(".p-finn-player")
    await click("Exportaciones")
    await ready(".p-rendered-grid video")
    assert.equal(
      await page.evaluate(
        () => document.querySelectorAll(".p-rendered-grid video").length,
      ),
      4,
    )
    await page.evaluate(async () => {
      const video = document.querySelector(".p-rendered-grid video")
      video.muted = true
      await video.play()
      await new Promise((resolve, reject) => {
        const end = Date.now() + 10000
        function tick() {
          if (video.currentTime > 0.1) {
            video.pause()
            return resolve()
          }
          if (video.error || Date.now() > end)
            return reject(new Error("MP4 playback failed"))
          requestAnimationFrame(tick)
        }
        tick()
      })
    })
  }
  assert.deepEqual(errors, [])
  console.log(
    "PASS: migration + backup, edit/reload, desktop/mobile, playback, library and archived routes" +
      (process.argv.includes("--require-exports")
        ? ", four complete MP4 downloads/hashes + actual MP4 playback."
        : "."),
  )
} finally {
  await browser.close({ silent: true })
}
