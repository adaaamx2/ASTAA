import {
  ProjectRepository,
  cleanProjectPatch,
  validProjectId,
} from "./projects.mjs"
import {
  prepareBucket,
  indexFailure,
  storageFailure,
  writeAssetMetadata,
  recoverAssetMetadata,
} from "./storage.mjs"

const table = "kv_store_4bc3557f"
const bucket = "make-4bc3557f-studio-media"
const legacyBucket = "make-4bc3557f-studio-audio"

export function installProjectRoutes(
  app: any,
  prefix: string,
  admin: any,
  kv: any,
) {
  const root = `${prefix}/studio`
  const sign = async (record: any) => {
    const { data, error } = await admin()
      .storage.from(record.bucket || legacyBucket)
      .createSignedUrl(record.path, 3600)
    if (error) throw storageFailure(error, "signed_url")
    return {
      ...record,
      mimeType: record.mimeType || "audio/mpeg",
      url: data.signedUrl,
    }
  }
  const repository = () =>
    new ProjectRepository(
      {
        get: kv.get,
        set: kv.set,
        recoverAsset: async (user: string, id: string) =>
          recoverAssetMetadata(admin(), [bucket, legacyBucket], user, id),
        compareAndSet: async (
          key: string,
          revision: number,
          value: unknown,
        ) => {
          const client = admin()
          if (revision === 0) {
            const { error } = await client.from(table).insert({ key, value })
            if (error?.code === "23505") return false
            if (error) throw indexFailure(error, "project_insert")
            return true
          }
          const { data, error } = await client
            .from(table)
            .update({ value })
            .eq("key", key)
            .eq("value->>revision", String(revision))
            .select("key")
          if (error) throw indexFailure(error, "project_update")
          return Boolean(data?.length)
        },
      },
      sign,
    )
  const safe = (fn: any) => async (c: any) => {
    try {
      if (c.req.param("id") && !validProjectId(c.req.param("id")))
        return c.json(
          { error: "Proyecto no válido.", code: "invalid_project" },
          400,
        )
      return await fn(c, c.get("ownerId"), repository())
    } catch (error: any) {
      return c.json(
        {
          error: error.code
            ? error.message
            : error.status === 409
              ? error.message
              : "No se pudo completar la operación del proyecto. Los archivos existentes se conservan.",
          code: error.code || "project_operation_failed",
        },
        [400, 404, 409, 413, 503].includes(error.status) ? error.status : 503,
      )
    }
  }
  app.get(
    `${root}/projects`,
    safe(async (c: any, user: string) =>
      c.json({ projects: await kv.getByPrefix(`studio:project:${user}:`) }),
    ),
  )
  app.get(
    `${root}/projects/:id`,
    safe(async (c: any, user: string, repo: any) =>
      c.json({ project: await repo.load(user, c.req.param("id")) }),
    ),
  )
  app.post(
    `${root}/projects/:id`,
    safe(async (c: any, user: string, repo: any) => {
      const body = await c.req.json()
      if (!Number.isInteger(body.revision) || body.revision < 0)
        return c.json({ error: "Falta una revisión válida del proyecto." }, 400)
      return c.json({
        project: await repo.save(
          user,
          c.req.param("id"),
          cleanProjectPatch(body),
          body.revision,
        ),
      })
    }),
  )
  app.get(
    `${root}/projects/:id/versions`,
    safe(async (c: any, user: string) => {
      const versions = await kv.getByPrefix(
        `studio:version:${user}:${c.req.param("id")}:`,
      )
      return c.json({
        versions: versions.map(({ id, name, createdAt }: any) => ({
          id,
          name,
          createdAt,
        })),
      })
    }),
  )
  app.post(
    `${root}/projects/:id/versions`,
    safe(async (c: any, user: string, repo: any) =>
      c.json({
        version: await repo.createVersion(
          user,
          c.req.param("id"),
          (await c.req.json()).name,
        ),
      }),
    ),
  )
  app.post(
    `${root}/projects/:id/versions/:version/restore`,
    safe(async (c: any, user: string, repo: any) =>
      c.json({
        project: await repo.restoreVersion(
          user,
          c.req.param("id"),
          c.req.param("version"),
          (await c.req.json()).revision,
        ),
      }),
    ),
  )
  app.get(
    `${root}/assets`,
    safe(async (c: any, user: string) => {
      const assets = await kv.getByPrefix(`studio:asset:${user}:`)
      return c.json({
        assets: assets.map(
          ({ id, name, kind, createdAt, bytes, text }: any) => ({
            id,
            name,
            kind,
            createdAt,
            bytes,
            textPreview: text?.slice(0, 160),
          }),
        ),
      })
    }),
  )
  app.get(
    `${root}/assets/:asset`,
    safe(async (c: any, user: string, repo: any) =>
      c.json({
        asset: await sign(await repo.asset(user, c.req.param("asset"))),
      }),
    ),
  )
  app.post(
    `${root}/projects/:id/attach`,
    safe(async (c: any, user: string, repo: any) => {
      const body = await c.req.json()
      await repo.attach(user, c.req.param("id"), body.kind, body.assetId)
      return c.json({ project: await repo.load(user, c.req.param("id")) })
    }),
  )
  app.post(
    `${root}/projects/:id/media`,
    safe(async (c: any, user: string, repo: any) => {
      const form = await c.req.formData()
      const file = form.get("file"),
        kind = String(form.get("kind"))
      const variant = String(form.get("variant") || "master")
      if (
        !(file instanceof File) ||
        !["voice", "sfx", "music", "render"].includes(kind) ||
        !/^[a-zA-Z0-9_-]{1,40}$/.test(variant)
      )
        return c.json({ error: "Archivo o tipo de pista no válido." }, 400)
      if (!file.size || file.size > (kind === "render" ? 65000000 : 15000000))
        return c.json(
          { error: "El archivo está vacío o supera el tamaño admitido." },
          413,
        )
      const bytes = new Uint8Array(await file.arrayBuffer())
      const isMp4 =
        bytes.length >= 12 &&
        new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp"
      if (
        (kind === "render" && !isMp4) ||
        (kind !== "render" && !file.type.startsWith("audio/"))
      )
        return c.json(
          {
            error:
              "El contenido no corresponde a un MP4 o archivo de audio válido.",
          },
          400,
        )
      const mimeType = isMp4 ? "video/mp4" : file.type
      await prepareBucket(
        admin(),
        bucket,
        [
          "video/mp4",
          "audio/mpeg",
          "audio/wav",
          "audio/x-wav",
          "audio/ogg",
          "audio/mp4",
          "audio/webm",
          "application/json",
        ],
        65000000,
      )
      const digest = await crypto.subtle.digest("SHA-256", bytes)
      const id = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      const ext = isMp4
        ? "mp4"
        : /wav/.test(mimeType)
          ? "wav"
          : mimeType === "audio/mpeg"
            ? "mp3"
            : mimeType.split("/")[1]
      const record = {
        id,
        kind,
        bucket,
        path: `${user}/${id}.${ext}`,
        name: file.name.slice(0, 200),
        mimeType,
        bytes: bytes.length,
        sha256: id,
        words: [],
        createdAt: new Date().toISOString(),
      }
      const { error } = await admin()
        .storage.from(bucket)
        .upload(record.path, bytes, { contentType: mimeType, upsert: false })
      if (
        error &&
        !/already exists|duplicate/i.test(error.message) &&
        Number(error.statusCode || error.status) !== 409
      )
        throw storageFailure(error, "media_upload")
      await writeAssetMetadata(admin(), record)
      await kv.set(`studio:asset:${user}:${id}`, record)
      await repo.attach(
        user,
        c.req.param("id"),
        kind,
        id,
        {},
        variant,
        form.get("onlyIfMissing") === "true",
      )
      return c.json({ project: await repo.load(user, c.req.param("id")) })
    }),
  )
}
