import { AudioError, providerError } from "./audio-provider.mjs"
import {
  prepareBucket,
  uploadGeneratedAudio,
  storageFailure,
} from "./storage.mjs"
import {
  validateVoiceJob,
  generateVoiceTake,
  uploadedType,
} from "./voice-lab-provider.mjs"

const bucket = "make-bd5da494-voice-lab"
const table = "kv_store_4bc3557f"
const idOk = (id) => /^[a-f0-9-]{36}$/.test(id || "")
const mimeTypes = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "image/png",
  "image/jpeg",
  "image/webp",
]

export function installVoiceLabRoutes(app, prefix, admin, kv, options = {}) {
  const root = `${prefix}/studio/voice-lab`
  const apiKey = options.key || (() => Deno.env.get("ELEVENLABS_API_KEY") || "")
  const generate = options.generate || generateVoiceTake
  const fetcher = options.fetcher || fetch
  const key = (owner, kind, id = "") => `voice-lab:${kind}:${owner}:${id}`
  const safe = (fn) => async (c) => {
    try {
      return await fn(c, c.get("ownerId"))
    } catch (error) {
      const known =
        error instanceof AudioError || typeof error?.code === "string"
      return c.json(
        {
          error: known
            ? error.message
            : "No se pudo confirmar la operación de la biblioteca. Los registros existentes se conservan.",
          code: known ? error.code : "voice_lab_storage_failed",
        },
        [400, 401, 402, 403, 404, 409, 413, 422, 429, 503].includes(
          error.status,
        )
          ? error.status
          : 502,
      )
    }
  }
  const get = async (owner, kind, id) => {
    if (!idOk(id))
      throw new AudioError(400, "invalid_id", "Referencia no válida.")
    const record = await kv.get(key(owner, kind, id))
    if (!record)
      throw new AudioError(
        404,
        "lab_record_missing",
        "Este elemento no existe en tu biblioteca.",
      )
    return record
  }
  const sign = async (owner, record) => {
    if (!record.path?.startsWith(`${owner}/voice-lab/`))
      throw new AudioError(
        403,
        "asset_owner_mismatch",
        "El archivo no pertenece a esta cuenta.",
      )
    const { data, error } = await admin()
      .storage.from(bucket)
      .createSignedUrl(record.path, 3600)
    if (error) throw storageFailure(error, "voice_lab_signed_url")
    const { base64, ...clean } = record
    return { ...clean, url: data.signedUrl }
  }
  const reserve = async (name, value) => {
    const { error } = await admin().from(table).insert({ key: name, value })
    if (error?.code === "23505") return false
    if (error)
      throw new AudioError(
        503,
        "lab_index_unavailable",
        "No se pudo reservar la operación. No se ha solicitado audio.",
      )
    return true
  }
  const saveProject = async (owner, id, revision, value) => {
    const name = key(owner, "project", id)
    if (revision === 0) return reserve(name, value)
    const { data, error } = await admin()
      .from(table)
      .update({ value })
      .eq("key", name)
      .eq("value->>revision", String(revision))
      .select("key")
    if (error)
      throw new AudioError(
        503,
        "project_save_failed",
        "No se pudo confirmar el guardado del vídeo.",
      )
    return Boolean(data?.length)
  }
  app.get(
    `${root}/bootstrap`,
    safe(async (c, owner) => {
      const [characters, audio, projects, jobs] = await Promise.all(
        ["character", "audio", "project", "job"].map((kind) =>
          kv.getByPrefix(key(owner, kind)),
        ),
      )
      const signedCharacters = await Promise.all(
        characters.map(async (character) => {
          if (!character.imageId) return character
          try {
            return {
              ...character,
              imageUrl: (
                await sign(owner, await get(owner, "media", character.imageId))
              ).url,
            }
          } catch {
            return character
          }
        }),
      )
      const signedAudio = await Promise.all(
        audio.map(async (record) => {
          try {
            return await sign(owner, record)
          } catch {
            return { ...record, url: null, unavailable: true }
          }
        }),
      )
      return c.json({
        revision: 1,
        characters: signedCharacters,
        audio: signedAudio.sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
        projects,
        jobs,
      })
    }),
  )
  app.post(
    `${root}/characters`,
    safe(async (c, owner) => {
      const body = await c.req.json()
      const id = idOk(body.id) ? body.id : crypto.randomUUID()
      const name = String(body.name || "")
        .trim()
        .slice(0, 80)
      if (!name)
        throw new AudioError(400, "character_name", "Pon nombre al personaje.")
      if (body.imageId) await get(owner, "media", body.imageId)
      const record = {
        id,
        name,
        description: String(body.description || "").slice(0, 1000),
        voiceId: String(body.voiceId || "").slice(0, 100),
        imageId: body.imageId || null,
        updatedAt: new Date().toISOString(),
      }
      await kv.set(key(owner, "character", id), record)
      return c.json({ character: record })
    }),
  )
  app.post(
    `${root}/upload`,
    safe(async (c, owner) => {
      const form = await c.req.formData()
      const file = form.get("file")
      const image = form.get("kind") === "image"
      if (
        !file ||
        typeof file.arrayBuffer !== "function" ||
        !file.size ||
        file.size > (image ? 10000000 : 25000000)
      )
        throw new AudioError(
          413,
          "file_size",
          image
            ? "La imagen debe ocupar menos de 10 MB."
            : "El audio debe ocupar menos de 25 MB.",
        )
      const duration = Number(form.get("duration"))
      if (
        !image &&
        (!Number.isFinite(duration) || duration <= 0 || duration > 600)
      )
        throw new AudioError(
          400,
          "audio_duration",
          "Usa un audio reproducible de hasta 10 minutos.",
        )
      const bytes = new Uint8Array(await file.arrayBuffer())
      const [mimeType, ext] = uploadedType(bytes, image)
      await prepareBucket(admin(), bucket, mimeTypes, 25000000)
      const id = crypto.randomUUID()
      const path = `${owner}/voice-lab/${id}.${ext}`
      const { error } = await admin()
        .storage.from(bucket)
        .upload(path, bytes, { contentType: mimeType, upsert: false })
      if (error) throw storageFailure(error, "voice_lab_upload")
      const record = {
        id,
        path,
        mimeType,
        name: String(form.get("name") || file.name || "Audio subido").slice(
          0,
          150,
        ),
        script: String(form.get("script") || "").slice(0, 10000),
        characterId: String(form.get("characterId") || "").slice(0, 80),
        origin: "uploaded",
        words: [],
        timingSource: "unavailable",
        duration: image ? 0 : duration,
        createdAt: new Date().toISOString(),
      }
      await kv.set(key(owner, image ? "media" : "audio", id), record)
      return c.json({ record: await sign(owner, record) })
    }),
  )
  app.get(
    `${root}/audio/:id`,
    safe(async (c, owner) =>
      c.json({
        audio: await sign(owner, await get(owner, "audio", c.req.param("id"))),
      }),
    ),
  )
  app.post(
    `${root}/jobs`,
    safe(async (c, owner) => {
      const config = validateVoiceJob(await c.req.json())
      if (!apiKey())
        throw new AudioError(
          503,
          "missing_key",
          "Falta ELEVENLABS_API_KEY en el proyecto conectado.",
        )
      if (config.characterId) await get(owner, "character", config.characterId)
      const existing = await kv.get(key(owner, "job", config.jobId))
      if (existing) {
        if (
          existing.taggedScript !== config.taggedScript ||
          existing.voiceId !== config.voiceId
        )
          throw new AudioError(
            409,
            "job_conflict",
            "Este identificador ya corresponde a otro guion. No se ha generado audio.",
          )
        return c.json({ job: existing })
      }
      const random = new Uint32Array(2)
      crypto.getRandomValues(random)
      const job = {
        ...config,
        id: config.jobId,
        seeds: [
          random[0],
          random[0] === random[1] ? (random[1] + 1) >>> 0 : random[1],
        ],
        createdAt: new Date().toISOString(),
      }
      if (!(await reserve(key(owner, "job", job.id), job)))
        return c.json({ job: await get(owner, "job", job.id) })
      return c.json({ job })
    }),
  )
  const takeHandler = safe(async (c, owner) => {
    const job = await get(owner, "job", c.req.param("id"))
    const take = Number(c.req.param("take"))
    if (take !== 0 && take !== 1)
      throw new AudioError(
        400,
        "invalid_take",
        "Solo hay dos tomas por generación.",
      )
    const name = key(owner, "take", `${job.id}-${take}`)
    const previous = await kv.get(name)
    if (previous?.state === "ready")
      return c.json({
        audio: await sign(owner, await get(owner, "audio", previous.audioId)),
        cacheHit: true,
      })
    const complete = async (pending) => {
      try {
        const bytes = Uint8Array.from(atob(pending.base64), (char) =>
          char.charCodeAt(0),
        )
        await uploadGeneratedAudio(admin(), bucket, pending.record.path, bytes)
        await kv.set(key(owner, "audio", pending.record.id), pending.record)
        await kv.set(name, { state: "ready", audioId: pending.record.id })
        return c.json({
          audio: await sign(owner, pending.record),
          cacheHit: Boolean(previous),
        })
      } catch {
        return c.json({
          audio: {
            ...pending.record,
            url: `data:audio/mpeg;base64,${pending.base64}`,
            persistencePending: true,
          },
          cacheHit: Boolean(previous),
        })
      }
    }
    if (previous?.state === "pending") return complete(previous)
    if (c.req.method === "GET")
      throw new AudioError(
        409,
        "no_recoverable_take",
        "No hay audio confirmado para esta toma. Recuperar no solicita otra generación.",
      )
    await prepareBucket(admin(), bucket, mimeTypes, 25000000)
    if (!(await reserve(`${name}:lock`, { at: Date.now() })))
      throw new AudioError(
        409,
        "take_locked",
        "Esta toma ya se inició. No se repetirá el cobro; revisa la biblioteca y el historial de ElevenLabs.",
      )
    await kv.set(name, { state: "requesting" })
    let result
    try {
      result = await generate(apiKey(), job, take)
    } catch (error) {
      try {
        await kv.set(name, {
          state: "failed",
          code: error.code || "take_uncertain",
        })
      } catch {}
      throw error
    }
    const id = crypto.randomUUID()
    const record = {
      id,
      path: `${owner}/voice-lab/${id}.mp3`,
      mimeType: "audio/mpeg",
      name: `${job.name} · toma ${take + 1}`,
      script: job.script,
      taggedScript: job.taggedScript,
      characterId: job.characterId,
      voiceId: job.voiceId,
      words: result.words,
      duration: result.duration,
      timingSource: result.words.length
        ? "provider-character-alignment"
        : "unavailable",
      origin: "generated",
      jobId: job.id,
      take: take + 1,
      createdAt: new Date().toISOString(),
    }
    const pending = { state: "pending", record, base64: result.base64 }
    try {
      await kv.set(name, pending)
    } catch {
      return c.json({
        audio: {
          ...record,
          url: `data:audio/mpeg;base64,${result.base64}`,
          persistencePending: true,
        },
        cacheHit: false,
      })
    }
    return complete(pending)
  })
  app.post(`${root}/jobs/:id/takes/:take`, takeHandler)
  app.get(`${root}/jobs/:id/takes/:take`, takeHandler)
  app.post(
    `${root}/audio/:id/transcript`,
    safe(async (c, owner) => {
      const record = await get(owner, "audio", c.req.param("id"))
      const script = String((await c.req.json()).script || "").trim()
      if (!script || script.length > 10000)
        throw new AudioError(
          400,
          "transcript_required",
          "Añade una transcripción de hasta 10.000 caracteres.",
        )
      const updated =
        record.script === script
          ? record
          : { ...record, script, words: [], timingSource: "unavailable" }
      await kv.set(key(owner, "audio", record.id), updated)
      return c.json({ audio: await sign(owner, updated) })
    }),
  )
  app.post(
    `${root}/audio/:id/align`,
    safe(async (c, owner) => {
      const record = await get(owner, "audio", c.req.param("id"))
      const body = await c.req.json()
      const script = String(body.script || record.script || "")
        .replace(/\[[^\]]*\]/g, "")
        .trim()
      if (!script || script.length > 10000 || body.authorized !== true)
        throw new AudioError(
          400,
          "alignment_authorization",
          "Añade la transcripción y autoriza el consumo de la alineación.",
        )
      if (record.words?.length && record.script === script)
        return c.json({ audio: await sign(owner, record), cacheHit: true })
      if (!apiKey())
        throw new AudioError(503, "missing_key", "Falta ELEVENLABS_API_KEY.")
      const downloaded = await admin()
        .storage.from(bucket)
        .download(record.path)
      if (downloaded.error)
        throw storageFailure(downloaded.error, "alignment_download")
      const lock = key(
        owner,
        "alignment",
        `${record.id}:${await optionsDigest(script)}`,
      )
      if (!(await reserve(lock, { at: Date.now() })))
        throw new AudioError(
          409,
          "alignment_locked",
          "Esta alineación ya se inició. No se repetirá automáticamente.",
        )
      const form = new FormData()
      form.set("file", downloaded.data, record.name)
      form.set("text", script)
      let response
      try {
        response = await fetcher(
          "https://api.elevenlabs.io/v1/forced-alignment",
          {
            method: "POST",
            headers: { "xi-api-key": apiKey() },
            body: form,
            signal: AbortSignal.timeout(150000),
          },
        )
      } catch {
        throw new AudioError(
          503,
          "alignment_uncertain",
          "La alineación quedó sin confirmar. No se ha reintentado.",
        )
      }
      if (!response.ok) {
        if ([400, 401, 402, 403, 404, 422, 429].includes(response.status))
          try {
            await kv.del(lock)
          } catch {}
        throw providerError(response.status)
      }
      const data = await response.json()
      const words = (data.words || [])
        .filter(
          (word) =>
            typeof word.text === "string" &&
            Number.isFinite(word.start) &&
            Number.isFinite(word.end) &&
            word.start >= 0 &&
            word.end > word.start,
        )
        .map(({ text, start, end }) => ({ text, start, end }))
      if (!words.length)
        throw new AudioError(
          502,
          "alignment_empty",
          "El proveedor no devolvió palabras alineadas.",
        )
      const updated = {
        ...record,
        script,
        words,
        timingSource: "forced-alignment",
      }
      await kv.set(key(owner, "audio", record.id), updated)
      return c.json({ audio: await sign(owner, updated) })
    }),
  )
  app.post(
    `${root}/audio/:id/duration`,
    safe(async (c, owner) => {
      const record = await get(owner, "audio", c.req.param("id"))
      const duration = Number((await c.req.json()).duration)
      if (!Number.isFinite(duration) || duration <= 0 || duration > 600)
        throw new AudioError(
          400,
          "invalid_duration",
          "Duración de audio no válida.",
        )
      await kv.set(key(owner, "audio", record.id), { ...record, duration })
      return c.json({ saved: true })
    }),
  )
  app.post(
    `${root}/projects`,
    safe(async (c, owner) => {
      const body = await c.req.json()
      const audio = await get(owner, "audio", body.audioId)
      await get(owner, "character", body.characterId)
      if (!audio.duration)
        throw new AudioError(
          400,
          "duration_required",
          "Escucha o comprueba la duración del audio antes de preparar el vídeo.",
        )
      const id = idOk(body.id) ? body.id : crypto.randomUUID()
      const previous = await kv.get(key(owner, "project", id))
      if ((previous?.revision || 0) !== Number(body.revision || 0))
        throw new AudioError(
          409,
          "project_conflict",
          "Este vídeo cambió en otro equipo. Recarga antes de sobrescribirlo.",
        )
      const tokens = audio.script
        .replace(/\[[^\]]*\]/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      const total = tokens.reduce((sum, token) => sum + token.length, 0) || 1
      let cursor = 0
      const words = audio.words?.length
        ? audio.words
        : tokens.map((text, index) => {
            const start = cursor
            cursor =
              index === tokens.length - 1
                ? audio.duration
                : cursor + (audio.duration * text.length) / total
            return { text, start, end: cursor }
          })
      const scenes = (
        Array.isArray(body.scenes) ? body.scenes.slice(0, 100) : []
      ).map((scene, index) => {
        if (
          !scene ||
          typeof scene.text !== "string" ||
          !Number.isFinite(scene.start) ||
          !Number.isFinite(scene.end) ||
          scene.start < 0 ||
          scene.end <= scene.start ||
          scene.end > audio.duration + 0.1
        )
          throw new AudioError(
            400,
            "invalid_scene",
            "Una escena no encaja en la duración de la voz.",
          )
        return {
          id: index + 1,
          start: scene.start,
          end: scene.end,
          text: scene.text.slice(0, 1500),
          action: String(scene.action || "Énfasis del personaje").slice(0, 300),
        }
      })
      if (!scenes.length)
        scenes.push({
          id: 1,
          start: 0,
          end: audio.duration,
          text: audio.script.replace(/\[[^\]]*\]/g, "").trim() || audio.name,
          action: "Interpretación del personaje sobre el audio seleccionado",
        })
      const project = {
        id,
        title: String(body.title || audio.name).slice(0, 150),
        characterId: body.characterId,
        audioId: audio.id,
        duration: audio.duration,
        words,
        timingSource: audio.words?.length ? audio.timingSource : "estimated",
        scenes,
        sfx: String(body.sfx || "").slice(0, 450),
        music: String(body.music || "").slice(0, 2000),
        tracks: previous?.tracks || {},
        revision: (previous?.revision || 0) + 1,
        createdAt: previous?.createdAt || new Date().toISOString(),
      }
      if (!(await saveProject(owner, id, previous?.revision || 0, project)))
        throw new AudioError(
          409,
          "project_conflict",
          "Otro equipo cambió este vídeo. Recarga la copia antes de guardar.",
        )
      return c.json({ project })
    }),
  )
  app.post(
    `${root}/projects/:id/tracks`,
    safe(async (c, owner) => {
      const body = await c.req.json()
      if (
        !["sfx", "music"].includes(body.kind) ||
        !/^[a-f0-9]{64}$/.test(body.assetId || "") ||
        !(await kv.get(`audio:v2:${owner}:${body.assetId}`))
      )
        throw new AudioError(
          400,
          "invalid_track",
          "La pista no pertenece a esta cuenta.",
        )
      for (let attempt = 0; attempt < 3; attempt++) {
        const project = await get(owner, "project", c.req.param("id"))
        const updated = {
          ...project,
          tracks: {
            ...project.tracks,
            [body.kind]: {
              id: body.assetId,
              duration: Number(body.duration) || project.duration,
            },
          },
          revision: project.revision + 1,
        }
        if (await saveProject(owner, project.id, project.revision, updated))
          return c.json({ project: updated })
      }
      throw new AudioError(
        409,
        "project_conflict",
        "Otro equipo cambió el vídeo. La pista generada sigue guardada; no vuelvas a generarla.",
      )
    }),
  )
}
async function optionsDigest(value) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}
