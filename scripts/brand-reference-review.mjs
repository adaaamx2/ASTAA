import { createRequire } from "node:module"
import { mkdir, writeFile, readFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import assert from "node:assert/strict"
const require = createRequire(import.meta.url)
const cli = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cli("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
const folder = ".production/brand-reference-review"
const times = [
  0.1, 0.7, 1.9, 3.6, 5.5, 6.95, 8.2, 10.9, 12.85, 14.5, 15.75, 17.1,
]
try {
  await mkdir(folder, { recursive: true })
  const source = await readFile("public/references/brand-strategy-original.mp4")
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "cfd2818409fdf8ee36a6b962dc7bd22c14c87ef6caf5f73cef3c9d7473d3c682",
  )
  const page = await browser.newPage({
    context: () => null,
    logLevel: "error",
    indent: false,
    pageIndex: 0,
    onBrowserLog: null,
    onLog: () => {},
  })
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/`,
    timeout: 30000,
  })
  const summary = []
  for (const time of times) {
    const metrics = await page.evaluate(async (time) => {
      const { mountFrame } = await import("/scripts/editorial-review-entry.tsx")
      await mountFrame("brand-strategy", time)
      const root = document.querySelector("#editorial-review-root")
      return {
        time,
        version: root
          .querySelector("svg")
          .getAttribute("data-editorial-version"),
        localFonts:
          document.fonts.check('850 244px "Inter Tight Variable"') &&
          document.fonts.check('italic 400 235px "Instrument Serif"'),
        generatedImages: [...root.querySelectorAll("image")].map((image) =>
          image.getAttribute("href"),
        ),
        redTitles: [...root.querySelectorAll("[data-brand-title]")].map(
          (node) => ({
            text: node.getAttribute("data-brand-title"),
            visible: [...node.querySelectorAll("text")].some(
              (text) => Number(text.getAttribute("opacity")) > 0.95,
            ),
          }),
        ),
      }
    }, time)
    assert.equal(metrics.version, "4")
    assert.equal(metrics.localFonts, true)
    assert.ok(
      metrics.generatedImages.every((url) =>
        url.includes("editorial-generated-v2") || url.includes("brand-v4/"),
      ),
      "Reference crops must not be used as generated imagery",
    )
    const screenshot = await page
      ._client()
      .send("Page.captureScreenshot", {
        format: "png",
        clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 },
      })
    const candidate = screenshot.value.data
    const pair = await page.evaluate(
      async ({ time, candidate }) => {
        const video = document.createElement("video")
        video.muted = true
        video.src = "/references/brand-strategy-original.mp4"
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve
          video.onerror = reject
        })
        video.currentTime = time
        await new Promise((resolve) => {
          video.onseeked = resolve
        })
        const image = new Image()
        image.src = `data:image/png;base64,${candidate}`
        await image.decode()
        const canvas = document.createElement("canvas")
        canvas.width = 1440
        canvas.height = 1320
        const context = canvas.getContext("2d")
        context.fillStyle = "#141517"
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(video, 0, 40, 720, 1280)
        context.drawImage(image, 720, 40, 720, 1280)
        context.fillStyle = "#fff"
        context.font = "17px monospace"
        context.fillText(`REFERENCIA / ${time.toFixed(2)} s`, 20, 27)
        context.fillText(`RECONSTRUCCION / ${time.toFixed(2)} s`, 740, 27)
        video.removeAttribute("src")
        video.load()
        return canvas.toDataURL("image/png").split(",")[1]
      },
      { time, candidate },
    )
    await writeFile(
      `${folder}/compare-${time.toFixed(2)}.png`,
      Buffer.from(pair, "base64"),
    )
    summary.push(metrics)
  }
  // V4 is a redesigned motion editorial, not a frame-identical clone.
  const before = summary.find((sample) => sample.time === 3.6)
  assert.ok(
    before.redTitles.some(
      (title) => title.text === "just posting." && title.visible,
    ),
  )
  for (const cut of [2.35, 5.85, 7.65, 11.9, 13.6, 16.3]) {
    const samples = [-0.18, -0.09, 0, 0.09, 0.18].map((offset) => cut + offset)
    const candidates = []
    for (const time of samples) {
      await page.evaluate(async (time) => {
        const { mountFrame } = await import(
          "/scripts/editorial-review-entry.tsx"
        )
        await mountFrame("brand-strategy", time)
      }, time)
      const image = await page
        ._client()
        .send("Page.captureScreenshot", {
          format: "png",
          clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 },
        })
      candidates.push(image.value.data)
    }
    const strip = await page.evaluate(
      async ({ samples, candidates }) => {
        const video = document.createElement("video")
        video.muted = true
        video.src = "/references/brand-strategy-original.mp4"
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve
          video.onerror = reject
        })
        const canvas = document.createElement("canvas")
        canvas.width = 1080
        canvas.height = 830
        const context = canvas.getContext("2d")
        context.fillStyle = "#141517"
        context.fillRect(0, 0, 1080, 830)
        for (let i = 0; i < samples.length; i++) {
          video.currentTime = samples[i]
          await new Promise((resolve) => {
            video.onseeked = resolve
          })
          context.drawImage(video, i * 216, 22, 216, 384)
          const image = new Image()
          image.src = `data:image/png;base64,${candidates[i]}`
          await image.decode()
          context.drawImage(image, i * 216, 442, 216, 384)
          context.font = "12px monospace"
          context.fillStyle = "#fff"
          context.fillText(`REF ${samples[i].toFixed(2)}s`, i * 216 + 8, 16)
          context.fillText(`RECON ${samples[i].toFixed(2)}s`, i * 216 + 8, 432)
        }
        video.removeAttribute("src")
        video.load()
        return canvas.toDataURL("image/png").split(",")[1]
      },
      { samples, candidates },
    )
    await writeFile(
      `${folder}/transition-${cut.toFixed(2)}.png`,
      Buffer.from(strip, "base64"),
    )
  }
  await writeFile(`${folder}/technical.json`, JSON.stringify(summary, null, 2))
  console.log(
    `Saved ${summary.length} comparisons and all 6 transition strips; v4 typography, title cue and generated-asset provenance verified.`,
  )
} finally {
  await browser.close({ silent: true })
}
