import assert from 'node:assert/strict'
import {test} from 'node:test'
import {resolvePublicAsset,verifiedDownload} from '../src/media/files.ts'
import {ProjectRepository,cleanProjectPatch} from '../supabase/functions/server/projects.mjs'
import {prepareBucket} from '../supabase/functions/server/storage.mjs'
const mp4=new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0])
test('asset resolution respects a published subpath instead of jumping to origin /exports',()=>{
 assert.equal(resolvePublicAsset('/exports/study-enbu.mp4','/preview/app/','https://example.test'),'https://example.test/preview/app/exports/study-enbu.mp4')
 assert.equal(resolvePublicAsset('/exports/study-enbu.mp4','https://cdn.example.test/files/','https://example.test'),'https://cdn.example.test/files/exports/study-enbu.mp4')
 assert.throws(()=>resolvePublicAsset('/.env','/','https://example.test'))
})
test('a real MP4 receives an explicit mp4 filename and MIME even if host metadata says text/plain',async()=>{
 const result=await verifiedDownload({url:'https://example.test/export',filename:'study-enbu.txt',mime:'video/mp4',bytes:mp4.length},async()=>new Response(mp4,{headers:{'content-type':'text/plain'}}))
 assert.equal(result.filename,'study-enbu.mp4');assert.equal(result.blob.type,'video/mp4');assert.equal(result.blob.size,mp4.length)
})
test('404, HTML, TXT, truncation and wrong hash never become a fake MP4 download',async()=>{
 const file={url:'https://example.test/export',filename:'video.mp4',mime:'video/mp4'}
 await assert.rejects(()=>verifiedDownload(file,async()=>new Response('file missing',{status:404})),/HTTP 404/)
 await assert.rejects(()=>verifiedDownload(file,async()=>new Response('<html>fallback</html>')),/HTML\/TXT/)
 await assert.rejects(()=>verifiedDownload({...file,bytes:1000},async()=>new Response(mp4)),/incompleta/)
 await assert.rejects(()=>verifiedDownload({...file,sha256:'0'.repeat(64)},async()=>new Response(mp4)),/integridad/)
})
function memory(){const map=new Map();return {map,get:async key=>map.has(key)?structuredClone(map.get(key)):null,set:async(key,value)=>map.set(key,structuredClone(value)),compareAndSet:async(key,revision,value)=>{if((map.get(key)?.revision||0)!==revision)return false;map.set(key,structuredClone(value));return true}}}
const aid=n=>String(n).repeat(64)
test('Storage HTTP 400 Bucket not found creates the private bucket', async()=>{
 let created = false
 await prepareBucket({storage:{
  getBucket:async()=>({data:null,error:{status:400,message:'Bucket not found'}}),
  createBucket:async(name,options)=>{created=options.public===false;return {error:null}}
 }},'media',['video/mp4','application/json'],65000000)
 assert.equal(created,true)
 await assert.rejects(()=>prepareBucket({storage:{getBucket:async()=>({data:null,error:{status:403,message:'Forbidden'}})}},'media',[],1),error=>error.code==='storage_permission_denied')
})
test('named versions restore settings and original audio IDs, without removing later assets',async()=>{
 const store=memory(),repo=new ProjectRepository(store,async a=>({...a,url:'fresh'}))
 putAsset(store,'user',aid(1),'voice');putAsset(store,'user',aid(2),'voice')
 await repo.save('user','p',{settings:{captionPack:'comic'}},0)
 await repo.attach('user','p','voice',aid(1))
 const version=await repo.createVersion('user','p','Primera voz')
 await repo.attach('user','p','voice',aid(2))
 await repo.save('user','p',{settings:{captionPack:'karaoke'}},3)
 await repo.restoreVersion('user','p',version.id,4)
 const restored=await repo.load('user','p')
 assert.equal(restored.settings.captionPack,'comic')
 assert.equal(restored.tracks.voice,aid(1))
 assert.ok(await repo.asset('user',aid(2)))
 await assert.rejects(()=>repo.restoreVersion('other','p',version.id,0))
})
function putAsset(store,user,id,kind,extra={}){store.map.set(`studio:asset:${user}:${id}`,{id,path:`${user}/${id}.mp3`,kind,words:[],...extra})}
test('voice, SFX, music and render survive a fresh repository/client and receive renewed links',async()=>{
 const store=memory();for(const [i,kind]of['voice','sfx','music','render'].entries())putAsset(store,'user',aid(i+1),kind,{...(kind==='voice'?{text:'Hola mundo.',words:[{text:'Hola',start:0,end:.4},{text:'mundo.',start:.5,end:1}]}:{})})
 let signatures=0;const sign=async asset=>({...asset,url:`https://storage.test/${asset.id}?signature=${++signatures}`})
 const first=new ProjectRepository(store,sign);await first.save('user','enbu',{title:'Mi vídeo',kind:'study',template:'enbu'},0)
 for(const[i,kind]of['voice','sfx','music','render'].entries())await first.attach('user','enbu',kind,aid(i+1))
 const one=await first.load('user','enbu'),two=await new ProjectRepository(store,sign).load('user','enbu')
 assert.ok(one.generation.voice&&one.generation.sfx&&one.generation.music);assert.ok(two.renderFiles.master)
 assert.notEqual(one.media.voice.url,two.media.voice.url)
 assert.deepEqual(one.tracks,two.tracks);assert.equal(two.generation.text,'Hola mundo.')
 const raw=await first.raw('user','enbu');assert.ok(!JSON.stringify(raw).includes('https://'));assert.ok(!JSON.stringify(raw).includes('signature='))
})
test('old hosted audio without project association is attachable without regenerating speech',async()=>{
 const store=memory();putAsset(store,'user',aid(1),'voice',{words:[{text:'Guion',start:0,end:.5},{text:'antiguo.',start:.6,end:1}]})
 const repo=new ProjectRepository(store,async a=>({...a,url:'fresh'}));await repo.attach('user','old-video','voice',aid(1))
 assert.equal((await repo.load('user','old-video')).generation.text,'Guion antiguo.')
})
test('archiving native files never overwrites generated SFX/music or an existing render',async()=>{
 const store=memory();for(const[i,kind]of['sfx','sfx','music','render','render'].entries())putAsset(store,'user',aid(i+1),kind)
 const repo=new ProjectRepository(store,async a=>({...a,url:'fresh'}));await repo.attach('user','p','sfx',aid(1));await repo.attach('user','p','music',aid(3));await repo.attach('user','p','render',aid(4))
 await repo.attach('user','p','sfx',aid(2),{},'master',true);await repo.attach('user','p','render',aid(5),{},'master',true)
 const doc=await repo.raw('user','p');assert.equal(doc.tracks.sfx,aid(1));assert.equal(doc.tracks.music,aid(3));assert.equal(doc.renders.master,aid(4))
})
test('cross-account files and stale revisions are rejected, and previous configurations are retained',async()=>{
 const store=memory();putAsset(store,'other',aid(1),'voice')
 const repo=new ProjectRepository(store,async a=>({...a,url:'fresh'}));await assert.rejects(()=>repo.attach('user','p','voice',aid(1)),/pertenece/)
 await repo.save('user','p',{title:'Primera'},0);await repo.save('user','p',{title:'Otro equipo'},1)
 await assert.rejects(()=>repo.save('user','p',{title:'Copia desactualizada'},1),error=>error.status===409)
 assert.equal((await repo.raw('user','p')).title,'Otro equipo');assert.equal(store.map.get('studio:project-history:user:p:1').title,'Primera')
 assert.deepEqual(cleanProjectPatch({title:'Safe',tracks:{voice:'foreign'},media:{url:'https://bad.test'}}),{title:'Safe'})
})
