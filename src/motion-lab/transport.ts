export type StudioFailure = "deployment" | "connection" | "authorization" | "response"

export class StudioRequestError extends Error {
  code?: string
  operation?: string
  storageStatus?: number
  readonly kind: StudioFailure
  readonly status: number | null
  constructor(
    kind: StudioFailure,
    message: string,
    status: number | null = null,
  ) {
    super(message)
    this.name = "StudioRequestError"
    this.kind = kind
    this.status = status
  }
}

interface Endpoint {
  url: string
  publicKey: string
}
interface RequestOptions {
  body?: unknown
  token?: string
  signal?: AbortSignal
  fetcher?: typeof fetch
}
function missingBackend() {
  return new StudioRequestError(
    "deployment",
    "Supabase está conectado, pero su función de voces devuelve HTTP 404: todavía no está publicada. Despliega o vuelve a desplegar la función server desde los ajustes de Make y pulsa «Comprobar conexión». No vuelvas a introducir la API key.",
    404,
  )
}
function missingRoute(path: string) {
  if (path === "/audio/preflight") {
    const error = new StudioRequestError(
      "deployment",
      "El backend de audio sigue sin actualizarse. Despliega la función del proyecto conectado desde Ajustes → Supabase de Make, o usa el script scripts/deploy-audio-backend.mjs. Publicar la web no lo actualiza. No se ha solicitado audio a ElevenLabs.",
      404,
    )
    error.code = "audio_backend_outdated"
    return error
  }
  const error = new StudioRequestError(
    "deployment",
    `El servidor no reconoce la ruta /studio${path.slice(0, 160)}. Esto es una incompatibilidad de rutas, no un error de voz ni de API key. Publicar la web no actualiza por sí solo la función de Supabase. La solicitud no se ha reintentado.`,
    404,
  )
  error.code = "route_not_found"
  return error
}
function networkFailure(paid: boolean) {
  return new StudioRequestError(
    "connection",
    paid
      ? "Se ha perdido la conexión durante la generación. No se puede confirmar el resultado; no se ha reintentado ni se repetirá automáticamente una llamada facturable."
      : "El navegador no puede conectar con el servidor de Supabase. Puede ser un bloqueo de red o CORS. Comprueba que la función server esté desplegada y vuelve a comprobar la conexión; esto no indica que la API key de ElevenLabs sea incorrecta.",
  )
}

/** A plain GET has no authorization headers and therefore needs no CORS preflight.
 * This lets the UI diagnose a missing Edge Function instead of surfacing TypeError.
 * A 401 here is normal when Supabase's gateway requires a JWT; the real request
 * below still sends the project's public authorization header.
 */
