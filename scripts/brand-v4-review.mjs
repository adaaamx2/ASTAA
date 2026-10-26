import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
const require = createRequire(import.meta.url)
const cli = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cli("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
const samples = [1.9, 5.15, 6.95, 10.7, 12.85, 15.6, 17.1]
const starts = [0, 2.35, 5.85, 7.65, 11.9, 13.6, 16.3]
const ends = [2.35, 5.85, 7.65, 11.9, 13.6, 16.3, 17.5]
const folder = ".production/brand-v4-review"
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
  await page.setViewport({ width: 1080, height: 2022, deviceScaleFactor: 1 })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/`,
    timeout: 30000,
  })
  const frames = []
  const report = []
  for (let index = 0; index < samples.length; index++) {
    const result = await page.evaluate(
      async ({ time, scene }) => {
        const { mountFrame } = await import(
          "/scripts/editorial-review-entry.tsx"
        )
        await mountFrame("brand-strategy", time)
        const root = document.querySelector("#editorial-review-root")
        const active = root.querySelector(`[data-brand-scene="${scene}"]`)
        const stage = root.querySelector("svg")
        const bounds = [...active.querySelectorAll("[data-brand-title] text")]
          .filter((node) => Number(node.getAttribute("opacity")) > 0.95)
          .map((node) => {
            const box = node.getBoundingClientRect()
            return {
              text: node.textContent,
              left: box.left,
              right: box.right,
              top: box.top,
              bottom: box.bottom,
            }
          })
        return {
          noChapterFurniture: ![...stage.querySelectorAll("text")].some(
            (node) =>
              /^(BRAND STRATEGY|THE SECRET|THE PROBLEM|THE TRUTH|THE PURPOSE|THE OUTCOME|THE SYSTEM|THE INTENTION|0[1-7] \/ 07)$/.test(
                node.textContent.trim(),
              ),
          ),
          version: stage.dataset.editorialVersion,
          layers: active.querySelectorAll("[data-living-layer]").length,
          bounds,
          fonts:
            document.fonts.check('italic 400 235px "Instrument Serif"') &&
            document.fonts.check('850 244px "Inter Tight Variable"'),
        }
      },
      { time: samples[index], scene: index + 1 },
    )
    assert.equal(result.version, "4")
    assert.ok(result.noChapterFurniture, "Chapter labels must not return")
    assert.ok(result.fonts)
    assert.ok(
      result.layers >= 2,
      `Scene ${index + 1} has no internal motion system`,
    )
    for (const box of result.bounds)
      assert.ok(
        box.left >= 48 &&
          box.right <= 1032 &&
          box.top >= 220 &&
          box.bottom <= 1550,
        `Unsafe mobile title in scene ${index + 1}: ${JSON.stringify(box)}`,
      )
    const image = await page._client().send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 },
    })
    frames.push(image.value.data)
    await writeFile(
      `${folder}/scene-${index + 1}.png`,
      Buffer.from(image.value.data, "base64"),
    )
    const a = starts[index] + (ends[index] - starts[index]) * 0.4
    const changes = await page.evaluate(
      async ({ a, scene }) => {
        const { mountFrame } = await import(
          "/scripts/editorial-review-entry.tsx"
        )
        const signature = () =>
          [
            ...document.querySelectorAll(
              `#editorial-review-root [data-brand-scene="${scene}"] [data-living-layer]`,
            ),
          ].map((node, i) => ({
            name: `${node.getAttribute("data-living-layer")}:${i}`,
            value: node.outerHTML,
          }))
        await mountFrame("brand-strategy", a)
        const before = signature()
        await mountFrame("brand-strategy", a + 0.24)
        const after = signature()
        return before
          .filter((node) =>
            after.some(
              (other) => other.name === node.name && other.value !== node.value,
            ),
          )
          .map((node) => node.name)
      },
      { a, scene: index + 1 },
    )
    assert.ok(
      changes.length >= 2,
      `Scene ${index + 1} only changes at its transition: ${changes}`,
    )
    report.push({
      scene: index + 1,
      time: samples[index],
      ...result,
      changingForegroundLayers: changes,
    })
    console.log(
      `Scene ${index + 1}: safe titles, loaded typefaces, ${changes.length} changing foreground layers`,
    )
  }
  const height = await page.evaluate(
    async ({ samples, frames }) => {
      const { mountRasterBoard } = await import(
        "/scripts/editorial-review-entry.tsx"
      )
      return mountRasterBoard("brand-strategy", samples, frames)
    },
    { samples, frames },
  )
  const board = await page._client().send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: 1080, height, scale: 1 },
  })
  await writeFile(
    `${folder}/all-scenes.png`,
    Buffer.from(board.value.data, "base64"),
  )
  await writeFile(`${folder}/technical.json`, JSON.stringify(report, null, 2))
  console.log(
    "Seven-shot board saved. Motion/safe-area checks are not an artistic 9/10 certification.",
  )
} finally {
  await browser.close({ silent: true })
}
