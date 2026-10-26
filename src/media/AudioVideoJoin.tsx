import { useState } from "react"
import { mixMp4 } from "./mux"
import { saveBlob } from "./files"

export default function AudioVideoJoin() {
  const [video, setVideo] = useState<File>()
  const [audio, setAudio] = useState<File>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  async function join() {
    if (!video || !audio || busy) return
    setBusy(true)
    const videoUrl = URL.createObjectURL(video),
      audioUrl = URL.createObjectURL(audio)
    try {
      const duration = await new Promise<number>((resolve, reject) => {
        const element = document.createElement("video")
        const timer = setTimeout(
          () => reject(new Error("No se pudo leer la duración del MP4.")),
          15000,
        )
        element.onloadedmetadata = () => {
          clearTimeout(timer)
          resolve(element.duration)
          element.removeAttribute("src")
          element.load()
        }
        element.onerror = () => {
          clearTimeout(timer)
          reject(new Error("Selecciona un MP4 válido."))
        }
        element.preload = "metadata"
        element.src = videoUrl
      })
      const blob = await mixMp4(
        { url: videoUrl, filename: video.name, mime: "video/mp4" },
        [
          {
            file: { url: audioUrl, filename: audio.name, mime: "audio/mpeg" },
            volume: 1,
          },
        ],
        duration,
        setMessage,
      )
      saveBlob(blob, `${video.name.replace(/\.mp4$/i, "")}-con-audio.mp4`)
      setMessage(
        "MP4 con audio descargado. No se ha subido ningún archivo ni usado ElevenLabs.",
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron unir los archivos.",
      )
    } finally {
      URL.revokeObjectURL(videoUrl)
      URL.revokeObjectURL(audioUrl)
      setBusy(false)
    }
  }
  return (
    <details>
      <summary>Alternativa local · unir un MP4 y un MP3</summary>
      <p>
        Sin nube ni créditos. Sustituye el audio del vídeo por el MP3 elegido,
        desde el inicio hasta el final del vídeo.
      </p>
      <div className="wg-file-actions">
        <label className="ml-field">
          <span>Vídeo MP4</span>
          <input
            type="file"
            accept="video/mp4,.mp4"
            disabled={busy}
            onChange={(event) => setVideo(event.target.files?.[0])}
          />
        </label>
        <label className="ml-field">
          <span>Audio MP3</span>
          <input
            type="file"
            accept="audio/mpeg,.mp3"
            disabled={busy}
            onChange={(event) => setAudio(event.target.files?.[0])}
          />
        </label>
        <button
          className="ml-button"
          disabled={!video || !audio || busy}
          onClick={() => void join()}
        >
          {busy ? "Mezclando…" : "Unir y descargar MP4"}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </details>
  )
}
