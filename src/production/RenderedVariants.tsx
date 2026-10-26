import { useEffect, useState } from "react"
import type { Project } from "./data"
import { renderSpec } from "./render-spec"
import { activePacks } from "./timing"
import DownloadButton from "../media/DownloadButton"
import { publicAssetUrl } from "../media/files"
import MixedVideo from "../audio/MixedVideo"

type Artifact = {
  pack: string
  width: number
  height: number
  fps: number
  bytes: number
  url: string
  sha256?: string
}
type Manifest = {
  spec: ReturnType<typeof renderSpec>
  variants: Artifact[]
  status: string
}

export default function RenderedVariants({ project }: { project: Project }) {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const abort = new AbortController()
    fetch(publicAssetUrl("/exports/finn-animatics.json"), {
      cache: "no-store",
      signal: abort.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((value) => {
        if (
          value &&
          Array.isArray(value.variants) &&
          value.variants.every(
            (v: Artifact) =>
              activePacks.includes(v.pack as typeof activePacks[number]) &&
              /^\/exports\/finn-(pop|karaoke|kinetic|comic)-animatic-(1080|4k)\.mp4$/.test(
                v.url,
              ),
          )
        )
          setManifest(value)
      })
      .catch(() => {})
    return () => abort.abort()
  }, [refresh])
  if (!manifest?.variants.length)
    return (
      <div className="p-warning">
        Aún no hay MP4 verificados disponibles para descargar. La reproducción
        interactiva y los SRT/VTT sí están disponibles arriba.{" "}
        <button
          className="p-secondary"
          onClick={() => setRefresh((n) => n + 1)}
        >
          Actualizar exportaciones
        </button>
      </div>
    )
  const matches =
    JSON.stringify(manifest.spec) === JSON.stringify(renderSpec(project))
  return (
    <section>
      <div className="p-section-head">
        <div>
          <h2>Animatics renderizados</h2>
          <p>
            Los archivos visuales base son animatics. Si has generado audio,
            estos reproductores usan tu mezcla actual. Revisión visual final
            pendiente.
          </p>
        </div>
        <button
          className="p-secondary"
          onClick={() => setRefresh((n) => n + 1)}
        >
          Actualizar exportaciones
        </button>
      </div>
      {!matches && (
        <div className="p-warning">
          Estos MP4 son una versión anterior y pueden conservar los subtítulos
          antiguos. La preview ya usa el nuevo motor global; estos archivos no
          se presentan como una exportación del rediseño actual.
        </div>
      )}
      <div className="p-rendered-grid">
        {activePacks.map((pack) => {
          const artifacts = manifest.variants.filter((v) => v.pack === pack)
          if (!artifacts.length) return null
          const preview =
            artifacts.find((v) => v.width === 1080) || artifacts[0]
          return (
            <article key={pack}>
              <h3>
                {pack === "comic"
                  ? "Cómic"
                  : pack[0].toUpperCase() + pack.slice(1)}
              </h3>
              <MixedVideo
                projectId={`finn:${project.id}`}
                controls
                playsInline
                preload="metadata"
                src={publicAssetUrl(preview.url)}
                aria-label={`Animatic completo ${pack} con mezclador`}
              />
              <div className="p-actions">
                {artifacts.map((v) => (
                  <DownloadButton
                    key={v.width}
                    className="p-secondary"
                    file={{
                      url: publicAssetUrl(v.url),
                      filename: v.url.split("/").at(-1)!,
                      mime: "video/mp4",
                      sha256: v.sha256,
                      bytes: v.bytes,
                    }}
                  >
                    MP4 {v.width === 2160 ? "4K" : "1080"} ·{" "}
                    {(v.bytes / 1048576).toFixed(1)} MB
                  </DownloadButton>
                ))}
                <a
                  className="p-secondary"
                  href={publicAssetUrl(`/exports/finn-${pack}-estimated.srt`)}
                  download
                >
                  SRT
                </a>
                <a
                  className="p-secondary"
                  href={publicAssetUrl(`/exports/finn-${pack}-estimated.vtt`)}
                  download
                >
                  VTT
                </a>
              </div>
              <p>Base visual: 57 s · 60 fps · tiempos estimados</p>
            </article>
          )
        })}
      </div>
      <details className="p-qa-evidence">
        <summary>Revisión visual y evidencia · necesita revisión</summary>
        <p>
          21 muestras de Pop inspeccionadas individualmente; 570 instantes con
          control de texto dentro del canvas. Son muestras de la preview
          compartida, no un certificado de calidad final.
        </p>
        <p>
          Pendientes detectados: limpiar la densidad de etiquetas numéricas,
          cerrar el loop visual exacto y revisar exhaustivamente las otras tres
          variantes. Sin audio no puede aprobarse sincronía.
        </p>
        <a
          className="p-secondary"
          href={publicAssetUrl("/exports/finn-qa.json")}
          download
        >
          Descargar informe QA
        </a>
        <div className="p-qa-thumbs">
          {[1, 2, 3, 4, 5, 6, 7].map((scene) => (
            <a
              key={scene}
              href={publicAssetUrl(
                `/exports/finn-qa/scene-${scene}-middle.png`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={publicAssetUrl(
                  `/exports/finn-qa/scene-${scene}-middle.png`,
                )}
                alt={`Muestra central revisada de la escena ${scene}`}
                loading="lazy"
              />
              <span>Escena {scene}</span>
            </a>
          ))}
        </div>
      </details>
    </section>
  )
}
