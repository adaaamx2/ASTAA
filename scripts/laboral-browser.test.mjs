import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { writeFile } from "node:fs/promises"
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
  const client = page._client()
  await client.send("Runtime.enable")
  client.on("Runtime.exceptionThrown", (event) =>
    errors.push(
      event.exceptionDetails?.exception?.description ||
        event.exceptionDetails?.text,
    ),
  )
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
    localStorage.setItem("yt-owner-auth",JSON.stringify({access_token:"laboral-fixture-owner",refresh_token:"fixture",expires_at:Date.now()+3600000}));
    window.laboralGenerations=0;
    const actual=window.fetch.bind(window);
    window.fetch=async(input,init)=>{
      const url=String(input);
      if(url.includes("api.elevenlabs.io"))throw new Error("No provider calls are authorized for this video setup");
      if(!url.includes(".supabase.co"))return actual(input,init);
      if(url.endsWith("/auth/status"))return Response.json({setup:false});
      if(url.endsWith("/studio/session"))return Response.json({authenticated:true,authorized:true,userId:"fixture",reason:"authorized"});
      if(url.endsWith("/audio/status"))return Response.json({configured:true,last4:"test",revision:1});
      if(url.endsWith("/audio/voices"))return Response.json({voices:[]});
      if(url.endsWith("/audio/connection"))return Response.json({tier:"fixture"});
      if(url.endsWith("/audio/generate")){window.laboralGenerations++;throw new Error("Unexpected generation")}
      if(url.includes("/audio/state/"))return Response.json({state:null});
      if(url.endsWith("/studio/projects"))return Response.json({projects:[]});
      if(url.includes("/studio/projects/"))return Response.json({project:null});
      if(url.endsWith("/studio/assets"))return Response.json({assets:[]});
      return Response.json({});
    };
  `,
  })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/#video/laboral-clothing`,
    timeout: 30000,
  })
  const result = await page.evaluate(async () => {
    const wait = async (predicate) => {
      for (let i = 0; i < 400; i++) {
        if (predicate()) return
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error(
        "Laboral UI did not become ready: " +
          document.body.innerText.slice(-1800),
      )
    }
    await wait(
      () =>
        document.querySelector(".sound-studio textarea") &&
        document.querySelector(
          '.ml-canvas-slot canvas[aria-label*="Laboral Clothing"]',
        ),
    )
    const { laboralPlan } = await import("/src/motion-lab/laboral-plan.ts")
    const { loadLaboral } = await import("/src/motion-lab/LaboralPreview.tsx")
    const { drawLaboral } = await import("/src/motion-lab/laboral-scene.ts")
    const images = await loadLaboral()
    await wait(
      () =>
        document.querySelector(".ml-stage-footer .ml-button-download") &&
        document.querySelector(".sound-preview video")?.videoWidth === 1920,
    )
    const frame = document.createElement("canvas")
    frame.width = 1920
    frame.height = 1080
    const sheet = document.createElement("canvas")
    sheet.width = 1280
    sheet.height = 1140
    const graphics = sheet.getContext("2d")
    graphics.fillStyle = "#141412"
    graphics.fillRect(0, 0, sheet.width, sheet.height)
    const times = [1.6, 4.9, 8.6, 12.7, 16.6],
      variation = []
    for (const [index, time] of times.entries()) {
      drawLaboral(frame.getContext("2d"), time, 1920, 1080, images)
      graphics.drawImage(
        frame,
        (index % 2) * 640,
        Math.floor(index / 2) * 380,
        640,
        360,
      )
      graphics.fillStyle = "#eeeae2"
      graphics.font = "14px sans-serif"
      graphics.fillText(
        time + " s",
        (index % 2) * 640 + 12,
        Math.floor(index / 2) * 380 + 376,
      )
      const samples = frame.getContext("2d").getImageData(0, 0, 1920, 1080).data
      let sum = 0,
        squares = 0,
        n = 0
      for (let i = 0; i < samples.length; i += 400) {
        const value = (samples[i] + samples[i + 1] + samples[i + 2]) / 3
        sum += value
        squares += value * value
        n++
      }
      variation.push(Math.sqrt(squares / n - (sum / n) ** 2))
    }
    const textarea = document.querySelectorAll(".sound-studio textarea")
    const canvas = document.querySelector(
      '.ml-canvas-slot canvas[aria-label*="Laboral Clothing"]',
    )
    return {
      width: canvas.width,
      height: canvas.height,
      guion: textarea[0].value,
      music: textarea[1].value,
      sfx: textarea[2].value,
      expectedNarration: laboralPlan.narration,
      generations: window.laboralGenerations,
      sfxButton: [...document.querySelectorAll("button")].some(
        (button) => button.textContent.trim() === "Generar solo SFX",
      ),
      musicButton: [...document.querySelectorAll("button")].some(
        (button) => button.textContent.trim() === "Generar solo Música",
      ),
      mainExportAvailable: Boolean(
        document.querySelector(".ml-stage-footer .ml-button-download"),
      ),
      sourceVideoWidth: document.querySelector(".sound-preview video")
        .videoWidth,
      sourceVideoHeight: document.querySelector(".sound-preview video")
        .videoHeight,
      variation,
      png: sheet.toDataURL("image/png").split(",")[1],
    }
  })
  assert.equal(result.width, 1920)
  assert.equal(result.height, 1080)
  assert.equal(result.guion, result.expectedNarration)
  assert.match(result.music, /110 BPM/)
  assert.ok(result.sfx.length <= 450)
  assert.match(result.sfx, /14.7/)
  assert.equal(result.generations, 0)
  assert.equal(result.sfxButton, true)
  assert.equal(result.musicButton, true)
  assert.equal(result.mainExportAvailable, true)
  assert.equal(result.sourceVideoWidth, 1920)
  assert.equal(result.sourceVideoHeight, 1080)
  assert.ok(
    result.variation.every((value) => value > 20),
    JSON.stringify(result.variation),
  )
  assert.deepEqual(errors, [])
  await writeFile(
    "/tmp/laboral-layout-check.png",
    Buffer.from(result.png, "base64"),
  )
  console.log(
    "Real canvas preview; cloud mocked, zero generation requests:",
    JSON.stringify({ ...result, png: undefined, expectedNarration: undefined }),
  )
} finally {
  await browser.close({ silent: true })
}
