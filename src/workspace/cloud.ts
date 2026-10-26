import { projectId, publicAnonKey } from "../../utils/supabase/info"
import {
  api,
  studioApi,
  type AudioAsset,
  type Generation,
} from "../motion-lab/api"
export interface CloudProject {
  id: string
  title?: string
  kind?: string
  template?: string
  text?: string
  settings?: Record<string, unknown>
  revision: number
  tracks?: Record<string, string>
  renders?: Record<string, string>
  media?: Record<string, AudioAsset>
  renderFiles?: Record<string, AudioAsset>
  generation?: Generation | null
  updatedAt?: string
}
export const cloud = {
  versions: (id: string, token: string) =>
    api<{ versions: Array<{ id: string; name: string; createdAt: string }> }>(`/projects/${encodeURIComponent(id)}/versions`, undefined, token),
  version: (id: string, name: string, token: string) =>
    api(`/projects/${encodeURIComponent(id)}/versions`, { name }, token),
  restore: (id: string, version: string, revision: number, token: string) =>
    api(`/projects/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/restore`, { revision }, token),
  list: async (token: string) => {
    const result = await api<{ projects: CloudProject[] }>("/projects", undefined, token)
    if (!Array.isArray(result?.projects)) throw new Error("El servidor aún no ofrece la galería de proyectos. Publica la actualización de server.")
    return result
  },
  load: async (id: string, token: string) => {
    const result = await api<{ project: CloudProject | null }>(
      `/projects/${encodeURIComponent(id)}`,
      undefined,
      token,
    )
    if (!result || !Object.hasOwn(result, "project") || result.project && (result.project.id !== id || !Number.isInteger(result.project.revision))) throw new Error("La respuesta del proyecto no es válida. Se conserva la copia local.")
    return result
  },
  save: (
    id: string,
    patch: Partial<CloudProject>,
    revision: number,
    token: string,
  ) =>
    api<{ project: CloudProject }>(
      `/projects/${encodeURIComponent(id)}`,
      { ...patch, revision },
      token,
    ),
  assets: (token: string) =>
    api<{
      assets: Array<{
        id: string
        kind: string
        name: string
        createdAt: string
        bytes: number | null
        textPreview?: string
      }>
    }>("/assets", undefined, token),
  asset: (id: string, token: string) =>
    api<{ asset: AudioAsset }>(
      `/assets/${encodeURIComponent(id)}`,
      undefined,
      token,
    ),
  attach: (id: string, kind: string, assetId: string, token: string) =>
    api<{ project: CloudProject }>(
      `/projects/${encodeURIComponent(id)}/attach`,
      { kind, assetId },
      token,
    ),
}
export async function uploadProjectFile(
  id: string,
  kind: string,
  file: File,
  token: string,
  variant = "master",
  onlyIfMissing = false,
) {
  const body = new FormData()
  body.set("file", file)
  body.set("kind", kind)
  body.set("variant", variant)
  body.set("onlyIfMissing", String(onlyIfMissing))
  let response
  try {
    response = await fetch(
      `${studioApi}/projects/${encodeURIComponent(id)}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, apikey: publicAnonKey },
        body,
        signal: AbortSignal.timeout(190000),
      },
    )
  } catch {
    throw new Error(
      "No se pudo confirmar la subida. Los archivos ya guardados no se han eliminado; actualiza la nube antes de repetir.",
    )
  }
  let data
  try {
    data = await response.json()
  } catch {
    throw new Error(
      "El backend de archivos no está disponible. Publica la actualización de server desde los ajustes de Make.",
    )
  }
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `No se pudo guardar (HTTP ${response.status}).`,
    )
  return data as { project: CloudProject }
}
export const cloudProjectName = projectId
