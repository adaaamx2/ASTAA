import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
const require = createRequire(import.meta.url)
const cli = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cli("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
try {
  await mkdir(".production/qa/native-brand", { recursive: true })
  const page = await browser.newPage({ context: () => null, logLevel: "error", indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {} })
  await page.goto({ url: `http://localhost:${process.env.PORT || 3000}/`, timeout: 30000 })
  for (const time of [1.9, 5.5, 6.95, 10.9, 12.85, 15.75, 17.1]) {
    const result = await page.evaluate(async (time) => {
      const video = document.createElement("video")
      video.muted = true
      video.src = "/exports/study-brand-strategy.mp4"
      await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = () => reject(new Error("Native MP4 did not load")) })
      video.currentTime = time
      await new Promise((resolve) => { video.onseeked = resolve })
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      const context = canvas.getContext("2d")
      context.drawImage(video, 0, 0)
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data
      let nonWhite = 0, red = 0
      for (let i = 0; i < data.length; i += 4) {
        if (Math.min(data[i], data[i + 1], data[i + 2]) < 220) nonWhite++
        if (data[i] > 95 && data[i] > data[i + 1] * 1.5 && data[i + 1] < 130 && data[i + 2] < 150) red++
      }
      const result = { width: video.videoWidth, height: video.videoHeight, duration: video.duration, nonWhite, red, png: canvas.toDataURL("image/png").split(",")[1] }
      video.removeAttribute("src"); video.load()
      return result
    }, time)
    assert.equal(result.width, 1080)
    assert.equal(result.height, 1920)
    assert.ok(Math.abs(result.duration - 17.5) < .1)
    assert.ok(result.nonWhite > 10000, `Native shot is blank/loading at ${time}s`)
    if (time < 16.3) assert.ok(result.red > 100, `Native shot lost its red brand palette at ${time}s`)
    await writeFile(`.production/qa/native-brand/${time.toFixed(2)}.png`, Buffer.from(result.png, "base64"))
    console.log(`Native MP4 scene verified at ${time}s: ${result.width}x${result.height}, ${result.nonWhite} non-white pixels`)
  }
} finally { await browser.close({ silent: true }) }
