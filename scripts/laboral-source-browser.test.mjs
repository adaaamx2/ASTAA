import assert from "node:assert/strict"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const cli = createRequire(require.resolve("@remotion/cli/package.json"))
const { openBrowser } = cli("@remotion/renderer")
const browser = await openBrowser("chrome", { logLevel: "error" })
try {
  const page = await browser.newPage({
    context: () => null, logLevel: "error", indent: false,
    pageIndex: 0, onBrowserLog: null, onLog: () => {},
  })
  await page._client().send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      localStorage.setItem("yt-owner-auth", JSON.stringify({access_token:"fixture",refresh_token:"fixture",expires_at:Date.now()+3600000}));
      const actual = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = String(input);
        if (!url.includes(".supabase.co")) return actual(input, init);
        if (url.endsWith("/auth/status")) return Promise.resolve(Response.json({setup:false}));
        if (url.endsWith("/studio/session")) return Promise.resolve(Response.json({authenticated:true,authorized:true,userId:"fixture",reason:"authorized"}));
        if (url.endsWith("/audio/status")) return Promise.resolve(Response.json({configured:true,last4:"test",revision:1}));
        if (url.endsWith("/audio/voices")) return Promise.resolve(Response.json({voices:[]}));
        if (url.includes("/audio/state/")) return Promise.resolve(Response.json({state:null}));
        if (url.endsWith("/studio/projects")) return Promise.resolve(Response.json({projects:[]}));
        if (url.includes("/studio/projects/")) return Promise.resolve(Response.json({project:null}));
        if (url.endsWith("/studio/assets")) return Promise.resolve(Response.json({assets:[]}));
        return Promise.resolve(Response.json({}));
      };
    `,
  })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/#video/laboral-clothing`,
    timeout: 30000,
  })
  const result = await page.evaluate(async () => {
    for (let i = 0; i < 400; i++) {
      const video = document.querySelector(".sound-preview video")
      const link = document.querySelector(".ml-stage-footer .ml-button-download")
      if (video?.videoWidth && link) {
        const manifest = await fetch("/exports/studies.json", { cache: "no-store" }).then(r => r.json())
        const artifact = manifest.artifacts.find(a => a.id === "laboral-clothing")
        const response = await fetch(video.currentSrc, { cache: "no-store" })
        const bytes = await response.arrayBuffer()
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
          .map(n => n.toString(16).padStart(2, "0")).join("")
        return { source: video.currentSrc, width: video.videoWidth, height: video.videoHeight,
          artifact, hash, bytes: bytes.byteLength, exportHref: link.getAttribute("href") }
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error("Mixer video and export control did not load: " + document.body.innerText.slice(-1500))
  })
  assert.ok(result.source.endsWith("/exports/study-laboral-clothing-v2.mp4"))
  assert.equal(result.artifact.url, "/exports/study-laboral-clothing-v2.mp4")
  assert.equal(result.width, 1920)
  assert.equal(result.height, 1080)
  assert.equal(result.hash, result.artifact.sha256)
  assert.equal(result.bytes, result.artifact.bytes)
  if (result.exportHref) assert.ok(!result.exportHref.endsWith("/study-laboral-clothing.mp4"))
  console.log("Real mixer video matches the new export artifact:", JSON.stringify(result))
} finally {
  await browser.close({ silent: true })
}
