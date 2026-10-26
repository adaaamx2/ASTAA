import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
const require = createRequire(import.meta.url)
const cli = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cli("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
try {
  await mkdir(".production/editorial-review/reference", { recursive: true })
  const page = await browser.newPage({ context: () => null, logLevel: "error", indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {} })
  await page.goto({ url: `http://localhost:${process.env.PORT || 3000}`, timeout: 30000 })
  for (const id of [process.argv[2] || "brand-strategy"]) {
    for (const section of [0, 1, 2]) {
      const image = await page.evaluate(async ({ id, section }) => {
        const video = document.createElement("video")
        video.muted = true; video.src = `/references/${id}-original.mp4`
        await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = reject })
        const canvas = document.createElement("canvas")
        canvas.width = 1600; canvas.height = 1150
        const ctx = canvas.getContext("2d")
        ctx.fillStyle = "#161616"; ctx.fillRect(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < 10; i++) {
          const time = Math.min(video.duration - 0.05, section * 6 + i * 0.6 + 0.1)
          video.currentTime = time
          await new Promise((resolve) => { video.onseeked = resolve })
          const x = i % 5 * 320, y = Math.floor(i / 5) * 575
          ctx.drawImage(video, x, y, 320, 550)
          ctx.fillStyle = "#fff"; ctx.font = "16px monospace"; ctx.fillText(`${time.toFixed(2)} s`, x + 10, y + 569)
        }
        return canvas.toDataURL("image/png").split(",")[1]
      }, { id, section })
      await writeFile(`.production/editorial-review/reference/${id}-${section}.png`, Buffer.from(image, "base64"))
    }
  }
} finally { await browser.close({ silent: true }) }