export async function checkStudioConnection(
  endpoint: Endpoint,
  options: RequestOptions = {},
) {
  const fetcher = options.fetcher ?? fetch
  const url = endpoint.url.replace(/\/studio\/?$/, "/health")
  let response
  try {
    response = await fetcher(url, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.any([
        ...(options.signal ? [options.signal] : []),
        AbortSignal.timeout(12000),
      ]),
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw networkFailure(false)
  }
  await response.body?.cancel()
  if (response.status === 404) throw missingBackend()
  if (!response.ok && response.status !== 401) {
    throw new StudioRequestError(
      "connection",
      `La comprobación del servidor Supabase devuelve HTTP ${response.status}. El catálogo todavía no se ha cargado.`,
      response.status,
    )
  }
}

export async function requestStudio<T>(
  endpoint: Endpoint,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const fetcher = options.fetcher ?? fetch
  const post = options.body !== undefined
  const paid = post && (path === "/generate" || path === "/audio/generate")
  if (path === "/voices" && !post)
    await checkStudioConnection(endpoint, options)
  let response
  try {
    response = await fetcher(`${endpoint.url}${path}`, {
      method: post ? "POST" : "GET",
      signal: AbortSignal.any([
        ...(options.signal ? [options.signal] : []),
        AbortSignal.timeout(paid ? 190000 : 15000),
      ]),
      headers: {
        Authorization: `Bearer ${options.token || endpoint.publicKey}`,
        apikey: endpoint.publicKey,
        "Content-Type": "application/json",
      },
      ...(post ? { body: JSON.stringify(options.body) } : {}),
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    // Failed preflights can hide a gateway 404. Diagnose with a header-free
    // health GET only; never replay the private or billable operation.
    if (!post && path === "/session")
      await checkStudioConnection(endpoint, options)
    throw networkFailure(paid)
  }
  let data
  try {
    data = await response.json()
  } catch {
    if (response.status === 404) throw missingRoute(path)
    throw new StudioRequestError(
      "response",
      "Supabase no ha devuelto JSON válido. La operación no se ha reintentado.",
      response.status,
    )
  }
  // A missing file/project is a domain error, not a missing Edge route.
  // Only an unstructured router/gateway 404 may activate compatibility fallback.
  if (response.status === 404 && typeof data?.error !== "string")
    throw missingRoute(path)
  if (!response.ok) {
    const knownMessage =
      typeof data?.error === "string" ? data.error.slice(0, 350) : null
    const failure = new StudioRequestError(
      response.status === 401 || response.status === 403
        ? "authorization"
        : "response",
      knownMessage ||
        `Supabase ha rechazado la solicitud (HTTP ${response.status}). No se ha reintentado.`,
      response.status,
    )
    failure.code =
      typeof data?.code === "string" ? data.code.slice(0, 100) : undefined
    failure.operation =
      typeof data?.operation === "string"
        ? data.operation.slice(0, 100)
        : undefined
    failure.storageStatus = Number.isInteger(data?.storageStatus)
      ? data.storageStatus
      : undefined
    throw failure
  }
  return data
}

export interface AudioStorageCheck {
  mode: "verified" | "legacy"
  message: string
}

/** Negotiate free checks only. Never fall back or retry after a paid request. */
export async function checkAudioStorage(
  endpoint: Endpoint,
  options: RequestOptions = {},
): Promise<AudioStorageCheck> {
  const verified = {
    mode: "verified" as const,
    message:
      "Storage e índice comprobados. Esta comprobación no consume créditos.",
  }
  try {
    const check = await requestStudio<{ ready: boolean }>(
      endpoint,
      "/storage-check",
      {
        ...options,
        body: {},
      },
    )
    if (check.ready !== true)
      throw new StudioRequestError(
        "response",
        "El servidor no ha confirmado la escritura de audio. No se ha generado ni facturado audio.",
      )
    return verified
  } catch (error) {
    if (
      !(error instanceof StudioRequestError) ||
      error.code !== "route_not_found"
    )
      throw error
  }
  // Older Make deployments may expose only the established generate route.
  // Omit text, voiceId and billing authorization: an old server rejects this
  // request before any provider call, even if it ignores `operation`.
  try {
    const check = await requestStudio<{ ready: boolean }>(
      endpoint,
      "/generate",
      {
        ...options,
        body: { operation: "storage-check" },
      },
    )
    if (check.ready !== true)
      throw new StudioRequestError(
        "response",
        "Respuesta de comprobación no válida. No se enviará una generación.",
      )
    return verified
  } catch (error) {
    if (
      !(error instanceof StudioRequestError) ||
      error.status !== 400 ||
      error.code ||
      error.operation ||
      !/^(Voz no válida\.|Elige una voz válida\.|Voice ID no válido\.)$/.test(
        error.message,
      )
    )
      throw error
    return {
      mode: "legacy",
      message:
        "Backend anterior detectado: la generación habitual sigue disponible, pero no ofrece comprobación de Storage. No se han consumido créditos. Si falla, recupera las pistas desde Archivos del vídeo; no cambies de voz ni repitas la generación.",
    }
  }
}

export async function requestGeneration<T>(
  endpoint: Endpoint,
  options: RequestOptions,
): Promise<T> {
  await checkAudioStorage(endpoint, options)
  return requestStudio<T>(endpoint, "/generate", options)
}
