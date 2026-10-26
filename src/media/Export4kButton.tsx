import { useEffect, useRef, useState } from "react"
import { Box, Button, Heading, Text } from "../audio/controls"
import { readAudioState, tracksForExport } from "../audio/engine"
import { pausePreview } from "../audio/playback"
import { currentExportCaptions } from "./caption-export"
import { saveBlob, type DownloadFile } from "./files"

interface Props {
  projectId: string
  source?: DownloadFile
  disabled?: boolean
}

export default function Export4kButton({ projectId, source, disabled }: Props) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [projectId])
  async function start() {
    if (!source || controller.current || disabled) return
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    setMessage("Preparando exportación 4K independiente…")
    let release = () => {}
    try {
      pausePreview(projectId)
      const state = readAudioState(projectId)
      const hasMix = Boolean(state?.clips.some((clip) => clip.asset))
      const captions = currentExportCaptions(projectId)
      const mix = hasMix && state ? await tracksForExport(state) : null
      release = mix?.release || release
      request.signal.throwIfAborted()
      const { export4kMp4 } = await import("./export-4k")
      const result = await export4kMp4({
        source,
        tracks: mix?.tracks || [],
        captions,
        duration: hasMix ? state?.duration : undefined,
        normalize: state?.normalize,
        preserveSourceAudio: !hasMix,
        signal: request.signal,
        progress: setMessage,
      })
      saveBlob(
        result.blob,
        `${source.filename.replace(/\.mp4$/i, "")}-4k-60fps.mp4`,
      )
      setMessage(
        `Descargado: ${result.width}×${result.height} · ${result.fps} fps · ${
          result.hasAudio ? "con audio" : "sin audio (según la mezcla)"
        }${
          captions?.words.length ? " · captions grabadas" : ""
        }. Los archivos originales se conservan.`,
      )
    } catch (error) {
      setMessage(
        request.signal.aborted
          ? "Exportación 4K cancelada. Los archivos originales se conservan."
          : error instanceof Error
            ? error.message
            : "No se pudo completar la exportación 4K.",
      )
    } finally {
      release()
      controller.current = null
      setBusy(false)
    }
  }
  return (
    <Box
      className="sound-card sound-export"
      aria-label="Exportación 4K independiente"
    >
      <Heading>Exportación 4K · independiente</Heading>
      <Text>
        Usa el vídeo seleccionado arriba, tu mezcla actual y las captions
        activadas en la vista previa. No genera audio ni consume créditos de
        ElevenLabs.
      </Text>
      <Box className="sound-export-actions">
        <Button
          className="ml-button-primary"
          disabled={busy || disabled || !source}
          onClick={() => void start()}
        >
          {busy ? "Exportando 4K · 60 fps…" : "Exportar MP4 4K · 60 fps"}
        </Button>
        {busy && (
          <Button onClick={() => controller.current?.abort()}>
            Cancelar 4K
          </Button>
        )}
      </Box>
      <Text className="sound-hint">
        2160×3840 vertical o 3840×2160 horizontal, sin recortar y con bandas si
        cambia la proporción. Reescala el MP4 original: no añade detalle ni
        movimiento nativo. Los fps que falten se duplican. Puede tardar varios
        minutos y requerir bastante memoria; evita ejecutar otra exportación a
        la vez.
      </Text>
      {message && (
        <Text className="sound-feedback" role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Box>
  )
}
