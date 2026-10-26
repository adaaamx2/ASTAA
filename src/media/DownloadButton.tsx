import { useState, type ReactNode } from "react"
import { saveBlob, verifiedDownload, type DownloadFile } from "./files"
import { readAudioState, tracksForExport } from "../audio/engine"
import { mixMp4 } from "./mux"
import { currentExportCaptions } from "./caption-export"
interface Props {
  file: DownloadFile | (() => Promise<DownloadFile>)
  className?: string
  children: ReactNode
  audioProjectId?: string
}
export default function DownloadButton({
  file,
  className = "ml-button",
  children,
  audioProjectId,
}: Props) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  async function download() {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const source = typeof file === "function" ? await file() : file
      const route = decodeURIComponent(location.hash.replace(/^#video\//, ""))
      const id =
        audioProjectId || (location.hash.startsWith("#video/") ? route : "")
      const state =
        id && !source.url.includes("/references/") ? readAudioState(id) : null
      if (source.mime === "video/mp4" && state) {
        const mix = await tracksForExport(state)
        try {
          const blob = await mixMp4(
            source,
            mix.tracks,
            state.duration,
            setError,
            currentExportCaptions(id),
            { normalize: state.normalize },
          )
          saveBlob(blob, source.filename.replace(/\.mp4$/i, "-mezcla.mp4"))
          setError(
            `Exportado: ${mix.summary}. ${
              currentExportCaptions(id)
                ? "Captions grabadas en el vídeo."
                : "Imagen original copiada."
            }`,
          )
        } finally {
          mix.release()
        }
      } else {
        const result = await verifiedDownload(source)
        saveBlob(result.blob, result.filename)
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el archivo.",
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <span className="download-control">
      <button
        className={className}
        onClick={() => void download()}
        disabled={busy}
      >
        {busy ? "Verificando descarga…" : children}
      </button>
      {error && (
        <span className="download-error" role="status">
          {error}
        </span>
      )}
    </span>
  )
}
