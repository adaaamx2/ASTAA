import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { studies } from '../src/motion-lab/studies.ts'
import { estimateWords } from '../src/production/timing.ts'
const require=createRequire(import.meta.url), cli=createRequire(require.resolve('@remotion/cli/package.json'))
const {openBrowser}=cli('@remotion/renderer')
const browser=await openBrowser('chrome',{logLevel:'error'})
const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}})
const base=`http://localhost:${process.env.PORT||8443}`
const errors=[];page.on('error',e=>errors.push(String(e)))
async function wait(selector){await page.evaluate(selector=>new Promise((resolve,reject)=>{const deadline=Date.now()+20000;function tick(){if(document.querySelector(selector))return resolve();if(Date.now()>deadline)return reject(Error(`Missing ${selector}`));requestAnimationFrame(tick)}tick()}),selector)}
async function seek(value){await page.evaluate(value=>{const range=document.querySelector('input[aria-label="Posición del estudio"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(range,String(value));range.dispatchEvent(new Event('input',{bubbles:true}));return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))},value)}
async function screenshot(name){const image=await page._client().send('Page.captureScreenshot',{format:'png'});await writeFile(`.production/qa/studio/${name}.png`,Buffer.from(image.value.data,'base64'))}
try{
 await mkdir('.production/qa/studio',{recursive:true})
 await page.setViewport({width:1440,height:1100,deviceScaleFactor:1})
 await page.goto({url:base,timeout:30000});await wait('.ml-shell')
 assert.equal(await page.evaluate(()=>document.querySelectorAll('.ml-study-tab').length),2)
 await page.evaluate(()=>{const button=document.querySelector('.ml-play');if(button.getAttribute('aria-label')==='Pausar estudio')button.click()})
 await seek(5.5)
 const first=await page.evaluate(()=>{const c=document.querySelector('.ml-canvas-slot canvas');return {width:c.width,height:c.height,alpha:c.getContext('2d').getImageData(c.width/2,c.height/3,1,1).data[3]}})
 assert.deepEqual(first,{width:1920,height:1292,alpha:255})
 await screenshot('enbu-desktop')
 for(const id of ['enbu','blue-hour']){
  await page.evaluate(id=>document.querySelectorAll('.ml-study-tab')[id==='enbu'?0:1].click(),id)
  await page.evaluate(()=>{const buttons=[...document.querySelectorAll('.ml-caption-toolbar button')];buttons.find(b=>b.textContent==='Pop').click()})
  const study=studies.find(study=>study.id===id)
  const words=estimateWords([{id:1,title:study.title,start:0,end:18,voice:study.narration,visual:''}])
  for(const time of [2.56,2.59,5.13,5.16,10.27,10.3]){
   await seek(time)
   const expected=words.find(word=>time>=word.start&&time<word.end).text.toLocaleUpperCase('es')
   assert.equal(await page.evaluate(()=>document.querySelector('[data-caption-pack="pop"] text').textContent),expected)
  }
  for(const pack of ['Pop','Karaoke','Kinetic','Cómic']){
   await page.evaluate(pack=>[...document.querySelectorAll('.ml-caption-toolbar button')].find(b=>b.textContent===pack).click(),pack)
   await seek(4.1)
   const geometry=await page.evaluate(()=>{const svg=document.querySelector('.ml-captions'),box=svg.getBoundingClientRect();const texts=[...svg.querySelectorAll('text')].map(t=>t.getBoundingClientRect());return {inside:texts.every(t=>t.left>=box.left-1&&t.right<=box.right+1&&t.top>=box.top&&t.bottom<=box.bottom),center:Math.abs((Math.min(...texts.map(t=>t.left))+Math.max(...texts.map(t=>t.right)))/2-(box.left+box.width/2)),source:svg.querySelector('[data-timing-source]').getAttribute('data-timing-source')}})
   assert.ok(geometry.inside,`${id}/${pack} clipped`)
   if(pack==='Karaoke')assert.ok(geometry.center<3,`Karaoke not centered: ${JSON.stringify(geometry)}`)
   assert.equal(geometry.source,'estimated')
  }
  await page.evaluate(()=>{document.querySelector('.ml-caption-toolbar input').click()})
  await seek(id==='enbu'?5.5:11)
  for(const width of [1440,1024,820,700,390,320]){
   await page.setViewport({width,height:1100,deviceScaleFactor:1})
   const bounds=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth,canvas:document.querySelector('.ml-canvas-slot').getBoundingClientRect().right}))
   assert.ok(bounds.scroll<=width+1&&bounds.canvas<=width,`${id} overflow at ${width}: ${JSON.stringify(bounds)}`)
  }
  await screenshot(`${id}-mobile`)
 }
 await page.setViewport({width:1440,height:1100,deviceScaleFactor:1})
 await page.goto({url:`${base}/#workspace`,timeout:30000});await wait('.p-finn-review')
 await page.evaluate(()=>[...document.querySelectorAll('.p-view-tabs button')].find(b=>b.textContent.trim()==='Subtítulos').click())
 await wait('.p-packs svg');assert.equal(await page.evaluate(()=>document.querySelectorAll('.p-packs svg').length),4)
 assert.equal(await page.evaluate(()=>document.querySelectorAll('.p-caption-phrase').length),0)
 if(process.argv.includes('--require-exports')){
  const response=await fetch(`${base}/exports/studies.json`);assert.ok(response.ok);const manifest=await response.json();assert.equal(manifest.artifacts.length,2)
  for(const artifact of manifest.artifacts){const r=await fetch(`${base}${artifact.url}`);assert.ok(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.length,artifact.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),artifact.sha256);assert.equal(bytes.subarray(4,8).toString(),'ftyp')}
  await page.goto({url:base,timeout:30000});await wait('.ml-shell');await wait('.ml-button-download')
  assert.ok(await page.evaluate(()=>document.querySelector('.ml-button-download').href.endsWith('study-enbu.mp4')))
 }
 assert.deepEqual(errors,[])
 console.log('PASS: two visible studies, non-empty canvases, six responsive widths, four centered/clipped-safe caption styles, global words across visual phase changes, real Finn subtitle samples'+(process.argv.includes('--require-exports')?', two complete MP4 downloads/hashes.':'.'))
}finally{await browser.close({silent:true})}
