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
  const errors = []
  page.on("error", (error) => errors.push(String(error)))
  const base = `http://localhost:${process.env.PORT || 3000}`
  const ids = [
    "enbu",
    "blue-hour",
    "brand-strategy",
    "discord",
    "youtube-reference-002",
    "finn:ia-por-dentro",
  ]
  for (const id of ids) {
    await page.goto({ url: `${base}/#video/${id}`, timeout: 30000 })
    const result = await page.evaluate(async (id) => {
      const deadline = Date.now() + 20000
      while (!document.querySelector(`textarea[aria-label^="Guía de"]`)) {
        if (Date.now() > deadline) throw new Error(`Missing style guide ${id}`)
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
      const guide = document.querySelector(
        `textarea[aria-label^="Guía de"]`,
      ).value
      const editor = document.querySelector(".wg-editor")
      const isEditorial = id === "editing-collage" || id === "brand-strategy"
      if (isEditorial) {
        while (!editor.querySelector(`svg[aria-label^="${id}"]`) || editor.querySelector(".ml-stage")?.dataset.visualReady !== "true") {
          const failure = editor.querySelector(".ml-canvas-room [role=alert]")
          if (failure) throw new Error(failure.textContent)
          if (Date.now() > deadline) throw new Error(`Editorial preview did not become ready: ${id}`)
          await new Promise((resolve) => requestAnimationFrame(resolve))
        }
      }
      const result = {
        guide: guide.includes(id),
        hasRecipe: guide.includes("Receta del vídeo"),
        hasEngine: guide.includes(".tsx") || guide.includes("art.ts"),
        visual:
          !isEditorial || !!editor.querySelector(`svg[aria-label^="${id}"]`),
        images: isEditorial
          ? editor.querySelectorAll("svg.ml-art image").length
          : 0,
      }
      if (isEditorial) {
        while (![...editor.querySelectorAll("button")].some((button) => button.textContent.includes("Exportar MP4"))) {
          if (Date.now() > deadline) throw new Error(`Missing MP4 artifact for ${id}`)
          await new Promise((resolve) => requestAnimationFrame(resolve))
        }
        const label = [...editor.querySelectorAll("label")].find((label) =>
          label.textContent.includes("Subtítulos"),
        )
        label.querySelector("input").click()
        await new Promise((resolve) => requestAnimationFrame(resolve))
        result.captionExport = [...editor.querySelectorAll("button")].some(
          (button) => button.textContent.includes("audio + captions"),
        )
      }
      return result
    }, id)
    assert.ok(
      result.guide && result.hasRecipe && result.hasEngine && result.visual,
      `${id}: ${JSON.stringify(result)}`,
    )
    if (id === "editing-collage" || id === "brand-strategy")
      assert.equal(
        result.captionExport,
        true,
        `${id}: missing final caption export`,
      )
    console.log(`Verified recipe and editor: ${id}`)
  }
  await page.evaluate(() => {
    localStorage.setItem("yt-workspace-gallery-v1", JSON.stringify([{
      id: "archived-editing-draft", title: "ARCHIVED_EDITING_DO_NOT_ERASE",
      kind: "study", template: "editing-collage", channel: "Tus vídeos",
      duration: 18.216667, format: "9:16", description: "Historical user version",
    }]))
  })
  await page.goto({ url: `${base}/?retirement-check=1#video/archived-editing-draft`, timeout: 30000 })
  const retirement = await page.evaluate(async () => {
    const deadline = Date.now() + 20000
    while (!document.querySelector(".wg-gallery[open]")) {
      if (Date.now() > deadline) throw new Error("Retired project link did not return to the gallery")
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    const hidden = ![...document.querySelectorAll(".wg-card-body")].some((node) => node.textContent.includes("EDITING"))
    const preserved = JSON.parse(localStorage.getItem("yt-workspace-gallery-v1")).some((row) => row.id === "archived-editing-draft")
    const create = [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Nuevo vídeo")
    create.click()
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const options = [...document.querySelectorAll(".wg-create select option")].map((option) => option.value)
    return { hidden, preserved, options }
  })
  assert.equal(retirement.hidden, true)
  assert.equal(retirement.preserved, true)
  assert.deepEqual(retirement.options, ["enbu", "blue-hour", "brand-strategy"])
  console.log("Verified EDITING retirement, selector removal and preservation of historical drafts")
  assert.deepEqual(errors, [])
} finally {
  await browser.close({ silent: true })
}
