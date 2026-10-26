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
  client.on("Runtime.exceptionThrown", (e) =>
    errors.push(
      e.exceptionDetails?.exception?.description || e.exceptionDetails?.text,
    ),
  )
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
    localStorage.clear();
    localStorage.setItem("yt-owner-auth", JSON.stringify({access_token:"mock-owner",refresh_token:"mock-refresh",expires_at:Date.now()+3600000}));
    window.audioTest={generations:[],metadata:0,started:[],failPreflight:true,exportUi:${process.env.EXPORT_UI === "1"}};
    const compressor=AudioContext.prototype.createDynamicsCompressor;
    AudioContext.prototype.createDynamicsCompressor=function(){
      const node=compressor.call(this),analyser=this.createAnalyser(),connect=node.connect.bind(node);
      analyser.fftSize=8192;
      node.connect=(destination)=>{connect(analyser);analyser.connect(destination);return destination};
      window.audioTest.analyser=analyser;window.audioTest.context=this;return node;
    };
    const bufferSource=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){
      const node=bufferSource.call(this),start=node.start.bind(node);
      node.start=(at,offset=0)=>{window.audioTest.started.push({at,offset});return start(at,offset)};return node;
    };
    const actual=window.fetch.bind(window);
    const fixtures={};
    async function sample(kind="voice"){
      if(fixtures[kind])return fixtures[kind];
      const engine=await import("/src/audio/engine.ts");
      const context=new AudioContext(),buffer=context.createBuffer(1,44100*3,44100);
      for(let i=0;i<44100*3;i++)buffer.getChannelData(0)[i]=.1*Math.sin(2*Math.PI*({voice:440,sfx:880,music:1320}[kind])*i/44100);
      fixtures[kind]=URL.createObjectURL(engine.wav(buffer));await context.close();return fixtures[kind];
    }
    window.fetch=async(input,init)=>{
      const url=String(input);
      if(url.includes("api.elevenlabs.io"))throw new Error("Provider calls forbidden in UI test");
      if(!url.includes(".supabase.co"))return actual(input,init);
      let data={};const voice={id:"catalogVoice",name:"Clara",labels:{language:"Spanish",accent:"Spain"},previewUrl:await sample()};
      if(url.endsWith("/auth/status"))data={setup:false};
      else if(url.endsWith("/studio/session"))data={authenticated:true,authorized:true,userId:"mock",reason:"authorized",message:"Mock owner"};
      else if(url.endsWith("/audio/status"))data={configured:true,last4:"test",revision:1};
      else if(url.endsWith("/audio/preflight")){
        if(window.audioTest.failPreflight)return Response.json({error:"Prueba de escritura rechazada",code:"storage_permission_denied",operation:"preflight_audio_upload"},{status:503});
        data={ready:true};
      }
      else if(url.endsWith("/audio/connection"))return Response.json({error:"Subscription-read permission denied",code:"eleven_403"},{status:403});
      else if(url.endsWith("/audio/voices"))data={voices:[voice]};
      else if(url.includes("/audio/voices/")){window.audioTest.metadata++;data={voice:{...voice,id:"customVoice",name:"Mi voz"}}}
      else if(url.endsWith("/audio/generate")){
        window.audioTest.generations.push(JSON.parse(init.body));
        if(JSON.parse(init.body).kind==="sfx" && JSON.parse(init.body).text.length>450)
          return Response.json({error:"SFX prompt exceeds 450 characters",code:"eleven_400_text_too_long"},{status:400});
        if(window.audioTest.failSfx && JSON.parse(init.body).kind==="sfx")
          return Response.json({error:"El proveedor rechazó el permiso de SFX (prueba local)",code:"eleven_403"},{status:403});
        data={id:"mock-generated-"+window.audioTest.generations.length,url:await sample(JSON.parse(init.body).kind),words:[],timingSource:"estimated",cacheHit:false};
      }
      else if(url.includes("/audio/state/"))data=init?.method==="POST"?{saved:true}:{state:null};
      else if(url.endsWith("/studio/projects"))data={projects:[]};
      else if(url.includes("/studio/projects/"))data={project:null};
      else if(url.endsWith("/studio/assets"))data={assets:[]};
      return Response.json(data);
    };
  `,
  })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/#video/brand-strategy`,
    timeout: 30000,
  })
  const result = await page.evaluate(async () => {
    const wait = async (fn) => {
      for (let i = 0; i < 300; i++) {
        if (fn()) return
        await new Promise((r) => setTimeout(r, 50))
      }
      throw new Error("UI condition timed out")
    }
    await wait(() => document.querySelector(".sound-studio audio"))
    const root = document.querySelector(".sound-studio")
    const button = (label) =>
      [...root.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === label,
      )
    if (
      [...root.querySelectorAll("button")].filter(
        (b) => b.textContent.trim() === "Generar voz + SFX + música",
      ).length !== 1
    )
      throw new Error("Expected one generation action")
    const set = (element, value) => {
      const proto =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value)
      element.dispatchEvent(new Event("input", { bubbles: true }))
    }
    const sample = root.querySelector("audio")
    sample.play().catch(() => {})
    await new Promise((r) => setTimeout(r, 100))
    sample.pause()
    const previewGenerations = window.audioTest.generations.length
    set(root.querySelector('[aria-label="Voice ID"]'), "customVoice")
    await wait(
      () =>
        root.querySelector('[aria-label="Voice ID"]').value === "customVoice",
    )
    button("Buscar voz por ID").click()
    await wait(
      () =>
        root.innerText.includes("Mi voz") &&
        !button("Buscar voz por ID").disabled,
    )
    set(root.querySelector("textarea"), "Hola, esta es mi narración.")
    await new Promise((r) => setTimeout(r, 100))
    button("Generar voz + SFX + música").click()
    await wait(
      () =>
        root.innerText.includes("Prueba de escritura rechazada") &&
        !button("Generar voz + SFX + música").disabled,
    )
    if (window.audioTest.generations.length !== 0)
      throw new Error(
        "A failed storage preflight must prevent all paid requests",
      )
    window.audioTest.failPreflight = false
    button("Generar voz + SFX + música").click()
    await wait(
      () =>
        window.audioTest.generations.length === 3 &&
        button("Generar voz + SFX + música") &&
        !button("Generar voz + SFX + música").disabled,
    )
    button("Generar voz + SFX + música").click()
    await wait(
      () =>
        button("Generar voz + SFX + música") &&
        !button("Generar voz + SFX + música").disabled,
    )
    const callsAfterSecondClick = window.audioTest.generations.length
    document.querySelector('[aria-label="Reproducir estudio"]').click()
    await wait(
      () =>
        window.audioTest.started.length >= 3 &&
        document.querySelector('[aria-label="Pausar estudio"]'),
    )
    await new Promise((r) => setTimeout(r, 250))
    const power = (frequency) => {
      const data = new Float32Array(window.audioTest.analyser.fftSize)
      window.audioTest.analyser.getFloatTimeDomainData(data)
      let sin = 0,
        cos = 0
      for (let i = 0; i < data.length; i++) {
        sin +=
          data[i] *
          Math.sin(
            (2 * Math.PI * frequency * i) / window.audioTest.context.sampleRate,
          )
        cos +=
          data[i] *
          Math.cos(
            (2 * Math.PI * frequency * i) / window.audioTest.context.sampleRate,
          )
      }
      return (2 * Math.hypot(sin, cos)) / data.length
    }
    const audibleVoice = power(440)
    const contextRunning = window.audioTest.context.state
    const videoAdvanced =
      Number(document.querySelector(".ml-time").innerText.split("/")[0]) > 0
    root.querySelector('[aria-label="Silenciar Música"]').click()
    const musicSlider = root.querySelector('[aria-label="Volumen Música"]')
    set(musicSlider, "0.12")
    await wait(() => root.querySelector('[aria-label="Activar Música"]'))
    await new Promise((r) => setTimeout(r, 100))
    set(root.querySelector('[aria-label="Volumen Voz"]'), "0.25")
    await new Promise((r) => setTimeout(r, 350))
    const quietVoice = power(440),
      mutedMusic = power(1320)
    document.querySelector('[aria-label="Pausar estudio"]').click()
    await wait(() =>
      document.querySelector('[aria-label="Reproducir estudio"]'),
    )
    set(document.querySelector('[aria-label="Posición del estudio"]'), "0.7")
    await new Promise((r) => setTimeout(r, 100))
    document.querySelector('[aria-label="Reproducir estudio"]').click()
    await wait(() => window.audioTest.started.length >= 6)
    const resumedOffset = window.audioTest.started[3].offset
    document.querySelector('[aria-label="Pausar estudio"]').click()
    const inlineVideo = root.querySelector(
      'video[aria-label="Vídeo con voz, SFX y música"]',
    )
    inlineVideo.currentTime = 0
    await inlineVideo.play()
    await wait(() => window.audioTest.started.length >= 9)
    const inlineAudioRunning = window.audioTest.context.state
    inlineVideo.pause()
    root.querySelector('[aria-label="Silenciar Voz"]').click()
    await new Promise((r) => setTimeout(r, 50))
    inlineVideo.currentTime = 0
    await inlineVideo.play()
    await new Promise((r) => setTimeout(r, 350))
    const isolatedSfx = power(880)
    const isolatedVoice = power(440)
    inlineVideo.pause()
    root.querySelector('[aria-label="Activar Voz"]').click()
    const captionSwitch = document.querySelector(".ml-caption-toolbar input")
    if (!captionSwitch.checked) captionSwitch.click()
    const { currentExportCaptions } = await import(
      "/src/media/caption-export.ts"
    )
    await wait(() => currentExportCaptions("brand-strategy")?.words.length)
    const exportCaptions = currentExportCaptions("brand-strategy")
    const exportedFiles = []
    if (window.audioTest.exportUi) {
      const click = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function () {
        if (!this.download || !this.href.startsWith("blob:"))
          return click.call(this)
        const filename = this.download
        void fetch(this.href)
          .then((response) => response.blob())
          .then((blob) => exportedFiles.push({ filename, blob }))
      }
      const waitForFile = async (count) => {
        for (let i = 0; i < 6500; i++) {
          if (exportedFiles.length >= count) return
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
        throw new Error(
          "Export button did not produce a file: " +
            document.body.innerText.slice(-2500),
        )
      }
      document.querySelector(".ml-stage-footer .ml-button-download").click()
      await waitForFile(1)
      button("Exportar MP4").click()
      await waitForFile(2)
      HTMLAnchorElement.prototype.click = click
      for (const entry of exportedFiles) {
        const url = URL.createObjectURL(entry.blob)
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
        canvas.width = 360
        canvas.height = 640
        const graphics = canvas.getContext("2d")
        graphics.drawImage(video, 0, 0, 360, 640)
        const pixels = graphics.getImageData(0, 480, 360, 160).data
        entry.captionPixels = 0
        for (let p = 0; p < pixels.length; p += 4)
          if (pixels[p + 2] > 200 && pixels[p + 2] > pixels[p] * 1.1)
            entry.captionPixels++
        entry.duration = video.duration
        entry.bytes = entry.blob.size
        URL.revokeObjectURL(url)
        delete entry.blob
      }
    }
    const engine = await import("/src/audio/engine.ts")
    const saved = engine.readAudioState("brand-strategy")
    const snapshot = {
      previewGenerations,
      callsAfterSecondClick,
      audibleVoice,
      quietVoice,
      mutedMusic,
      contextRunning,
      videoAdvanced,
      resumedOffset,
      inlineAudioRunning,
      isolatedSfx,
      isolatedVoice,
      exportedFiles,
      exportedCaptionText: exportCaptions.words
        .map((word) => word.text)
        .join(" "),
      metadata: window.audioTest.metadata,
      generations: window.audioTest.generations.map((g) => ({
        kind: g.kind,
        voiceId: g.voiceId,
        text: g.text,
        duration: g.duration,
      })),
      muted: saved.strips.music.mute,
      musicVolume: saved.strips.music.volume,
      active: engine.activeKinds(saved),
      voices: saved.clips.filter((c) => c.kind === "voice").length,
      exportText: root.querySelector(".sound-export").innerText,
    }
    const textareas = root.querySelectorAll("textarea")
    window.audioTest.failSfx = true
    set(textareas[1], "Warm instrumental for isolated regression")
    set(textareas[2], "Clear camera shutter for isolated regression")
    await new Promise((resolve) => setTimeout(resolve, 100))
    const beforeFailure = window.audioTest.generations.length
    button("Generar voz + SFX + música").click()
    await wait(
      () =>
        root.innerText.includes("Generación parcial.") &&
        !button("Generar solo Música").disabled,
    )
    const rejectedSfxCalls = window.audioTest.generations
      .slice(beforeFailure)
      .map((body) => body.kind)
    const partial = engine.readAudioState("brand-strategy")
    const diagnosticVisible =
      root.innerText.includes("eleven_403") &&
      root.innerText.includes("HTTP 403")
    set(root.querySelector('[aria-label="Voice ID"]'), "")
    set(textareas[1], "A second independent music prompt")
    await new Promise((resolve) => setTimeout(resolve, 100))
    const beforeMusicOnly = window.audioTest.generations.length
    button("Generar solo Música").click()
    await wait(
      () =>
        root.innerText.includes("Música lista.") &&
        !button("Generar solo Música").disabled,
    )
    const musicOnlyCalls = window.audioTest.generations
      .slice(beforeMusicOnly)
      .map((body) => body.kind)
    const musicOnly = engine.readAudioState("brand-strategy")
    window.audioTest.failSfx = false
    const beforeSfxOnly = window.audioTest.generations.length
    button("Generar solo SFX").click()
    await wait(
      () =>
        root.innerText.includes("SFX lista.") &&
        !button("Generar solo SFX").disabled,
    )
    const sfxOnlyCalls = window.audioTest.generations
      .slice(beforeSfxOnly)
      .map((body) => body.kind)
    const sfxOnly = engine.readAudioState("brand-strategy")
    return {
      ...snapshot,
      rejectedSfxCalls,
      musicOnlyCalls,
      sfxOnlyCalls,
      diagnosticVisible,
      originalVoicePreserved:
        sfxOnly.clips.find((c) => c.kind === "voice").asset ===
        saved.clips.find((c) => c.kind === "voice").asset,
      previousSfxPreservedOnRejection:
        partial.clips.find((c) => c.kind === "sfx").asset ===
        saved.clips.find((c) => c.kind === "sfx").asset,
      independentMusicPreserved:
        sfxOnly.clips.find((c) => c.kind === "music").asset ===
        musicOnly.clips.find((c) => c.kind === "music").asset,
    }
  })
  assert.equal(result.previewGenerations, 0)
  assert.deepEqual(result.rejectedSfxCalls, ["sfx", "music"])
  assert.deepEqual(result.musicOnlyCalls, ["music"])
  assert.deepEqual(result.sfxOnlyCalls, ["sfx"])
  assert.equal(result.diagnosticVisible, true)
  assert.equal(result.originalVoicePreserved, true)
  assert.equal(result.previousSfxPreservedOnRejection, true)
  assert.equal(result.independentMusicPreserved, true)
  assert.equal(result.metadata, 1)
  assert.equal(result.generations[0].voiceId, "customVoice")
  assert.equal(result.generations[0].text, "Hola, esta es mi narración.")
  assert.equal(result.generations[1].kind, "sfx")
  assert.match(result.generations[1].text, /chess pieces/i)
  assert.match(result.generations[1].text, /Hola, esta es mi narración/)
  assert.equal(result.generations[1].duration, 17.5)
  assert.ok(result.generations[1].text.length <= 450)
  assert.equal(result.exportedCaptionText, "Hola, esta es mi narración.")
  assert.ok(result.isolatedSfx > 0.03, JSON.stringify(result))
  assert.ok(result.isolatedVoice < 0.005, JSON.stringify(result))
  if (process.env.EXPORT_UI === "1") {
    assert.equal(result.exportedFiles.length, 2)
    for (const file of result.exportedFiles) {
      assert.ok(file.duration > 17.3, JSON.stringify(file))
      assert.ok(file.bytes > 10000, JSON.stringify(file))
      assert.ok(file.captionPixels > 10, JSON.stringify(file))
    }
  }
  assert.equal(result.generations[2].kind, "music")
  assert.ok(result.generations[2].duration >= 3)
  assert.equal(result.callsAfterSecondClick, 3)
  assert.equal(result.contextRunning, "running")
  assert.equal(result.inlineAudioRunning, "running")
  assert.equal(result.videoAdvanced, true)
  assert.ok(result.audibleVoice > 0.04, JSON.stringify(result))
  assert.ok(
    result.quietVoice > 0.01 && result.quietVoice < 0.04,
    JSON.stringify(result),
  )
  assert.ok(result.mutedMusic < 0.005, JSON.stringify(result))
  assert.ok(Math.abs(result.resumedOffset - 0.7) < 0.02, JSON.stringify(result))
  assert.equal(result.voices, 1)
  assert.equal(result.muted, true)
  assert.equal(result.musicVolume, 0.12)
  assert.ok(!result.active.includes("music"))
  assert.ok(!result.exportText.includes("Música 12%"))
  assert.deepEqual(errors, [])
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await page.evaluate(() =>
    document.querySelector(".sound-studio").scrollIntoView(),
  )
  const desktop = await client.send("Page.captureScreenshot", { format: "png" })
  await writeFile(
    "/tmp/audio-panel-desktop.png",
    Buffer.from(desktop.value.data, "base64"),
  )
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  const mobile = await page.evaluate(() => {
    const panel = document.querySelector(".sound-studio")
    return { width: panel.clientWidth, content: panel.scrollWidth }
  })
  assert.ok(mobile.content <= mobile.width + 1, JSON.stringify(mobile))
  console.log(
    "Audio workflow verified in browser; cloud, generation and previews use local fixtures:",
    JSON.stringify(result),
  )
} finally {
  await browser.close({ silent: true })
}
