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
  const errors = [],
    client = page._client()
  await client.send("Runtime.enable")
  client.on("Runtime.exceptionThrown", (event) =>
    errors.push(
      event.exceptionDetails?.exception?.description ||
        event.exceptionDetails?.text,
    ),
  )
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
    localStorage.setItem("yt-owner-auth", JSON.stringify({access_token:"local-test-session-not-real",refresh_token:"not-real",expires_at:Date.now()+3600000}));
    const actualFetch=window.fetch.bind(window);
    window.fetch=async(input,init)=>{
      const url=String(input);
      if(url.includes("api.elevenlabs.io")) throw new Error("Unexpected paid provider call");
      if(!url.includes(".supabase.co"))return actualFetch(input,init);
      let data={};let status=200;
      if(url.endsWith("/auth/status"))data={setup:false};
      else if(url.endsWith("/studio/session"))data={authenticated:true,authorized:true,userId:"local-owner",reason:"authorized",message:"Local test session"};
      else if(url.endsWith("/audio/status"))data={configured:false,last4:"",revision:1};
      else if(url.includes("/audio/state/"))data={state:null};
      else if(url.endsWith("/studio/projects"))data={projects:[]};
      else if(url.includes("/studio/projects/"))data={project:null};
      else if(url.endsWith("/studio/assets"))data={assets:[]};
      else {data={error:"Unmocked cloud request blocked in local regression test"};status=503}
      return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
    };
  `,
  })
  for (const route of [
    "",
    "#video/enbu",
    "#video/brand-strategy",
    "#workspace",
  ]) {
    await page.goto({
      url: `http://localhost:${process.env.PORT || 3000}/${route}`,
      timeout: 30000,
    })
    const result = await page.evaluate(async (route) => {
      for (let i = 0; i < 300; i++) {
        const gallery = document.querySelector(".wg-gallery")
        const audio = document.querySelector('[aria-label="Voz y audio"]')
        const missingKey = document.body.innerText.includes(
          "Falta ELEVENLABS_API_KEY",
        )
        if (gallery && (!route || (audio && missingKey)))
          return { gallery: true, audio: Boolean(audio), missingKey }
        await new Promise((r) => setTimeout(r, 50))
      }
      return { body: document.body.innerText.slice(0, 400) }
    }, route)
    assert.equal(result.gallery, true, JSON.stringify(result))
    if (route) {
      assert.equal(result.audio, true)
      assert.equal(result.missingKey, true)
    }
    assert.deepEqual(errors, [])
    console.log(
      `Authenticated interface regression (mock cloud, not real login): ${route || "gallery"}`,
    )
  }
} finally {
  await browser.close({ silent: true })
}
