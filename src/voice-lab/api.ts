import { studioApi } from "../motion-lab/api"
import { publicAnonKey } from "../../utils/supabase/info"
import type { Character, LabAudio, LabProject } from "./model"

export interface Library {
  characters: Character[]
  audio: LabAudio[]
  projects: LabProject[]
  jobs: LabJob[]
}
interface LabJob {
  id: string
  name: string
  createdAt: string
}
export async function labRequest<T>(
  token: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${studioApi}/voice-lab${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        apikey: publicAnonKey,
        Authorization: `Bearer ${token}`,
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      ...(body === undefined
        ? {}
        : { body: body instanceof FormData ? body : JSON.stringify(body) }),
      signal: AbortSignal.timeout(
        /takes\/|\/align$/.test(path) ? 190000 : 45000,
      ),
    })
  } catch {
    throw new Error(
      "La operación quedó sin confirmar. No se ha repetido ninguna generación: actualiza la biblioteca antes de volver a solicitar audio.",
    )
  }
  let data
  try {
    data = await response.json()
  } catch {
    data = {}
  }
  if (!response.ok) {
    if (response.status === 404 && !data.error)
      throw new Error(
        "La nueva página necesita desplegar las rutas voice-lab del backend de Supabase. La conexión existente y los vídeos anteriores no se han modificado.",
      )
    throw new Error(
      `${data.error || "No se completó la operación"}${
        data.code ? ` · ${data.code}` : ""
      } · HTTP ${response.status}`,
    )
  }
  return data
}

export async function uploadLabFile(
  token: string,
  file: File,
  fields: Record<string, string>,
) {
  const form = new FormData()
  form.set("file", file)
  for (const [name, value] of Object.entries(fields)) form.set(name, value)
  return labRequest<{ record: LabAudio & { id: string } }>(
    token,
    "/upload",
    form,
  )
}
