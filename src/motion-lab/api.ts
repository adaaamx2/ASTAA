import { projectId, publicAnonKey } from "../../utils/supabase/info"
import type { WordTiming } from "../production/timing"
import {
  requestStudio,
  requestGeneration,
  checkAudioStorage,
  StudioRequestError,
} from "./transport"
export { StudioRequestError } from "./transport"

export const studioApi = `https://${projectId}.supabase.co/functions/v1/make-server-bd5da494/studio`
export const samplePhrase =
  "Antes del movimiento, el silencio. Una chispa dibuja el filo. Respira: cada pequeño detalle tiene su propio ritmo."
export type Voice = {
  id: string
  name: string
  previewUrl: string | null
  labels: Record<string, string>
  category?: string
}
export type AudioAsset = {
  id: string
  url: string
  words: WordTiming[]
  timingSource: string | null
  cacheHit: boolean
  billedCharacters: number | null
  name?: string
  kind?: string
  mimeType?: string
  bytes?: number
  sha256?: string
  origin?: string
}
export type Generation = {
  voice: AudioAsset
  sfx: AudioAsset | null
  text: string
  timingSource: string
  status: string
  error?: string
  music?: AudioAsset | null
  projectId?: string
  hosted?: boolean
}
export interface StudioSession {
  authenticated: boolean
  authorized: boolean
  userId: string | null
  reason: string
  message: string
}
export const supabaseSqlUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`

export async function api<T>(
  path: string,
  body?: unknown,
  token?: string,
  signal?: AbortSignal,
): Promise<T> {
  if (path === "/generate" && body !== undefined) {
    return requestGeneration<T>({ url: studioApi, publicKey: publicAnonKey }, {
      body,
      token,
      signal,
    })
  }
  return requestStudio<T>({ url: studioApi, publicKey: publicAnonKey }, path, {
    body,
    token,
    signal,
  })
}
export function checkAudioConnection(token: string, signal?: AbortSignal) {
  return checkAudioStorage({ url: studioApi, publicKey: publicAnonKey }, {
    token,
    signal,
  })
}
export async function signIn(email: string, password: string) {
  let response
  try {
    response = await fetch(
      `https://${projectId}.supabase.co/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: publicAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    )
  } catch {
    throw new StudioRequestError(
      "connection",
      "No se puede conectar con la autenticación de Supabase. No se ha enviado ninguna solicitud a ElevenLabs.",
    )
  }
  const data = await response.json()
  if (!response.ok || !data.access_token)
    throw new Error(
      "No se pudo iniciar la sesión de Supabase. Revisa la cuenta y su permiso de propietario.",
    )
  return data.access_token as string
}
