import {
  AudioError,
  callProvider,
  generateAudio,
  validateAudio,
} from "./audio-provider.mjs"
import {
  prepareBucket,
  storageFailure,
  StorageOperationError,
  verifyAudioStorage,
  uploadGeneratedAudio,
} from "./storage.mjs"

export function installAudioRoutes(
  app: any,
  prefix: string,
  admin: any,
  kv: any,
  digest: any,
) {
  const root = `${prefix}/studio/audio`
  const key = () => Deno.env.get("ELEVENLABS_API_KEY") || ""
  const bucket = "make-4bc3557f-audio-v2"
  const indexError = (error: any) =>
    new AudioError(
      503,
      "audio_index_unavailable",
      /42P01|PGRST205/.test(String(error?.code)) ||
        /kv_store_4bc3557f|schema cache|does not exist/i.test(
          String(error?.message),
        )
        ? "Falta la tabla privada kv_store_4bc3557f en el proyecto Supabase conectado. La solicitud se detuvo antes de llamar a ElevenLabs; añadir créditos no lo resuelve."
        : "Supabase no pudo acceder al índice privado de audio. La solicitud se detuvo antes de llamar a ElevenLabs; revisa la base de datos del proyecto conectado.",
    )
  const readIndex = async (name: string) => {
    try {
      return await kv.get(name)
    } catch (error) {
      throw indexError(error)
    }
  }
  const prepareStorage = async (client: any, owner: string) => {
    await prepareBucket(client, bucket, ["audio/mpeg"], 50000000)
    await verifyAudioStorage(client, bucket, owner, ["audio/mpeg"])
  }
  const safe = (fn: any) => async (c: any) => {
    try {
      return await fn(c)
    } catch (caught) {
      const error = caught as any
      const known =
        error instanceof AudioError || error instanceof StorageOperationError
      return c.json(
        {
          error: known
            ? error.message
            : `No se completó la operación «${c.get("audioOperation") || "audio_request"}». No se reintentó la generación. Revisa el diagnóstico del backend antes de repetir.`,
          code: known ? error.code : "audio_operation_failed",
          ...(error instanceof StorageOperationError
            ? {
                operation: error.operation,
                storageStatus: error.storageStatus ?? null,
              }
            : { operation: c.get("audioOperation") || "audio_request" }),
        },
        known &&
          [400, 401, 402, 403, 404, 409, 422, 429, 503].includes(error.status)
          ? error.status
          : 502,
      )
    }
  }
  app.get(
    `${root}/status`,
    safe(async (c: any) =>
      c.json({
        configured: Boolean(key()),
        last4: key().slice(-4),
        revision: 1,
      }),
    ),
  )
  app.post(
    `${root}/preflight`,
    safe(async (c: any) => {
      const owner = c.get("ownerId")
      const probeKey = `audio:check:${owner}:${crypto.randomUUID()}`
      c.set("audioOperation", "index_preflight")
      try {
        await kv.set(probeKey, { at: Date.now() })
        if (!(await kv.get(probeKey)))
          throw new Error("Index probe not readable")
      } catch (error) {
        throw indexError(error)
      } finally {
        try {
          await kv.del(probeKey)
        } catch {}
      }
      c.set("audioOperation", "storage_preflight")
      await prepareStorage(admin(), owner)
      return c.json({ ready: true })
    }),
  )
  app.get(
    `${root}/connection`,
    safe(async (c: any) => {
      const response = await callProvider(key(), "user/subscription")
      const data = await response.json()
      return c.json({
        connected: true,
        tier: data.tier,
        used: data.character_count,
        limit: data.character_limit,
        sfx: "requires_test",
        music: "requires_test",
        commercial:
          data.tier !== "free" ? "check_music_terms" : "no_paid_voice_license",
      })
    }),
  )
  app.get(
    `${root}/voices`,
    safe(async (c: any) => {
      const response = await callProvider(key(), "voices")
      const data = await response.json()
      return c.json({
        voices: (data.voices || []).map((v: any) => ({
          id: v.voice_id,
          name: v.name,
          labels: v.labels || {},
          previewUrl: v.preview_url || null,
        })),
      })
    }),
  )
  app.get(
    `${root}/voices/:id`,
    safe(async (c: any) => {
      const id = c.req.param("id")
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || /^(sk_|xi_)/i.test(id))
        throw new AudioError(
          400,
          "invalid_voice_id",
          "Introduce un Voice ID, no una API key.",
        )
      // Metadata and existing samples only: never generate a paid preview.
      const response = await callProvider(
        key(),
        `voices/${encodeURIComponent(id)}`,
      )
      const voice = await response.json()
      return c.json({
        voice: {
          id: voice.voice_id,
          name: voice.name,
          labels: voice.labels || {},
          previewUrl: voice.preview_url || null,
        },
      })
    }),
  )
  app.get(
    `${root}/assets/:id`,
    safe(async (c: any) => {
      const id = c.req.param("id")
      if (!/^[a-f0-9]{64}$/.test(id))
        throw new AudioError(
          404,
          "asset_missing",
          "Archivo local no alojado. Sube de nuevo tu original.",
        )
      const record = await kv.get(`audio:v2:${c.get("ownerId")}:${id}`)
      if (!record)
        throw new AudioError(
          404,
          "asset_missing",
          "No existe esta generación en la nube. Recupera tu archivo original.",
        )
      const { data, error } = await admin()
        .storage.from(bucket)
        .createSignedUrl(record.path, 3600)
      if (error) throw storageFailure(error, "audio_asset_signed_url")
      return c.json({ url: data.signedUrl })
    }),
  )
  app.post(
    `${root}/generate`,
    safe(async (c: any) => {
      c.set("audioOperation", "validate_request")
      const body = await c.req.json()
      const config = validateAudio(body)
      if (!key())
        throw new AudioError(
          503,
          "missing_key",
          "Falta la clave. Guarda ELEVENLABS_API_KEY en los secretos de Supabase.",
        )
      const owner = c.get("ownerId")
      c.set("audioOperation", "generation_digest")
      const id = await digest([owner, config])
      const cacheKey = `audio:v2:${owner}:${id}`
      const stored = await readIndex(cacheKey)
      const deliver = async (record: any, cacheHit: boolean) => {
        const { data, error } = await admin()
          .storage.from(bucket)
          .createSignedUrl(record.path, 3600)
        if (error) throw storageFailure(error, "cached_audio_signed_url")
        return c.json({ ...record, url: data.signedUrl, cacheHit })
      }
      const pendingKey = `${cacheKey}:pending`
      const pending = await readIndex(pendingKey)
      const complete = async (
        record: any,
        base64: string,
        cacheHit: boolean,
      ) => {
        try {
          const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))
          await uploadGeneratedAudio(admin(), bucket, record.path, bytes)
          await kv.set(cacheKey, record)
          const response = await deliver(record, cacheHit)
          await kv.del(pendingKey)
          return response
        } catch {
          // Return the paid bytes even when persistence fails. Never regenerate to fix storage.
          return c.json({
            ...record,
            url: `data:audio/mpeg;base64,${base64}`,
            cacheHit,
            persistencePending: true,
          })
        }
      }
      if (pending) return complete(pending.record, pending.base64, true)
      if (stored) return deliver(stored, true)
      const client = admin()
      c.set("audioOperation", "storage_preflight")
      await prepareStorage(client, owner)
      // Atomic unique insertion: uncertain paid requests never silently regenerate.
      const lockKey = `${cacheKey}:lock`
      const { error: lock } = await client
        .from("kv_store_4bc3557f")
        .insert({ key: lockKey, value: { at: Date.now() } })
      if (lock) {
        if (lock.code !== "23505") throw indexError(lock)
        throw new AudioError(
          409,
          "generation_locked",
          "Esta solicitud ya se inició. Revisa el historial y el almacenamiento antes de repetir; no se cobró otra generación.",
        )
      }
      let result
      try {
        c.set("audioOperation", "elevenlabs_generation")
        result = await generateAudio(key(), config)
      } catch (caught) {
        const error = caught as any
        if ([400, 401, 402, 403, 404, 422, 429].includes(error.status))
          try {
            await kv.del(lockKey)
          } catch {}
        throw error
      }
      const path = `${owner}/${id}.mp3`
      const record = {
        id,
        path,
        kind: config.kind,
        words: result.words,
        timingSource: result.words.length
          ? "provider-character-alignment"
          : "estimated",
        createdAt: new Date().toISOString(),
      }
      let binary = ""
      for (let i = 0; i < result.bytes.length; i += 8192)
        binary += String.fromCharCode(...result.bytes.subarray(i, i + 8192))
      const base64 = btoa(binary)
      try {
        await kv.set(pendingKey, { record, base64 })
      } catch {
        return c.json({
          ...record,
          url: `data:audio/mpeg;base64,${base64}`,
          cacheHit: false,
          persistencePending: true,
        })
      }
      return complete(record, base64, false)
    }),
  )
  app.get(
    `${root}/state/:id`,
    safe(async (c: any) =>
      c.json({
        state:
          (await kv.get(
            `audio:state:${c.get("ownerId")}:${c.req.param("id")}`,
          )) || null,
      }),
    ),
  )
  app.post(
    `${root}/state/:id`,
    safe(async (c: any) => {
      const text = await c.req.text()
      if (text.length > 200000)
        throw new AudioError(
          400,
          "state_too_large",
          "Demasiados ajustes. Reduce el número de eventos.",
        )
      await kv.set(
        `audio:state:${c.get("ownerId")}:${c.req.param("id")}`,
        JSON.parse(text),
      )
      return c.json({ saved: true })
    }),
  )
}
