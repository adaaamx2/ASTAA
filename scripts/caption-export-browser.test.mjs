import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
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
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/#video/brand-strategy`,
    timeout: 30000,
  })
  const result = await page.evaluate(async (fullLength) => {
    const { captionFrames } = await import("/src/media/caption-frames.tsx")
    const { mixMp4 } = await import("/src/media/mux.ts")
    let words = [
      {
        text: "Captions",
        start: 0,
        end: 0.65,
        sceneId: 1,
        source: "provider-character-alignment",
      },
      {
        text: "sí.",
        start: 0.65,
        end: 1.2,
        sceneId: 1,
        source: "provider-character-alignment",
      },
    ]
    if (fullLength) {
      const { studies } = await import("/src/motion-lab/studies.ts")
      const { estimateWords } = await import("/src/production/timing.ts")
      words = estimateWords([
        {
          id: 1,
          title: "BRAND STRATEGY",
          start: 0,
          end: 17.5,
          voice: studies.find((study) => study.id === "brand-strategy")
            .narration,
          visual: "",
        },
      ])
    }
    const viewport = { width: 360, height: 640 }
    const options = {
      words,
      pack: "karaoke",
      width: fullLength ? 1080 : 720,
      height: fullLength ? 1920 : 1280,
      viewport,
      accent: "#ffd18a",
      fps: fullLength ? 60 : 10,
    }
    const packs = {}
    for (const pack of ["pop", "karaoke", "kinetic", "comic"]) {
      let visible = 0
      await captionFrames(
        { ...options, pack, fps: 1 },
        1,
        async (_, bytes) => {
          const url = URL.createObjectURL(
            new Blob([bytes], { type: "image/png" }),
          )
          const image = new Image()
          image.src = url
          await image.decode()
          const canvas = document.createElement("canvas")
          canvas.width = image.width
          canvas.height = image.height
          const ctx = canvas.getContext("2d")
          ctx.drawImage(image, 0, 0)
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
          for (let p = 3; p < data.length; p += 4) if (data[p] > 128) visible++
          URL.revokeObjectURL(url)
        },
        () => {},
      )
      packs[pack] = visible
    }
    const blob = await mixMp4(
      {
        url: fullLength
          ? "/exports/study-brand-strategy.mp4"
          : "/references/brand-strategy-original.mp4",
        filename: "reference.mp4",
        mime: "video/mp4",
      },
      [],
      1.2,
      () => {},
      options,
    )
    const url = URL.createObjectURL(blob)
    const video = document.createElement("video")
    video.muted = true
    video.src = url
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve
      video.onerror = reject
    })
    video.currentTime = 0.4
    await new Promise((resolve) => {
      video.onseeked = resolve
    })
    const canvas = document.createElement("canvas")
    canvas.width = options.width
    canvas.height = options.height
    const ctx = canvas.getContext("2d")
    ctx.drawImage(video, 0, 0)
    const pixels = ctx.getImageData(
      0,
      Math.floor(options.height * 0.74),
      options.width,
      Math.floor(options.height * 0.24),
    ).data
    let yellow = 0
    for (let p = 0; p < pixels.length; p += 4)
      if (
        pixels[p] > 180 &&
        pixels[p + 1] > 120 &&
        pixels[p + 2] < 170 &&
        pixels[p] > pixels[p + 2] * 1.3
      )
        yellow++
    const context = new AudioContext()
    const combined = await mixMp4(
      {
        url: fullLength
          ? "/exports/study-brand-strategy.mp4"
          : "/references/brand-strategy-original.mp4",
        filename: "reference.mp4",
        mime: "video/mp4",
      },
      [
        {
          file: {
            url: "/exports/study-blue-hour-atmosphere.wav",
            filename: "voice-fixture.wav",
            mime: "audio/wav",
          },
          volume: 1,
        },
      ],
      fullLength ? 17.5 : 1.2,
      () => {},
      options,
    )
    const mixedAudio = await context.decodeAudioData(
      await combined.arrayBuffer(),
    )
    const samples = mixedAudio.getChannelData(0)
    const rms = Math.sqrt(
      samples.reduce((sum, value) => sum + value * value, 0) / samples.length,
    )
    await context.close()
    const encoded = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(",")[1])
      reader.readAsDataURL(blob)
    })
    return {
      packs,
      yellow,
      rms,
      duration: video.duration,
      channels: mixedAudio.numberOfChannels,
      mixedDuration: mixedAudio.duration,
      bytes: blob.size,
      png: canvas.toDataURL("image/png").split(",")[1],
      encoded,
    }
  }, process.env.FULL_CAPTION_EXPORT === "1")
  assert.ok(
    result.yellow > 50,
    `No burned-in highlighted captions: ${result.yellow}`,
  )
  for (const [pack, pixels] of Object.entries(result.packs))
    assert.ok(pixels > 100, `${pack} produced no caption pixels`)
  assert.ok(result.duration >= 1.1 && result.channels > 0)
  assert.ok(result.rms > 0.001, "Captions + mixed audio output is silent")
  if (process.env.FULL_CAPTION_EXPORT === "1")
    assert.ok(
      result.mixedDuration >= 17.4,
      "Full BRAND STRATEGY export was truncated",
    )
  await mkdir(".production/qa/captions", { recursive: true })
  await writeFile(
    ".production/qa/captions/burned-in.mp4",
    Buffer.from(result.encoded, "base64"),
  )
  await writeFile(
    ".production/qa/captions/burned-in.png",
    Buffer.from(result.png, "base64"),
  )
  console.log(
    JSON.stringify({
      packs: result.packs,
      yellow: result.yellow,
      rms: result.rms,
      duration: result.duration,
      channels: result.channels,
      bytes: result.bytes,
      mixedDuration: result.mixedDuration,
    }),
  )
} finally {
  await browser.close({ silent: true })
}
