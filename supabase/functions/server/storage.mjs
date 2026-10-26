export class StorageOperationError extends Error {
  constructor(code, operation, message, status = 502) {
    super(message)
    this.code = code
    this.operation = operation
    this.status = status
  }
}
function statusOf(error) {
  return Number(error?.statusCode || error?.status || 0)
}
/** Exercise the same MIME types used by generation before spending provider credits. */
export async function verifyAudioStorage(
  client,
  bucket,
  userId,
  mimeTypes = ["audio/mpeg", "application/json"],
) {
  const path = `${userId}/checks/${crypto.randomUUID()}`
  const store = client.storage.from(bucket)
  const paths = mimeTypes.map(
    (type) => `${path}.${type === "audio/mpeg" ? "mp3" : "json"}`,
  )
  try {
    for (const [index, contentType] of mimeTypes.entries()) {
      const bytes = new TextEncoder().encode(index ? "{}" : "ID3")
      const result = await store.upload(paths[index], bytes, {
        contentType,
        upsert: false,
      })
      if (result.error)
        throw storageFailure(
          result.error,
          `preflight_${index ? "metadata" : "audio"}_upload`,
        )
    }
    const result = await store.createSignedUrl(paths[0], 60)
    if (result.error) throw storageFailure(result.error, "preflight_signed_url")
  } finally {
    // Cleanup is limited to unique probe paths, never actual tracks or generation locks.
    try {
      await store.remove(paths)
    } catch {}
  }
}
export function storageFailure(error, operation) {
  const status = statusOf(error)
  if (status === 401 || status === 403)
    return new StorageOperationError(
      "storage_permission_denied",
      operation,
      "El backend no tiene permiso para acceder a Storage. Revisa la configuración de servicio de Supabase; no es un error de la clave de ElevenLabs.",
      503,
    )
  if (status === 404)
    return new StorageOperationError(
      "storage_object_missing",
      operation,
      "No se encuentra este archivo o su contenedor en Storage. Se conservan las demás pistas; puedes recuperar o volver a subir únicamente este archivo.",
      404,
    )
  if (status === 413)
    return new StorageOperationError(
      "storage_file_too_large",
      operation,
      "Storage ha rechazado el archivo por tamaño. El límite de la aplicación es 60 MB por MP4 y 15 MB por audio.",
      413,
    )
  if (status === 429)
    return new StorageOperationError(
      "storage_rate_limited",
      operation,
      "Supabase está limitando las peticiones. Tus archivos no se han eliminado; espera y vuelve a comprobar la nube.",
      503,
    )
  const failure = new StorageOperationError(
    "storage_operation_failed",
    operation,
    `Supabase no ha confirmado la operación «${operation}» (HTTP ${status || "no disponible"}). Se conservan las pistas existentes. No regeneres la voz para reintentar el guardado.`,
  )
  failure.storageStatus = status || null
  return failure
}
/** Retry persistence only, with the same bytes/path; never retry paid generation. */
export async function uploadGeneratedAudio(
  client,
  bucket,
  path,
  bytes,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let result
    try {
      result = await client.storage
        .from(bucket)
        .upload(path, bytes, { contentType: "audio/mpeg", upsert: false })
    } catch {
      result = { error: { status: 0 } }
    }
    if (!result.error) return
    const status = statusOf(result.error)
    // Content-addressed path and generation lock ensure a retry cannot replace another track.
    if (
      status === 409 ||
      /already exists|duplicate/i.test(result.error.message || "")
    )
      return
    if (attempt === 2 || ![0, 408, 429, 500, 502, 503, 504].includes(status))
      throw storageFailure(result.error, "generated_audio_upload")
    await wait(350 * 2 ** attempt)
  }
}
export function indexFailure(error, operation) {
  const code = error?.code
  const message = ["42P01", "PGRST205"].includes(code)
    ? "No existe el índice KV de proyectos en Supabase. El backend debe disponer de la tabla kv_store_4bc3557f; los archivos en Storage no se han borrado."
    : code === "42501"
      ? "El backend no tiene permiso de escritura/lectura en el índice de proyectos. Revisa el rol de servicio de Supabase, no la clave de ElevenLabs."
      : "Supabase no ha confirmado el índice de proyectos. Los archivos subidos conservan su copia de metadatos en Storage; no vuelvas a generar voz para reintentar este guardado."
  return new StorageOperationError(
    "project_index_error",
    operation,
    message,
    503,
  )
}
export async function prepareBucket(client, name, mimeTypes, limit) {
  const result = await client.storage.getBucket(name)
  // Storage also reports a missing bucket as HTTP 400, not only 404.
  const missing =
    statusOf(result.error) === 404 ||
    (statusOf(result.error) === 400 &&
      /bucket.*not found/i.test(result.error?.message || ""))
  if (result.error && !missing)
    throw storageFailure(result.error, "bucket_read")
  if (!result.data) {
    const create = await client.storage.createBucket(name, {
      public: false,
      fileSizeLimit: limit,
      allowedMimeTypes: mimeTypes,
    })
    if (!create.error) return
    if (
      statusOf(create.error) !== 409 &&
      !/already exists|duplicate/i.test(create.error.message || "")
    )
      throw storageFailure(create.error, "bucket_create")
    const concurrent = await client.storage.getBucket(name)
    if (concurrent.error || !concurrent.data)
      throw storageFailure(concurrent.error, "bucket_read")
    result.data = concurrent.data
  }
  const data = result.data
  const allowed = data.allowed_mime_types
  const restrictedTypes =
    Array.isArray(allowed) && mimeTypes.some((type) => !allowed.includes(type))
  const tooSmall =
    Number(data.file_size_limit) > 0 && Number(data.file_size_limit) < limit
  if (data.public || restrictedTypes || tooSmall) {
    const update = await client.storage.updateBucket(name, {
      public: false,
      ...(tooSmall ? { fileSizeLimit: limit } : {}),
      ...(restrictedTypes
        ? { allowedMimeTypes: [...new Set([...allowed, ...mimeTypes])] }
        : {}),
    })
    if (update.error) throw storageFailure(update.error, "bucket_update")
  }
}
export async function writeAssetMetadata(client, record) {
  const sidecar = `${record.path.slice(0, record.path.lastIndexOf("."))}.asset.json`
  const result = await client.storage
    .from(record.bucket)
    .upload(sidecar, new TextEncoder().encode(JSON.stringify(record)), {
      contentType: "application/json",
      upsert: false,
    })
  if (
    result.error &&
    statusOf(result.error) !== 409 &&
    !/already exists|duplicate/i.test(result.error.message || "")
  )
    throw storageFailure(result.error, "metadata_backup")
}
export async function recoverAssetMetadata(client, buckets, user, id) {
  if (!/^[a-f0-9]{64}$/.test(id)) return null
  for (const bucket of buckets) {
    const result = await client.storage
      .from(bucket)
      .download(`${user}/${id}.asset.json`)
    if (result.error) {
      if (statusOf(result.error) === 404 || statusOf(result.error) === 400)
        continue
      throw storageFailure(result.error, "metadata_recovery")
    }
    let record
    try {
      record = JSON.parse(await result.data.text())
    } catch {
      continue
    }
    if (
      record.id === id &&
      record.bucket === bucket &&
      record.path?.startsWith(`${user}/`)
    )
      return record
  }
  return null
}
