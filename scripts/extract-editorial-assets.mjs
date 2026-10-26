import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"

// Recovered collage elements only. Never use the original video as the recreation.
const cuts = [
  ["crowd", 1, 0.96, [0, 460, 540, 500]],
  ["timeline-a", 1, 1.87, [0, 85, 150, 290]],
  ["timeline-b", 1, 1.87, [345, 0, 195, 275]],
  ["timeline-c", 1, 1.87, [0, 620, 180, 210]],
  ["timeline-d", 1, 1.87, [360, 620, 180, 340]],
  ["target", 1, 3.69, [155, 390, 340, 385]],
  ["graphics", 1, 6.43, [25, 340, 490, 380]],
  ["after-effects", 1, 7.34, [20, 180, 500, 455]],
  ["flowers", 1, 9.16, [130, 360, 320, 360]],
  ["skull", 1, 10.98, [95, 330, 420, 395]],
  ["clock", 1, 12.8, [135, 320, 335, 305]],
  ["masterpiece", 1, 15.53, [125, 355, 325, 345]],
  ["eye-a", 1, 17.36, [0, 80, 200, 240], "black"],
  ["eye-b", 1, 17.36, [290, 655, 220, 230], "black"],
  ["statue", 2, 0.93, [65, 350, 475, 610]],
  ["chess", 2, 3.55, [90, 400, 380, 345]],
  ["phone", 2, 8.81, [35, 485, 490, 475]],
  ["laptop", 2, 14.94, [0, 440, 540, 520]],
  ["avatar", 2, 16.68, [185, 320, 170, 170]],
]
const require = createRequire(import.meta.url)
const cli = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cli("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
try {
  await mkdir("public/references/editorial-assets", { recursive: true })
  const page = await browser.newPage({
    context: () => null,
    logLevel: "error",
    indent: false,
    pageIndex: 0,
    onBrowserLog: null,
    onLog: () => {},
  })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}`,
    timeout: 30000,
  })
  for (const cut of cuts.filter((cut) => !process.argv[2] || cut[0] === process.argv[2])) {
    const result = await page.evaluate(
      async ([name, source, time, rect, background]) => {
        const video = document.createElement("video")
        video.muted = true
        video.src = `/references/${
          source === 1 ? "editing-collage" : "brand-strategy"
        }-original.mp4`
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve
          video.onerror = reject
        })
        video.currentTime = time
        await new Promise((resolve) => {
          video.onseeked = resolve
        })
        const stage = document.createElement("canvas")
        stage.width = 540
        stage.height = 960
        stage.getContext("2d").drawImage(video, 0, 0, 540, 960)
        const [x, y, width, height] = rect
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        context.drawImage(stage, x, y, width, height, 0, 0, width, height)
        // Flood-fill only connected background. Preserve enclosed white highlights.
        const image = context.getImageData(0, 0, width, height)
        const data = image.data,
          visited = new Uint8Array(width * height),
          queue = []
        const push = (p) => {
          if (p < 0 || p >= visited.length || visited[p]) return
          visited[p] = 1
          const i = p * 4
          const match =
            background === "black"
              ? Math.max(data[i], data[i + 1], data[i + 2]) < 28
              : Math.min(data[i], data[i + 1], data[i + 2]) > 232
          if (match) {
            data[i + 3] = 0
            queue.push(p)
          }
        }
        for (let col = 0; col < width; col++) {
          push(col)
          push((height - 1) * width + col)
        }
        for (let row = 0; row < height; row++) {
          push(row * width)
          push(row * width + width - 1)
        }
        for (let i = 0; i < queue.length; i++) {
          const p = queue[i]
          if (p % width) push(p - 1)
          if (p % width < width - 1) push(p + 1)
          push(p - width)
          push(p + width)
        }
        context.putImageData(image, 0, 0)
        video.removeAttribute("src")
        video.load()
        return canvas.toDataURL("image/png").split(",")[1]
      },
      cut,
    )
    await writeFile(
      `public/references/editorial-assets/${cut[0]}.png`,
      Buffer.from(result, "base64"),
    )
    console.log(`Recovered ${cut[0]}`)
  }
} finally {
  await browser.close({ silent: true })
}
