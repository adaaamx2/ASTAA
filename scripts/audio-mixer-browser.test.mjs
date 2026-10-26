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
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/#video/brand-strategy`,
    timeout: 30000,
  })
  const gated = await page.evaluate(async () => {
    for (
      let i = 0;
      i < 100 && !document.body.innerText.includes("ACCESO PRIVADO");
      i++
    )
      await new Promise((r) => setTimeout(r, 50))
    return {
      login: document.body.innerText.includes("ACCESO PRIVADO"),
      gallery: Boolean(document.querySelector(".wg-gallery")),
    }
  })
  assert.deepEqual(gated, { login: true, gallery: false })
  const result = await page.evaluate(async () => {
    const engine = await import("/src/audio/engine.ts")
    const { mixMp4, mixWav } = await import("/src/media/mux.ts")
    const { silentVideo } = await import("/scripts/audio-fixture.ts")
    const context = new AudioContext()
    const frequencies = { voice: 440, sfx: 880, music: 1320 }
    const state = engine.defaultState(1)
    for (const kind of engine.kinds) {
      const buffer = context.createBuffer(1, 44100, 44100),
        samples = buffer.getChannelData(0)
      for (let i = 0; i < samples.length; i++)
        samples[i] =
          0.1 * Math.sin((2 * Math.PI * frequencies[kind] * i) / 44100)
      const asset = `test-${kind}`
      await engine.putAudio(asset, engine.wav(buffer))
      state.clips.push({
        id: asset,
        asset,
        kind,
        start: 0,
        duration: 1,
        description: "Local synthetic tone, not provider audio",
      })
    }
    state.strips.music.mute = true
    engine.saveAudioState("local-test", state)
    const visual = await silentVideo(),
      visualUrl = URL.createObjectURL(visual)
    const file = { url: visualUrl, filename: "fixture.mp4", mime: "video/mp4" }
    const power = (buffer, frequency) => {
      const data = buffer.getChannelData(0),
        rate = buffer.sampleRate
      let sin = 0,
        cos = 0,
        n = 0
      for (
        let i = Math.floor(rate * 0.2);
        i < Math.min(data.length, rate * 0.7);
        i++
      ) {
        sin += data[i] * Math.sin((2 * Math.PI * frequency * i) / rate)
        cos += data[i] * Math.cos((2 * Math.PI * frequency * i) / rate)
        n++
      }
      return (2 * Math.hypot(sin, cos)) / n
    }
    const render = async () => {
      const selected = engine.readAudioState("local-test")
      const mix = await engine.tracksForExport(selected)
      try {
        const blob = await mixMp4(file, mix.tracks, 1, () => {})
        const audio = await context.decodeAudioData(await blob.arrayBuffer())
        return {
          count: mix.tracks.length,
          summary: mix.summary,
          musicPower: power(audio, 1320),
          voicePower: power(audio, 440),
          size: blob.size,
        }
      } finally {
        mix.release()
      }
    }
    const muted = await render()
    state.strips.music.mute = false
    engine.saveAudioState("local-test", state)
    const unmuted = await render()
    state.strips.music.mute = true
    state.strips.sfx.mute = true
    state.strips.voice.volume = 0.25
    engine.saveAudioState("local-test", state)
    const quiet = await render()
    state.strips.voice.volume = 1
    state.strips.music.mute = false
    state.strips.sfx.mute = false
    state.strips.voice.solo = true
    const solo = engine.activeKinds(state)
    state.strips.voice.solo = false
    const mix = await engine.tracksForExport(state)
    const wav = await mixWav(mix.tracks, 1, false, () => {})
    mix.release()
    const wavAudio = await context.decodeAudioData(await wav.arrayBuffer())
    for (const kind of engine.kinds) state.strips[kind].mute = true
    const none = await engine.tracksForExport(state)
    const silent = await mixMp4(file, none.tracks, 1, () => {})
    none.release()
    let silentHasAudio = true
    try {
      await context.decodeAudioData(await silent.arrayBuffer())
    } catch {
      silentHasAudio = false
    }
    const faint = context.createBuffer(1, 44100, 44100)
    for (let i = 0; i < faint.length; i++)
      faint.getChannelData(0)[i] =
        0.005 * Math.sin((2 * Math.PI * 880 * i) / 44100)
    const audibility = engine.sfxAudibility(faint)
    await engine.putAudio("faint-sfx", engine.wav(faint))
    const boosted = await engine.renderTrack(
      {
        ...state,
        clips: [
          {
            id: "faint",
            asset: "faint-sfx",
            kind: "sfx",
            start: 0,
            duration: 1,
            description: "quiet test effect",
          },
        ],
      },
      "sfx",
    )
    const boostedSfx = power(boosted, 880)
    const silentDetected = engine.sfxAudibility(
      context.createBuffer(1, 44100, 44100),
    ).silent
    URL.revokeObjectURL(visualUrl)
    await context.close()
    return {
      muted,
      unmuted,
      quiet,
      solo,
      silentHasAudio,
      wavDuration: wavAudio.duration,
      audibility,
      boostedSfx,
      silentDetected,
    }
  })
  assert.equal(result.muted.count, 2)
  assert.equal(result.unmuted.count, 3)
  assert.ok(result.muted.musicPower < 0.001, JSON.stringify(result))
  assert.ok(result.unmuted.musicPower > 0.01, JSON.stringify(result))
  assert.ok(result.muted.voicePower > 0.05, JSON.stringify(result))
  assert.equal(result.quiet.count, 1)
  assert.ok(
    result.quiet.voicePower > 0.015 && result.quiet.voicePower < 0.035,
    JSON.stringify(result),
  )
  assert.deepEqual(result.solo, ["voice"])
  assert.equal(result.silentHasAudio, false)
  assert.ok(result.wavDuration >= 0.99)
  assert.ok(result.audibility.gain > 1)
  assert.ok(result.boostedSfx > 0.035)
  assert.equal(result.silentDetected, true)
  console.log(
    "Real browser + WASM export of locally generated tones; no provider calls:",
    JSON.stringify(result),
  )
} finally {
  await browser.close({ silent: true })
}
