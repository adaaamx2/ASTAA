import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import assert from "node:assert/strict"
import { editorialScenes } from "../src/motion-lab/editorial-timeline.ts"
const require = createRequire(import.meta.url)
const cli = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cli("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
const folder = ".production/editorial-review/v3"
try {
  await mkdir(folder, { recursive: true })
  const page = await browser.newPage({
    context: () => null,
    logLevel: "error",
    indent: false,
    pageIndex: 0,
    onBrowserLog: null,
    onLog: () => {},
  })
  // Exporting an MP4 updates public/ and Vite otherwise reloads a review midway.
  // Isolate this test page from HMR; the application's supervised server is untouched.
  await page._client().send("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.WebSocket = class ReviewSocket extends EventTarget {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      readyState = 0; send() {} close() {}
    };`,
  })
  await page.setViewport({ width: 1080, height: 2022, deviceScaleFactor: 1 })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}`,
    timeout: 30000,
  })
  const capture = async (filename, height) => {
    const image = await page
      ._client()
      .send("Page.captureScreenshot", {
        format: "png",
        clip: { x: 0, y: 0, width: 1080, height, scale: 1 },
      })
    await writeFile(
      `${folder}/${filename}`,
      Buffer.from(image.value.data, "base64"),
    )
  }
  const summary = []
  const board = async (id, samples) => {
    const frames = []
    for (const time of samples) {
      await page.evaluate(
        async ({ id, time }) => {
          const { mountFrame } = await import(
            "/scripts/editorial-review-entry.tsx"
          )
          await mountFrame(id, time, 360)
        },
        { id, time },
      )
      const image = await page
        ._client()
        .send("Page.captureScreenshot", {
          format: "png",
          clip: { x: 0, y: 0, width: 360, height: 640, scale: 1 },
        })
      frames.push(image.value.data)
    }
    return page.evaluate(
      async ({ id, samples, frames }) => {
        const { mountRasterBoard } = await import(
          "/scripts/editorial-review-entry.tsx"
        )
        return mountRasterBoard(id, samples, frames)
      },
      { id, samples, frames },
    )
  }
  for (const [id, scenes] of Object.entries(editorialScenes)) {
    const samples = scenes.map((scene) => scene.end - 0.48)
    for (let start = 0; start < samples.length; start += 9) {
      const subset = samples.slice(start, start + 9)
      const height = await board(id, subset)
      await capture(`${id}-scenes-${start}.png`, height)
    }
    for (let i = 0; i < scenes.length; i++) {
      const time = samples[i]
      const metrics = await page.evaluate(
        async ({ id, time }) => {
          const { mountFrame } = await import(
            "/scripts/editorial-review-entry.tsx"
          )
          await mountFrame(id, time)
          const root = document.querySelector("#editorial-review-root")
          const images = [...root.querySelectorAll("image")].map((image) =>
            image.getAttribute("href"),
          )
          const loaded = [...document.fonts].filter(
            (font) => /Inter/.test(font.family) && font.status === "loaded",
          ).length
          const canvas = root.querySelector("canvas[data-procedural-3d]")
          const vectors = root.querySelectorAll("[data-original-vector]").length
          return {
            images,
            loaded,
            models: canvas?.getAttribute("data-models"),
            triangles: Number(canvas?.getAttribute("data-triangles")),
            ready: canvas?.getAttribute("data-ready"),
            vectors,
            layers: root.querySelectorAll("[data-editorial-scene]").length,
            version: root
              .querySelector("svg")
              .getAttribute("data-editorial-version"),
          }
        },
        { id, time },
      )
      assert.equal(metrics.version, "2")
      assert.ok(
        metrics.loaded >= 3,
        "Local normal/italic typography was not loaded",
      )
      assert.equal(
        metrics.images.length,
        0,
        "The active composition still contains raster cutouts",
      )
      assert.equal(metrics.ready, "true")
      if (
        !(id === "editing-collage" && [6, 8].includes(i)) &&
        !(id === "brand-strategy" && [2, 4].includes(i))
      )
        assert.ok(metrics.triangles > 0, `${id}/${i}: empty 3D scene`)
      summary.push({
        id,
        scene: i + 1,
        title: scenes[i].title,
        time,
        ...metrics,
      })
      if (process.argv.includes("--frames"))
        await capture(`${id}-scene-${i + 1}.png`, 1920)
    }
    for (let i = 0; i < scenes.length - 1; i++) {
      const boundary = scenes[i].end
      const samples = [-0.28, -0.14, 0, 0.14, 0.28].map(
        (offset) => boundary + offset,
      )
      await board(id, samples)
      await capture(`${id}-transition-${i + 1}.png`, 1348)
    }
  }
  await writeFile(
    `${folder}/technical-review.json`,
    JSON.stringify(summary, null, 2),
  )
  console.log(
    `Reviewed ${summary.length} scenes; saved contact sheets and every transition to ${folder}`,
  )
} finally {
  await browser.close({ silent: true })
}
