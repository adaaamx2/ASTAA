export function resolvePublicAsset(path: string, base: string, origin: string) {
  if (/^https:\/\//i.test(path)) return path
  if (!path.startsWith("/exports/") && !path.startsWith("/references/"))
    throw new Error("Ruta de archivo no permitida.")
  const root = new URL(base.endsWith("/") ? base : `${base}/`, origin)
  return new URL(path.replace(/^\//, ""), root).href
}
export function publicAssetUrl(path: string) {
  return resolvePublicAsset(
    path,
    import.meta.env.BASE_URL,
    window.location.origin,
  )
}
export interface DownloadFile {
  url: string
  filename: string
  mime: "video/mp4" | "audio/mpeg" | "audio/wav" | "audio/ogg" | "application/json"
  sha256?: string
  bytes?: number
}
export function fileSignature(bytes: Uint8Array, mime: string) {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end))
  if (mime === "video/mp4") return bytes.length >= 12 && ascii(4, 8) === "ftyp"
  if (mime === "audio/wav")
    return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE"
  if (mime === "audio/ogg") return ascii(0, 4) === "OggS"
  if (mime === "audio/mpeg")
    return (
      ascii(0, 3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 224) === 224)
    )
  if (mime === "application/json") {
    try {
      JSON.parse(new TextDecoder().decode(bytes))
      return true
    } catch {
      return false
    }
  }
  return false
}
export async function verifiedDownload(
  file: DownloadFile,
  fetcher: typeof fetch = fetch,
) {
  let response
  try {
    response = await fetcher(file.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    })
  } catch {
    throw new Error(
      "No se pudo obtener el archivo. No se ha guardado un TXT ni una página de error como vídeo.",
    )
  }
  if (!response.ok)
    throw new Error(
      `El archivo no está disponible (HTTP ${response.status}). No se ha descargado la respuesta de error.`,
    )
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = new Uint8Array(await response.arrayBuffer())
  } catch {
    throw new Error(
      "La transferencia se interrumpió. No se ha guardado un archivo incompleto.",
    )
  }
  if (!bytes.length || !fileSignature(bytes, file.mime))
    throw new Error(
      "El servidor no ha entregado un archivo válido; puede ser una página HTML/TXT de error. No se ha descargado como MP4.",
    )
  if (file.bytes && bytes.length !== file.bytes)
    throw new Error(
      "La descarga está incompleta. No se ha guardado el archivo.",
    )
  if (file.sha256) {
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
    if (hash !== file.sha256)
      throw new Error(
        "La integridad del archivo no coincide con el render guardado.",
      )
  }
  const extension =
    file.mime === "video/mp4"
      ? "mp4"
      : file.mime === "audio/mpeg"
        ? "mp3"
        : file.mime === "audio/wav"
          ? "wav"
          : file.mime === "audio/ogg"
            ? "ogg"
            : "json"
  const filename =
    file.filename
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/\.[a-z0-9]+$/i, "") + `.${extension}`
  return { blob: new Blob([bytes], { type: file.mime }), filename }
}
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
