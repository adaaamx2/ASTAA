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
  const client = page._client()
  await client.send("Runtime.enable")
  client.on("Runtime.consoleAPICalled", (event) => {
    const values = event.args
      .map((arg) => arg.value)
      .filter((value) => typeof value === "string")
    if (values[0] === "4K QA") console.log(values.slice(1).join(" "))
  })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/`,
    timeout: 30000,
  })
  const result = await page.evaluate(
    async ({ fullLength, testButton }) => {
      const { export4kMp4 } = await import("/src/media/export-4k.ts")
      const engine = await import("/src/audio/engine.ts")
      const { silentVideo } = await import("/scripts/audio-fixture.ts")
      const { mixMp4 } = await import("/src/media/mux.ts")
      const context = new AudioContext()
      const duration = fullLength ? 17.5 : 2.1
      const urls = []
      const fixture = await silentVideo()
      const fixtureUrl = URL.createObjectURL(fixture)
      urls.push(fixtureUrl)
      const source = {
        url: fullLength ? "/exports/study-brand-strategy.mp4" : fixtureUrl,
        filename: "fixture.mp4",
        mime: "video/mp4",
      }
      const state = engine.defaultState(duration)
      for (const [kind, frequency] of [
        ["voice", 440],
        ["sfx", 880],
        ["music", 1320],
      ]) {
        const buffer = context.createBuffer(
          1,
          Math.ceil(44100 * duration),
          44100,
        )
        for (let i = 0; i < buffer.length; i++)
          buffer.getChannelData(0)[i] =
            0.1 * Math.sin((2 * Math.PI * frequency * i) / 44100)
        const asset = `4k-fixture-${kind}`
        await engine.putAudio(asset, engine.wav(buffer))
        state.clips.push({
          id: asset,
          asset,
          kind,
          start: 0,
          duration,
          description: "Local test tone, not ElevenLabs audio",
        })
      }
      state.strips.music.mute = true
      state.strips.sfx.volume = 0.5
      const mix = await engine.tracksForExport(state)
      const progress = []
      const captions = {
        words: [
          {
            text: "Captions",
            start: 0,
            end: 1,
            sceneId: 1,
            source: "estimated",
          },
          {
            text: "4K",
            start: 1,
            end: duration,
            sceneId: 1,
            source: "estimated",
          },
        ],
        pack: "karaoke",
        width: 1080,
        height: 1920,
        viewport: { width: 540, height: 960 },
        fps: 60,
        accent: "#ffd18a",
      }
      const started = performance.now()
      const diagnostics = []
      let output
      let buttonFilename = ""
      try {
        if (testButton) {
          const { mountExport4kFixture } = await import(
            "/scripts/export-4k-fixture.tsx"
          )
          const { mp4Metadata } = await import("/src/media/mp4-metadata.ts")
          const projectId = "isolated-4k-button-test"
          engine.saveAudioState(projectId, state)
          const respond = (event) => {
            if (event.detail.id === projectId) event.detail.captions = captions
          }
          window.addEventListener("studio-export-captions", respond)
          const mounted = mountExport4kFixture(source, projectId)
          const click = HTMLAnchorElement.prototype.click
          let captured = null
          HTMLAnchorElement.prototype.click = function () {
            if (!this.download || !this.href.startsWith("blob:"))
              return click.call(this)
            const filename = this.download
            void fetch(this.href)
              .then((response) => response.blob())
              .then((blob) => {
                captured = { blob, filename }
              })
          }
          try {
            for (
              let i = 0;
              i < 100 && !mounted.element.querySelector("button");
              i++
            )
              await new Promise((resolve) => setTimeout(resolve, 50))
            mounted.element.querySelector("button").click()
            for (let i = 0; i < 19000 && !captured; i++) {
              const message =
                mounted.element.querySelector('[role="status"]')?.textContent ||
                ""
              if (message && progress.at(-1) !== message) progress.push(message)
              if (
                i > 20 &&
                !mounted.element.querySelector("button").disabled &&
                !message.startsWith("Descargado")
              )
                throw new Error(
                  message || "The new button stopped without a download",
                )
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
            if (!captured)
              throw new Error("The independent button did not download a file")
            buttonFilename = captured.filename
            output = {
              blob: captured.blob,
              ...mp4Metadata(new Uint8Array(await captured.blob.arrayBuffer())),
            }
          } finally {
            HTMLAnchorElement.prototype.click = click
            window.removeEventListener("studio-export-captions", respond)
            mounted.unmount()
          }
        } else
          output = await export4kMp4({
            source,
            tracks: mix.tracks,
            duration,
            captions,
            diagnostic: (message) => diagnostics.push(message),
            progress: (message) => {
              if (progress.at(-1) !== message) progress.push(message)
              if (
                fullLength &&
                /^4K · (tramo \d+\/\d+ · \d+ %|uniendo|comprobando)/.test(
                  message,
                )
              )
                console.log("4K QA", message)
            },
          })
      } catch (error) {
        throw new Error(
          error.message + "\n" + diagnostics.slice(-16).join("\n"),
        )
      }
      mix.release()
      const seconds = (performance.now() - started) / 1000
      const audio = await context.decodeAudioData(
        await output.blob.arrayBuffer(),
      )
      const power = (buffer, frequency) => {
        const samples = buffer.getChannelData(0)
        let sine = 0,
          cosine = 0,
          count = 0
        for (
          let i = Math.floor(buffer.sampleRate * 0.05);
          i < Math.min(samples.length, Math.floor(buffer.sampleRate * 0.2));
          i++
        ) {
          sine +=
            samples[i] *
            Math.sin((2 * Math.PI * frequency * i) / buffer.sampleRate)
          cosine +=
            samples[i] *
            Math.cos((2 * Math.PI * frequency * i) / buffer.sampleRate)
          count++
        }
        return (2 * Math.hypot(sine, cosine)) / count
      }
      const outputUrl = URL.createObjectURL(output.blob)
      urls.push(outputUrl)
      const video = document.createElement("video")
      video.muted = true
      video.src = outputUrl
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = reject
      })
      const canvas = document.createElement("canvas")
      canvas.width = 540
      canvas.height = 960
      const graphics = canvas.getContext("2d")
      const captionPixels = []
      for (const time of [0.4, 2.02]) {
        video.currentTime = time
        await new Promise((resolve) => {
          video.onseeked = resolve
        })
        graphics.drawImage(video, 0, 0, 540, 960)
        const pixels = graphics.getImageData(0, 720, 540, 220).data
        let yellow = 0
        for (let p = 0; p < pixels.length; p += 4)
          if (
            pixels[p] > 180 &&
            pixels[p + 1] > 120 &&
            pixels[p] > pixels[p + 2] * 1.3
          )
            yellow++
        captionPixels.push(yellow)
      }
      const controller = new AbortController()
      controller.abort()
      let cancelled = false
      try {
        await export4kMp4({
          source,
          tracks: [],
          duration: 0.1,
          signal: controller.signal,
          progress: () => {},
        })
      } catch (error) {
        cancelled = error.message.includes("cancelada")
      }

      const originalAudioUrl = URL.createObjectURL(engine.wav(audio))
      urls.push(originalAudioUrl)
      const original = await mixMp4(
        { url: fixtureUrl, filename: "base.mp4", mime: "video/mp4" },
        [
          {
            file: {
              url: originalAudioUrl,
              filename: "audio.wav",
              mime: "audio/wav",
            },
            volume: 1,
          },
        ],
        0.25,
        () => {},
      )
      const originalUrl = URL.createObjectURL(original)
      urls.push(originalUrl)
      const preserved = await export4kMp4({
        source: {
          url: originalUrl,
          filename: "with-original-audio.mp4",
          mime: "video/mp4",
        },
        tracks: [],
        preserveSourceAudio: true,
        progress: () => {},
      })
      const silent = await export4kMp4({
        source: { url: originalUrl, filename: "muted.mp4", mime: "video/mp4" },
        tracks: [],
        preserveSourceAudio: false,
        progress: () => {},
      })
      for (const url of urls) URL.revokeObjectURL(url)
      await context.close()
      return {
        width: output.width,
        height: output.height,
        fps: output.fps,
        duration: output.duration,
        videoDuration: video.duration,
        audioDuration: audio.duration,
        bytes: output.blob.size,
        seconds,
        voicePower: power(audio, 440),
        sfxPower: power(audio, 880),
        mutedMusicPower: power(audio, 1320),
        captionPixels,
        cancelled,
        originalAudioPreserved: preserved.hasAudio,
        allMutedHasAudio: silent.hasAudio,
        buttonFilename,
        segments: Math.max(
          0,
          ...progress.map((message) =>
            Number(message.match(/tramo \d+\/(\d+)/)?.[1] || 0),
          ),
        ),
      }
    },
    {
      fullLength: process.env.FULL_4K_EXPORT === "1",
      testButton: process.env.FOUR_K_UI === "1",
    },
  )
  assert.equal(result.width, 2160)
  assert.equal(result.height, 3840)
  assert.equal(result.fps, 60)
  assert.ok(
    result.videoDuration >= (process.env.FULL_4K_EXPORT === "1" ? 17.48 : 2.08),
    JSON.stringify(result),
  )
  assert.ok(result.voicePower > 0.05, JSON.stringify(result))
  assert.ok(
    result.sfxPower > 0.02 && result.sfxPower < 0.075,
    JSON.stringify(result),
  )
  assert.ok(result.mutedMusicPower < 0.002, JSON.stringify(result))
  assert.ok(
    result.captionPixels.every((count) => count > 100),
    JSON.stringify(result),
  )
  assert.equal(result.cancelled, true)
  assert.equal(result.originalAudioPreserved, true)
  assert.equal(result.allMutedHasAudio, false)
  assert.ok(result.segments >= 2)
  if (process.env.FOUR_K_UI === "1")
    assert.match(result.buttonFilename, /-4k-60fps\.mp4$/)
  console.log(
    "Real 4K/60 browser encode, local test audio only:",
    JSON.stringify(result),
  )
} finally {
  await browser.close({ silent: true })
}
