import { useCallback, useEffect, useRef, useState } from "react"
import { useStudioSession } from "./Session"
import { cloud, uploadProjectFile, type CloudProject } from "./cloud"
import DownloadButton from "../media/DownloadButton"
import {
  publicAssetUrl,
  verifiedDownload,
  type DownloadFile,
} from "../media/files"
import type { AudioAsset } from "../motion-lab/api"
import AudioVideoJoin from "../media/AudioVideoJoin"
interface Source {
  url: string
  filename: string
  mime: DownloadFile["mime"]
  kind: "render" | "sfx"
  variant?: string
  sha256?: string
  bytes?: number
}
interface Props {
  id: string
  title: string
  kind?: string
  template?: string
  sources: Source[]
  onLoaded?: (project: CloudProject | null) => void
}
export default function ProjectFiles({
  id,
  title,
  kind,
  template,
  sources,
  onLoaded,
}: Props) {
  const { token, session } = useStudioSession()
  const [project, setProject] = useState<CloudProject | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("")
  const [assets, setAssets] = useState<Array<{
    id: string
    name: string
    kind: string
    textPreview?: string
  }>>([])
  const [previews, setPreviews] = useState<Record<string, AudioAsset>>({})
  const [checkedCloud, setCheckedCloud] = useState(false)
  const [versionName, setVersionName] = useState("")
  const [versions, setVersions] = useState<Array<{ id: string; name: string; createdAt: string }>>([])
  const archived = useRef(new Set<string>())
  const mounted = useRef(false),
    request = useRef(0),
    currentToken = useRef(token)
  currentToken.current = token
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      request.current++
    }
  }, [])
  const refresh = useCallback(async () => {
    const sequence = ++request.current
    if (!token || !session?.authenticated) {
      setCheckedCloud(false)
      setProject(null)
      setAssets([])
      setPreviews({})
      onLoaded?.(null)
      return
    }
    setError("")
    try {
      const result = await cloud.load(id, token)
      if (
        !mounted.current ||
        sequence !== request.current ||
        token !== currentToken.current
      )
        return
      setCheckedCloud(true)
      setProject(result.project)
      onLoaded?.(result.project)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo recuperar el proyecto.",
      )
    }
  }, [id, token, session?.authenticated, onLoaded])
  useEffect(() => {
    void refresh()
    return () => {
      request.current++
    }
  }, [refresh])
  useEffect(() => {
    const update = (event: Event) => {
      if ((event as CustomEvent).detail === id) void refresh()
    }
    window.addEventListener("studio-project-updated", update)
    return () => window.removeEventListener("studio-project-updated", update)
  }, [refresh, id])
  useEffect(() => {
    const key = `${session?.userId}:${id}:${sources.map((source) => `${source.kind}:${source.variant || "master"}:${source.sha256 || source.url}`).join("|")}`
    if (
      session?.authorized &&
      checkedCloud &&
      sources.length &&
      !busy &&
      !archived.current.has(key)
    ) {
      archived.current.add(key)
      void archive()
    }
  }, [session?.authorized, session?.userId, checkedCloud, sources, busy, id])
  async function ensureProject() {
    const existing = await cloud.load(id, token)
    if (!existing.project)
      await cloud.save(
        id,
        { title, kind: kind || "study", template: template || id },
        0,
        token,
      )
  }
  async function archive() {
    if (!session?.authorized) return
    setBusy("Preparando archivos…")
    setError("")
    try {
      const existing = await cloud.load(id, token)
      if (!existing.project)
        await cloud.save(
          id,
          {
            title,
            kind: kind || (id.startsWith("finn:") ? "finn" : "study"),
            template: template || id,
          },
          0,
          token,
        )
      const missing = sources.filter((source) =>
        source.kind === "render"
          ? !existing.project?.renders?.[source.variant || "master"]
          : !existing.project?.tracks?.[source.kind],
      )
      if (!missing.length) return
      for (let index = 0; index < missing.length; index++) {
        const source = missing[index]
        setBusy(`Guardando archivo ${index + 1} de ${missing.length}…`)
        const verified = await verifiedDownload({
          ...source,
          url: publicAssetUrl(source.url),
        })
        await uploadProjectFile(
          id,
          source.kind,
          new File([verified.blob], verified.filename, { type: source.mime }),
          token,
          source.variant,
          true,
        )
      }
      await refresh()
      window.dispatchEvent(
        new CustomEvent("studio-project-updated", { detail: id }),
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron alojar los archivos.",
      )
    } finally {
      setBusy("")
    }
  }
  async function uploadMusic(file?: File) {
    if (!file || !session?.authorized) return
    setBusy("Guardando música…")
    setError("")
    try {
      await ensureProject()
      await uploadProjectFile(id, "music", file, token)
      await refresh()
      window.dispatchEvent(
        new CustomEvent("studio-project-updated", { detail: id }),
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la música.",
      )
    } finally {
      setBusy("")
    }
  }
  async function recoverAssets() {
    setBusy("Buscando archivos…")
    setError("")
    try {
      setAssets((await cloud.assets(token)).assets)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron listar los archivos anteriores.",
      )
    } finally {
      setBusy("")
    }
  }
  async function attach(assetId: string, kind: string) {
    setBusy("Vinculando archivo…")
    setError("")
    try {
      await ensureProject()
      await cloud.attach(id, kind, assetId, token)
      await refresh()
      window.dispatchEvent(
        new CustomEvent("studio-project-updated", { detail: id }),
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo recuperar el archivo.",
      )
    } finally {
      setBusy("")
    }
  }
  async function preview(assetId: string) {
    try {
      const result = await cloud.asset(assetId, token)
      setPreviews((previous) => ({ ...previous, [assetId]: result.asset }))
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo recuperar la muestra.",
      )
    }
  }
  async function versionAction(action: "list" | "save" | "restore", versionId?: string) {
    setBusy("Actualizando versiones…")
    setError("")
    try {
      await ensureProject()
      if (action === "save") {
        const settings: Record<string, unknown> = {}
        window.dispatchEvent(new CustomEvent("studio-capture-settings", { detail: { id, settings } }))
        if (Object.keys(settings).length) {
          const latest = (await cloud.load(id, token)).project
          await cloud.save(id, { settings: { ...latest?.settings, ...settings } }, latest?.revision || 0, token)
        }
        await cloud.version(id, versionName.trim() || `Versión ${new Date().toLocaleString("es")}`, token)
        setVersionName("")
      }
      if (action === "restore" && versionId) {
        const latest = (await cloud.load(id, token)).project
        await cloud.restore(id, versionId, latest?.revision || 0, token)
        const restored = (await cloud.load(id, token)).project
        window.dispatchEvent(new CustomEvent("studio-version-restored", { detail: { id, settings: restored?.settings } }))
        await refresh()
        window.dispatchEvent(new CustomEvent("studio-project-updated", { detail: id }))
      }
      setVersions((await cloud.versions(id, token)).versions)
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo recuperar la versión.") }
    finally { setBusy("") }
  }
  return (
    <section className="wg-files">
      <div>
        <span className="ml-kicker">ARCHIVOS DEL VÍDEO</span>
        <h3>Guardados con el proyecto, no con el ordenador.</h3>
        <p>
          Voz, SFX, música y renders se guardan en Storage privado. Al volver a
          iniciar sesión se recuperan enlaces nuevos, sin volver a generar
          audio.
        </p>
      </div>
      {!session?.authenticated && (
        <p>
          Inicia sesión en «Nube y cuenta» para recuperar tus archivos de otro
          equipo.
        </p>
      )}
      {error && (
        <p className="ml-error" role="alert">
          {error}
        </p>
      )}
      {project && (
        <p className="wg-cloud-state">
          Proyecto recuperado de Supabase · revisión {project.revision} ·{" "}
          {project.updatedAt
            ? new Date(project.updatedAt).toLocaleString("es")
            : ""}
        </p>
      )}
      <div className="wg-file-list">
        {Object.entries({
          ...(project?.media || {}),
          ...Object.fromEntries(
            Object.entries(project?.renderFiles || {}).map(([key, value]) => [
              `render-${key}`,
              value,
            ]),
          ),
        }).map(([kind, file]) => (
          <div key={kind}>
            <span>
              {kind.startsWith("render-")
                ? `MP4 · ${kind.slice(7)}`
                : kind === "voice"
                  ? "Voz"
                  : kind === "sfx"
                    ? "SFX"
                    : "Música"}
            </span>
            <small>{file.name || file.id.slice(0, 12)}</small>
            <DownloadButton
              className="ml-button ml-button-quiet"
              file={async () => {
                const fresh = (await cloud.load(id, token)).project
                const updated = kind.startsWith("render-")
                  ? fresh?.renderFiles?.[kind.slice(7)]
                  : fresh?.media?.[kind]
                if (!updated)
                  throw new Error("No se encuentra este archivo en la nube.")
                return {
                  url: updated.url,
                  filename:
                    updated.name ||
                    `${id}-${kind}.${
                      kind.startsWith("render-") ? "mp4" : "mp3"
                    }`,
                  mime: (updated.mimeType ||
                    (kind.startsWith("render-")
                      ? "video/mp4"
                      : "audio/mpeg")) as DownloadFile["mime"],
                  sha256: updated.sha256,
                  bytes: updated.bytes,
                }
              }}
            >
              Descargar
            </DownloadButton>
          </div>
        ))}
      </div>
      <div className="wg-file-actions">
        {sources.length > 0 && (
          <button
            className="ml-button"
            disabled={!session?.authorized || Boolean(busy)}
            onClick={() => void archive()}
          >
            Alojar el paquete MP4/audio disponible
          </button>
        )}
        <label className="ml-button">
          Guardar música en nube
          <input
            type="file"
            accept="audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
            disabled={!session?.authorized || Boolean(busy)}
            onChange={(event) => {
              void uploadMusic(event.target.files?.[0])
              event.currentTarget.value = ""
            }}
          />
        </label>
        <button
          className="ml-button ml-button-quiet"
          disabled={!session?.authenticated || Boolean(busy)}
          onClick={() => void recoverAssets()}
        >
          Recuperar audios generados anteriormente
        </button>
        <button
          className="ml-text-button"
          disabled={!session?.authenticated || Boolean(busy)}
          onClick={() => void refresh()}
        >
          Actualizar nube
        </button>
      </div>
      {busy && <p role="status">{busy}</p>}
      <AudioVideoJoin />
      <details>
        <summary>Versiones guardadas · ajustes y pistas de audio</summary>
        <p>Cada versión conserva los ajustes, el guion y las referencias a voz, SFX, música y renders sin duplicar ni borrar archivos.</p>
        <label className="ml-field">
          <span>Nombre de la versión</span>
          <input value={versionName} onChange={(event) => setVersionName(event.target.value)} placeholder="Otra voz · subtítulos cómic" />
        </label>
        <div className="wg-file-actions">
          <button className="ml-button" disabled={!session?.authorized || Boolean(busy)} onClick={() => void versionAction("save")}>Guardar versión actual</button>
          <button className="ml-text-button" disabled={!session?.authenticated || Boolean(busy)} onClick={() => void versionAction("list")}>Ver mis versiones</button>
        </div>
        {versions.map((version) => (
          <div className="wg-recover-file" key={version.id}>
            <span>{version.name}<small>{new Date(version.createdAt).toLocaleString("es")}</small></span>
            <button className="ml-text-button" disabled={!session?.authorized || Boolean(busy)} onClick={() => {
              if (window.confirm("¿Recuperar los ajustes y pistas de esta versión? Los archivos actuales no se eliminarán.")) void versionAction("restore", version.id)
            }}>Recuperar versión</button>
          </div>
        ))}
      </details>
      {assets.length > 0 && (
        <details open>
          <summary>Archivos de tu cuenta · elige qué pista recuperar</summary>
          {assets.map((asset) => (
            <div className="wg-recover-file" key={asset.id}>
              <span>
                {asset.kind} · {asset.name}
                <small>{asset.textPreview}</small>
              </span>
              <button
                className="ml-text-button"
                onClick={() => void preview(asset.id)}
              >
                Ver / escuchar
              </button>
              <button
                className="ml-text-button"
                disabled={!session?.authorized || Boolean(busy)}
                onClick={() => void attach(asset.id, asset.kind)}
              >
                Vincular a este vídeo
              </button>
              {previews[asset.id] &&
                (asset.kind === "render" ? (
                  <video controls playsInline src={previews[asset.id].url} />
                ) : (
                  <audio controls preload="none" src={previews[asset.id].url} />
                ))}
            </div>
          ))}
        </details>
      )}
      <p className="ml-footnote">
        Un enlace firmado puede caducar, pero el archivo permanece guardado. Si
        un archivo antiguo no tiene proyecto asociado, recupéralo de la lista
        anterior. Música sin pista guardada no se anuncia como generada.
      </p>
    </section>
  )
}
