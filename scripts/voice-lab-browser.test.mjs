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
  const client = page._client()
  const errors = []
  await client.send("Runtime.enable")
  client.on("Runtime.exceptionThrown", (event) =>
    errors.push(
      event.exceptionDetails?.exception?.description ||
        event.exceptionDetails?.text,
    ),
  )
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
    localStorage.setItem("yt-owner-auth",JSON.stringify({access_token:"fixture-owner-not-real",refresh_token:"fixture",expires_at:Date.now()+3600000}));
    if(!localStorage.getItem("voice-lab-canary"))localStorage.setItem("voice-lab-canary","Original projects must not change");
    const actual=window.fetch.bind(window),storageKey="voice-lab-fixture-cloud";
    const store=JSON.parse(localStorage.getItem(storageKey)||"null")||{characters:[],audio:[],projects:[],jobs:[],media:[],tts:0,alignment:0,uploads:0,oldCalls:[],oldAssets:{},recoveries:0};
    const save=()=>localStorage.setItem(storageKey,JSON.stringify(store));
    window.voiceLabFixture=store;
    function wave(frequency=440,duration=1.2){
      const rate=8000,n=Math.round(rate*duration),bytes=new Uint8Array(44+n*2),v=new DataView(bytes.buffer);
      const text=(at,t)=>[...t].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
      text(0,"RIFF");v.setUint32(4,36+n*2,true);text(8,"WAVE");text(12,"fmt ");v.setUint32(16,16,true);
      v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);
      v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,"data");v.setUint32(40,n*2,true);
      for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.sin(2*Math.PI*frequency*i/rate)*3276,true);
      return "data:audio/wav;base64,"+btoa(String.fromCharCode(...bytes));
    }
    window.voiceLabWave=wave;
    function words(text,duration=1.2){const list=text.replace(/\\[[^\\]]*\\]/g,"").trim().split(/\\s+/);return list.map((text,i)=>({text,start:i*duration/list.length,end:(i+1)*duration/list.length}))}
    window.fetch=async(input,init={})=>{
      const url=String(input);
      if(url.includes("api.elevenlabs.io"))throw new Error("Real provider requests are forbidden in this fixture");
      if(!url.includes(".supabase.co"))return actual(input,init);
      const path=new URL(url).pathname,body=init.body instanceof FormData?init.body:init.body?JSON.parse(init.body):undefined;
      const reply=(data,status=200)=>Response.json(data,{status});
      if(path.endsWith("/auth/status"))return reply({setup:false});
      if(path.endsWith("/studio/session"))return reply({authenticated:true,authorized:true,userId:"fixture-owner",reason:"authorized"});
      if(path.endsWith("/audio/voices"))return reply({voices:[{id:"fixtureVoice",name:"Voz de prueba",labels:{language:"Spanish"},previewUrl:wave()}]});
      if(path.endsWith("/audio/generate")){
        if(body.kind==="voice")throw new Error("The selected library voice must never be regenerated");
        store.oldCalls.push(body.kind);
        const id=(body.kind==="sfx"?"a":"b").repeat(64),url=wave(body.kind==="sfx"?880:1320,body.duration);
        store.oldAssets[id]=url;save();return reply({id,url,words:[],cacheHit:false});
      }
      if(path.includes("/audio/assets/")){store.recoveries++;save();return reply({url:store.oldAssets[path.split("/").at(-1)]})}
      const marker="/studio/voice-lab",relative=path.slice(path.indexOf(marker)+marker.length);
      if(path.includes(marker)){
        if(relative==="/bootstrap")return reply({revision:1,...store});
        if(relative==="/upload"){
          const file=body.get("file"),kind=body.get("kind"),id=crypto.randomUUID();
          const url=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(file)});
          const record={id,name:body.get("name")||file.name,characterId:body.get("characterId")||"",script:body.get("script")||"",duration:Number(body.get("duration"))||0,words:[],origin:"uploaded",timingSource:"unavailable",mimeType:file.type,url,createdAt:new Date().toISOString()};
          if(kind==="image")store.media.push(record);else{store.audio.unshift(record);store.uploads++}
          save();return reply({record});
        }
        if(relative==="/characters"){
          const character={...body,id:body.id||crypto.randomUUID(),imageUrl:store.media.find(m=>m.id===body.imageId)?.url};
          store.characters=store.characters.filter(c=>c.id!==character.id).concat(character);save();return reply({character});
        }
        if(relative==="/jobs"){const job={...body,id:body.jobId,takes:{}};store.jobs.push(job);save();return reply({job})}
        if(relative.startsWith("/jobs/")){
          const parts=relative.split("/"),job=store.jobs.find(j=>j.id===parts[2]),take=Number(parts[4]);
          if(job.takes[take])return reply({audio:job.takes[take],cacheHit:true});
          if(init.method!=="POST")return reply({error:"No recoverable take"},409);
          store.tts++;
          const record={id:crypto.randomUUID(),name:job.name+" · toma "+(take+1),script:job.script,taggedScript:job.taggedScript,characterId:job.characterId,voiceId:job.voiceId,duration:1.2,words:words(job.script),origin:"generated",timingSource:"provider-character-alignment",take:take+1,jobId:job.id,url:wave(take===0?440:540),mimeType:"audio/mpeg",createdAt:new Date().toISOString()};
          job.takes[take]=record;store.audio.unshift(record);save();return reply({audio:record});
        }
        if(relative.startsWith("/audio/")){
          const parts=relative.split("/"),record=store.audio.find(a=>a.id===parts[2]);
          if(!record)return reply({error:"missing"},404);
          if(parts[3]==="duration"){record.duration=body.duration;save();return reply({saved:true})}
          if(parts[3]==="transcript"){record.script=body.script;record.words=[];record.timingSource="unavailable";save();return reply({audio:record})}
          if(parts[3]==="align"){store.alignment++;record.script=body.script;record.words=words(body.script);record.timingSource="forced-alignment";save();return reply({audio:record})}
          store.recoveries++;save();return reply({audio:record});
        }
        if(relative==="/projects"){
          const old=store.projects.find(p=>p.id===body.id),audio=store.audio.find(a=>a.id===body.audioId);
          const project={...body,id:body.id||crypto.randomUUID(),duration:audio.duration,words:audio.words.length?audio.words:words(audio.script),timingSource:audio.words.length?audio.timingSource:"estimated",tracks:old?.tracks||{},revision:(old?.revision||0)+1,createdAt:new Date().toISOString()};
          store.projects=store.projects.filter(p=>p.id!==project.id).concat(project);save();return reply({project});
        }
        if(relative.startsWith("/projects/")){const project=store.projects.find(p=>p.id===relative.split("/")[2]);project.tracks[body.kind]={id:body.assetId,duration:body.duration};project.revision++;save();return reply({project})}
      }
      if(path.endsWith("/studio/projects"))return reply({projects:[]});
      return reply({error:"Unmocked cloud request: "+path},404);
    };
  `,
  })
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/#characters`,
    timeout: 30000,
  })
  const first = await page.evaluate(async () => {
    const wait = async (fn) => {
      for (let i = 0; i < 1600; i++) {
        if (fn()) return
        await new Promise((r) => setTimeout(r, 50))
      }
      throw new Error("UI timeout: " + document.body.innerText.slice(-2400))
    }
    const button = (text) =>
      [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === text,
      )
    const field = (label) =>
      [...document.querySelectorAll(".sound-field")]
        .find((el) => el.querySelector("span")?.textContent.startsWith(label))
        ?.querySelector("input,textarea,select")
    const set = (element, value) => {
      const proto =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value)
      element.dispatchEvent(new Event("input", { bubbles: true }))
    }
    await wait(
      () =>
        button("Cargar catálogo gratuito") &&
        !document.body.innerText.includes(
          "La biblioteca remota no está confirmada",
        ),
    )
    button("Cargar catálogo gratuito").click()
    await wait(() => field("Voz del catálogo")?.options.length > 1)
    set(field("O pega un Voice ID"), "fixtureVoice")
    set(field("Nombre"), "Nora")
    field("Nombre").closest("details").open = true
    set(field("Personalidad"), "Narradora curiosa y cercana")
    const portrait = document.createElement("canvas")
    portrait.width = 120
    portrait.height = 180
    const graphics = portrait.getContext("2d")
    graphics.fillStyle = "#c0a2f6"
    graphics.fillRect(0, 0, 120, 180)
    graphics.fillStyle = "#21152e"
    graphics.font = "bold 80px sans-serif"
    graphics.fillText("N", 25, 120)
    const blob = await new Promise((resolve) =>
      portrait.toBlob(resolve, "image/png"),
    )
    const imageInput = field("Imagen propia")
    Object.defineProperty(imageInput, "files", {
      configurable: true,
      value: [new File([blob], "nora.png", { type: "image/png" })],
    })
    imageInput.dispatchEvent(new Event("change", { bubbles: true }))
    await new Promise((r) => setTimeout(r, 100))
    button("Guardar personaje").click()
    await wait(() =>
      document.querySelector(".vl-character")?.textContent.includes("Nora"),
    )
    set(field("Título del audio"), "Una historia de Nora")
    set(field("Tu guion original"), "Hola. Esta es mi historia.")
    await new Promise((r) => setTimeout(r, 100))
    button("Auto-tag · propuesta local").click()
    await wait(() =>
      field("Guion con interpretación").value.includes("[playful]"),
    )
    const original = field("Tu guion original").value
    field("Autorizo dos solicitudes").click()
    await new Promise((r) => setTimeout(r, 50))
    button("Crear y guardar 2 tomas").click()
    await wait(
      () =>
        window.voiceLabFixture.audio.length === 2 &&
        document.body.innerText.includes("Dos tomas guardadas.") &&
        Boolean(button("Crear y guardar 2 tomas")),
    )
    if (field("Autorizo dos solicitudes").checked)
      throw new Error("Paid authorization was not reset")
    return {
      original,
      tts: window.voiceLabFixture.tts,
      characters: window.voiceLabFixture.characters.length,
      imageStored: Boolean(window.voiceLabFixture.characters[0].imageUrl),
      takeNames: window.voiceLabFixture.audio.map((a) => a.name),
    }
  })
  assert.equal(first.original, "Hola. Esta es mi historia.")
  assert.equal(first.tts, 2)
  assert.equal(first.characters, 1)
  assert.equal(first.imageStored, true)
  assert.equal(new Set(first.takeNames).size, 2)
  await page.goto({
    url: `http://localhost:${process.env.PORT || 3000}/#characters`,
    timeout: 30000,
  })
  const result = await page.evaluate(async () => {
    const wait = async (fn) => {
      for (let i = 0; i < 2400; i++) {
        if (fn()) return
        await new Promise((r) => setTimeout(r, 50))
      }
      throw new Error("UI timeout: " + document.body.innerText.slice(-2500))
    }
    const button = (text) =>
      [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === text,
      )
    const set = (el, value) => {
      const p =
        el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(p, "value").set.call(el, value)
      el.dispatchEvent(new Event("input", { bubbles: true }))
    }
    await wait(() => document.querySelectorAll(".vl-audio").length === 2)
    if (window.voiceLabFixture.tts !== 2)
      throw new Error("Reload regenerated voice")
    const take2 = [...document.querySelectorAll(".vl-audio")].find((card) =>
      card.innerText.includes("toma 2"),
    )
    take2.querySelector("button").click()
    await new Promise((r) => setTimeout(r, 100))
    button("Preparar vídeo con este audio").click()
    await wait(
      () =>
        window.voiceLabFixture.projects.length === 1 &&
        button("Renderizar composición del personaje"),
    )
    const ttsBefore = window.voiceLabFixture.tts,
      oldBefore = window.voiceLabFixture.oldCalls.length
    if (oldBefore !== 0)
      throw new Error("Preparing a video spent SFX/music credits")
    button("Renderizar composición del personaje").click()
    await wait(
      () =>
        button("Exportar vídeo · audio y captions") &&
        !button("Exportar vídeo · audio y captions").disabled,
    )
    button("Generar solo SFX · con créditos").click()
    await wait(
      () =>
        window.voiceLabFixture.oldCalls.length === 1 &&
        document.body.innerText.includes("SFX guardada.") &&
        !button("Generar solo SFX · con créditos").disabled,
    )
    button("Generar solo música · con créditos").click()
    await wait(
      () =>
        window.voiceLabFixture.oldCalls.length === 2 &&
        document.body.innerText.includes("Música guardada.") &&
        !button("Generar solo música · con créditos").disabled,
    )
    await new Promise((resolve, reject) => {
      const r = indexedDB.deleteDatabase("yt-audio-v2")
      r.onsuccess = resolve
      r.onerror = reject
      r.onblocked = () => reject(new Error("Audio cache still open"))
    })
    let exported
    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      if (!this.download || !this.href.startsWith("blob:"))
        return click.call(this)
      const name = this.download
      void fetch(this.href)
        .then((r) => r.blob())
        .then((blob) => {
          exported = { name, blob }
        })
    }
    button("Exportar vídeo · audio y captions").click()
    await wait(() => exported)
    HTMLAnchorElement.prototype.click = click
    const context = new AudioContext(),
      audio = await context.decodeAudioData(await exported.blob.arrayBuffer()),
      samples = audio.getChannelData(0)
    const power = (frequency) => {
      let a = 0,
        b = 0,
        n = 0
      for (
        let i = Math.floor(audio.sampleRate * 0.1);
        i < Math.floor(audio.sampleRate * 0.7);
        i++
      ) {
        a +=
          samples[i] *
          Math.sin((2 * Math.PI * frequency * i) / audio.sampleRate)
        b +=
          samples[i] *
          Math.cos((2 * Math.PI * frequency * i) / audio.sampleRate)
        n++
      }
      return (2 * Math.hypot(a, b)) / n
    }
    const chosenVoicePower = power(540),
      otherTakePower = power(440)
    await context.close()
    const url = URL.createObjectURL(exported.blob),
      video = document.createElement("video")
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
    const g = canvas.getContext("2d")
    g.drawImage(video, 0, 0, 360, 640)
    const pixels = g.getImageData(0, 480, 360, 150).data
    let captionPixels = 0
    for (let p = 0; p < pixels.length; p += 4)
      if (
        pixels[p] > 180 &&
        pixels[p + 1] > 120 &&
        pixels[p] > pixels[p + 2] * 1.3
      )
        captionPixels++
    const videoDuration = video.duration
    video.removeAttribute("src")
    video.load()
    URL.revokeObjectURL(url)
    button("Biblioteca de audio").click()
    await new Promise((r) => setTimeout(r, 60))
    const transcript = [...document.querySelectorAll(".vl-main .sound-field")]
      .find(
        (el) =>
          el.querySelector("span")?.textContent === "Transcripción del audio",
      )
      .querySelector("textarea")
    set(transcript, "Voz original subida para el personaje.")
    const fileInput = document.querySelector('input[accept="audio/*"]')
    const original = await (await fetch(window.voiceLabWave(660))).blob()
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [new File([original], "original.wav", { type: "audio/wav" })],
    })
    fileInput.dispatchEvent(new Event("change", { bubbles: true }))
    await new Promise((r) => setTimeout(r, 100))
    button("Subir y guardar el original").click()
    await wait(
      () =>
        window.voiceLabFixture.uploads === 1 &&
        document.body.innerText.includes(
          "Audio original guardado en Supabase.",
        ) &&
        !button("Subir y guardar el original").disabled,
    )
    if (window.voiceLabFixture.tts !== ttsBefore)
      throw new Error("Upload regenerated TTS")
    await wait(
      () =>
        document.querySelector(".vl-page").getAttribute("aria-busy") ===
        "false",
    )
    button("Alinear con la voz · autorizar consumo").closest("details").open =
      true
    await new Promise((resolve) => setTimeout(resolve, 100))
    button("Alinear con la voz · autorizar consumo").click()
    await wait(
      () =>
        window.voiceLabFixture.alignment === 1 &&
        document.body.innerText.includes(
          "Alineación del archivo y su transcripción guardada.",
        ) &&
        !button("Alinear con la voz · autorizar consumo").disabled,
    )
    const uploaded = window.voiceLabFixture.audio.find(
      (a) => a.origin === "uploaded",
    )
    button("Guion y dos tomas").click()
    return {
      tts: window.voiceLabFixture.tts,
      uploads: window.voiceLabFixture.uploads,
      alignment: window.voiceLabFixture.alignment,
      oldCalls: window.voiceLabFixture.oldCalls,
      recoveries: window.voiceLabFixture.recoveries,
      chosenVoicePower,
      otherTakePower,
      captionPixels,
      videoDuration,
      bytes: exported.blob.size,
      uploadedAligned: uploaded.timingSource === "forced-alignment",
      projectAudioId: window.voiceLabFixture.projects[0].audioId,
      chosenTakeId: window.voiceLabFixture.audio.find((a) => a.take === 2).id,
      canary: localStorage.getItem("voice-lab-canary"),
    }
  })
  assert.equal(result.tts, 2)
  assert.equal(result.uploads, 1)
  assert.equal(result.alignment, 1)
  assert.deepEqual(result.oldCalls, ["sfx", "music"])
  assert.ok(result.recoveries >= 3)
  assert.ok(result.chosenVoicePower > 0.04, JSON.stringify(result))
  assert.ok(result.otherTakePower < 0.005, JSON.stringify(result))
  assert.ok(result.captionPixels > 20, JSON.stringify(result))
  assert.ok(result.videoDuration >= 1.15)
  assert.equal(result.uploadedAligned, true)
  assert.equal(result.projectAudioId, result.chosenTakeId)
  assert.equal(result.canary, "Original projects must not change")
  assert.deepEqual(errors, [])
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
  })
  await writeFile(
    "/tmp/voice-lab-desktop.png",
    Buffer.from(screenshot.value.data, "base64"),
  )
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  const mobile = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  assert.ok(mobile.scroll <= mobile.width + 1, JSON.stringify(mobile))
  console.log(
    "New page: mocked durable cloud/provider, real audio decode + MediaRecorder + MP4/captions export:",
    JSON.stringify(result),
  )
} finally {
  await browser.close({ silent: true })
}
