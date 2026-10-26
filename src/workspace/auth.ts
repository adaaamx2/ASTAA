import { projectId, publicAnonKey } from "../../utils/supabase/info"
import { studioApi } from "../motion-lab/api"
const base = `https://${projectId}.supabase.co/auth/v1`
async function accessFetch(url: string, options: RequestInit) {
  try {
    return await fetch(url, options)
  } catch {
    throw new Error(
      `No se pudo conectar con Supabase (${projectId}). Comprueba la conexión del proyecto en Make y tu conexión a Internet. Este error no confirma que la contraseña sea incorrecta.`,
    )
  }
}
export type Credentials = {
  access_token: string
  refresh_token: string
  expires_at: number
}
export async function authRequest(path: string, body: unknown, token?: string) {
  const response = await accessFetch(`${base}/${path}`, {
    method: path === "user" ? "PUT" : "POST",
    headers: {
      apikey: publicAnonKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  let data
  try {
    data = await response.json()
  } catch {
    data = {}
  }
  if (!response.ok)
    throw new Error(
      path === "recover"
        ? "No se pudo enviar el correo. Revisa la configuración de email de Supabase."
        : "No se pudo autenticar. Revisa email y contraseña o utiliza la recuperación.",
    )
  return data
}
export function credentials(data: any): Credentials {
  if (!data.access_token || !data.refresh_token)
    throw new Error("La sesión recibida no es válida.")
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
  }
}
export async function ownerRequest(path: string, body?: unknown) {
  const response = await accessFetch(
    `${studioApi.replace(/\/studio$/, "")}/auth/${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        apikey: publicAnonKey,
        Authorization: `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    },
  )
  if (response.status === 404)
    throw new Error(
      `El proyecto ${projectId} está conectado, pero no está disponible la función ${new URL(studioApi).pathname.split("/")[3]}. Hay que desplegar el backend de Supabase; publicar la web no lo sustituye.`,
    )
  let data
  try {
    data = await response.json()
  } catch {
    throw new Error(
      `El backend no ofrece el acceso de propietario (HTTP ${response.status}). Publica server desde Make → ajustes → Supabase.`,
    )
  }
  if (!response.ok || typeof data !== "object")
    throw new Error(
      data.error ||
        "Publica la versión actual del backend desde los ajustes de Make.",
    )
  return data
}
