import { useMemo, useState } from "react"
import type { Generation } from "./api"
import { verifySync, type ClockSamples } from "./sync"

interface Props {
  audio: Generation
  duration: number
  clock: ClockSamples
  onSeek: (time: number, resume: boolean) => void
  onReload: () => void
  onRecheck: () => void
}
export default function SyncPanel({
  audio,
  duration,
  clock,
  onSeek,
  onReload,
  onRecheck,
}: Props) {
  const report = useMemo(
    () => verifySync(audio.text, audio.voice.words, duration),
    [audio, duration],
  )
  const [reviewed, setReviewed] = useState(false)
  const words = audio.voice.words || []
  const canReview =
    report.status === "checked" && clock.count >= 10 && clock.maxDriftMs <= 80
  const labels = {
    provider: "Alineación real del proveedor",
    text: "Texto completo coincide con el guion",
    ordered: "Tiempos válidos y ordenados",
    insideAudio: "Todas las palabras dentro del audio",
  }
  function downloadReport() {
    const content = {
      assetId: audio.voice.id,
      report,
      playbackClock: clock,
      listeningReview: reviewed && canReview ? "confirmed-by-user" : "pending",
      words,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `sync-${audio.voice.id.slice(0, 12)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <details className="ml-sync-report" open>
      <summary>
        Audio + subtítulos ·{" "}
        {report.status === "checked"
          ? "tiempos comprobados"
          : report.status === "pending"
            ? "esperando audio"
            : report.status === "failed"
              ? "hay discrepancias"
              : "sin alineación verificable"}
      </summary>
      <p>
        Duración real:{" "}
        {report.duration
          ? `${report.duration.toFixed(2)} s`
          : "pendiente de decodificar"}{" "}
        · {report.wordCount} palabras. La voz es el reloj de la preview: si se
        detiene o carga, el texto no sigue avanzando solo.
      </p>
      <ul>
        {Object.entries(labels).map(([key, label]) => (
          <li key={key}>
            <strong>
              {report.checks[(key as keyof typeof report.checks)]
                ? "Correcto"
                : "Pendiente / fallo"}
            </strong>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <p>
        {clock.count
          ? `${clock.count} muestras de reproducción · desfase visual máximo observado: ${clock.maxDriftMs.toFixed(0)} ms.`
          : "Reproduce la voz para medir el desfase entre el audio y el reloj visual."}{" "}
        {clock.maxDriftMs > 80 &&
          "Se ha observado un retraso: revisa la reproducción antes de aprobar."}
      </p>
      <div className="ml-sync-actions">
        <button
          className="ml-button ml-button-quiet"
          disabled={!duration}
          onClick={() => {
            setReviewed(false)
            onRecheck()
          }}
        >
          Reproducir y medir sincronía
        </button>
        {(["Inicio", "Mitad", "Final"] as const).map((label, i) => {
          const word =
            words[
              Math.min(
                words.length - 1,
                Math.floor(((words.length - 1) * i) / 2),
              )
            ]
          return (
            <button
              key={label}
              className="ml-button ml-button-quiet"
              disabled={!word || !duration}
              onClick={() => onSeek(Math.max(0, word.start - 0.1), true)}
            >
              Escuchar {label.toLowerCase()}
            </button>
          )
        })}
        <button className="ml-text-button" onClick={onReload}>
          Recargar audio / comprobar duración
        </button>
      </div>
      <p>
        Estas comprobaciones verifican texto y tiempos; no sustituyen escuchar
        las palabras ni certifican por sí solas una sincronía perceptiva
        perfecta.
      </p>
      <label className="ml-check">
        <input
          type="checkbox"
          checked={reviewed && canReview}
          disabled={!canReview}
          onChange={(event) => setReviewed(event.target.checked)}
        />
        <span>
          He escuchado esta voz con los subtítulos y confirmo su sincronía.
        </span>
      </label>
      <button className="ml-text-button" onClick={downloadReport}>
        Descargar informe de sincronía
      </button>
    </details>
  )
}
