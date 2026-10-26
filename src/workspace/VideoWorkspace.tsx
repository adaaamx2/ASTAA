import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
  type FormEvent,
} from "react"
import MotionLab from "../motion-lab/MotionLab"
import StudyCanvas from "../motion-lab/StudyCanvas"
import { studies, type StudyId } from "../motion-lab/studies"
import FinnWorkspace from "../production/Workspace"
import FinnSequence from "../production/FinnSequence"
import {
  initialStore,
  loadStore,
  saveStore,
  validateStore,
  getRecoveryError,
  type Store,
} from "../production/data"
import DiscordStudio from "../DiscordStudio"
import FigmaStudio from "../FigmaStudio"
import MotionSequence from "../MotionSequence"
import FigmaSequence from "../FigmaSequence"
import { videos } from "../library/videos"
import { useStudioSession } from "./Session"
import AccountAccess from "./AccountAccess"
import ProjectFiles from "./ProjectFiles"
import PreviewBoundary from "./PreviewBoundary"
import { cloud, type CloudProject } from "./cloud"
import DownloadButton from "../media/DownloadButton"
import { publicAssetUrl, type DownloadFile } from "../media/files"
import "./workspace.css"
import AudioWorkspace from "../audio/AudioWorkspace"
import { scenes as defaultScenes } from "../production/data"
import { Button as WorkspaceButton } from "../audio/controls"

const StyleGuide = lazy(() => import("./StyleGuide"))

interface Entry {
  id: string
  title: string
  kind: "study" | "finn" | "archive"
  template: string
  channel: string
  duration: number
  format: string
  description: string
  source?: string
  reference?: boolean
  referenceUrl?: string
}
interface Artifact {
  id?: string
  pack?: string
  url: string
  bytes: number
  sha256?: string
  width?: number
}
function routeId() {
  let route = window.location.hash
  try {
    route = decodeURIComponent(route)
  } catch {
    return ""
  }
  if (route === "#motion-lab") return "enbu"
  if (route === "#workspace")
    return loadStore().projects[0]?.id
      ? `finn:${loadStore().projects[0].id}`
      : "finn-settings"
  if (route.startsWith("#video/"))
    return route.slice(7) === "editing-collage" ? "" : route.slice(7)
  return ""
}
function loadDrafts(): Entry[] {
  try {
    const data = JSON.parse(
      localStorage.getItem("yt-workspace-gallery-v1") || "[]",
    )
    return Array.isArray(data)
      ? data.filter(
          (row) =>
            typeof row.id === "string" &&
            typeof row.title === "string" &&
            row.kind === "study" &&
            (row.template === "editing-collage" ||
              studies.some((study) => study.id === row.template)),
        )
      : []
  } catch {
    return []
  }
}
export default function VideoWorkspace() {
  const { token, session } = useStudioSession()
  const [selected, setSelected] = useState(routeId)
  const [galleryOpen, setGalleryOpen] = useState(!selected)
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [layout, setLayout] = useState("grid")
  const [accountOpen, setAccountOpen] = useState(false),
    [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState(""),
    [newTemplate, setNewTemplate] = useState<StudyId>("enbu")
  const [drafts, setDrafts] = useState(loadDrafts),
    [finn, setFinn] = useState<Store>(loadStore)
  const [remote, setRemote] = useState<CloudProject[]>([]),
    [doc, setDoc] = useState<CloudProject | null>(null)
  const retiredSelection =
    selected === "editing-collage" ||
    drafts.some(
      (row) => row.id === selected && row.template === "editing-collage",
    ) ||
    remote.some(
      (row) => row.id === selected && row.template === "editing-collage",
    )
  useEffect(() => {
    if (!retiredSelection) return
    setSelected("")
    setGalleryOpen(true)
    setDoc(null)
  }, [retiredSelection])
  const [studyArtifacts, setStudyArtifacts] = useState<Artifact[]>([]),
    [finnArtifacts, setFinnArtifacts] = useState<Artifact[]>([])
  const [cloudMessage, setCloudMessage] = useState(
      "Inicia sesión para recuperar tus archivos.",
    ),
    [error, setError] = useState("")
  const [sectionHint, setSectionHint] = useState("videos"),
    [viewHint, setViewHint] = useState("animatic")
  const [finnDirty, setFinnDirty] = useState(false)
  const [restoreEpoch, setRestoreEpoch] = useState(0)
  const currentFinn = useRef(finn)
  currentFinn.current = finn
  useEffect(() => {
    const capture = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail.id.startsWith("finn:"))
        detail.settings.productionStore = loadStore()
    }
    const restore = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!detail.id.startsWith("finn:") || !detail.settings?.productionStore)
        return
      try {
        const incoming = validateStore(detail.settings.productionStore)
        saveStore(incoming, true)
        setFinn(incoming)
        setFinnDirty(true)
        setRestoreEpoch((value) => value + 1)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo recuperar la configuración de Finn.",
        )
      }
    }
    window.addEventListener("studio-capture-settings", capture)
    window.addEventListener("studio-version-restored", restore)
    return () => {
      window.removeEventListener("studio-capture-settings", capture)
      window.removeEventListener("studio-version-restored", restore)
    }
  }, [])
  const editor = useRef<HTMLElement>(null)
  const cloudRequest = useRef(0),
    activeToken = useRef(token)
  activeToken.current = token
  useEffect(() => {
    document.title = "YT Automation · Galería de vídeos"
    const route = () => {
      const id = routeId()
      setSelected(id)
      setGalleryOpen(!id)
      setDoc(null)
    }
    window.addEventListener("hashchange", route)
    return () => window.removeEventListener("hashchange", route)
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem("yt-workspace-gallery-v1", JSON.stringify(drafts))
    } catch {}
  }, [drafts])
  useEffect(() => {
    for (const [path, setter] of [
      ["/exports/studies.json", setStudyArtifacts],
      ["/exports/finn-animatics.json", setFinnArtifacts],
    ] as const) {
      fetch(publicAssetUrl(path), { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          const values = data?.artifacts || data?.variants
          if (Array.isArray(values)) setter(values)
        })
        .catch(() => {})
    }
  }, [])
  const refreshCloud = useCallback(async () => {
    const request = ++cloudRequest.current
    if (!token || !session?.authenticated) {
      setRemote([])
      setDoc(null)
      setCloudMessage("Copia local · inicia sesión para acceder a la nube.")
      return
    }
    setCloudMessage("Recuperando proyectos de Supabase…")
    try {
      const result = await cloud.list(token)
      if (request !== cloudRequest.current || token !== activeToken.current)
        return
      setRemote(result.projects)
      setCloudMessage(
        `${result.projects.filter((project) => project.kind !== "settings").length} proyectos en tu nube privada.`,
      )
    } catch (error) {
      if (request !== cloudRequest.current || token !== activeToken.current)
        return
      setError(
        error instanceof Error ? error.message : "No se pudo cargar la nube.",
      )
      setCloudMessage("Nube sin verificar · tu copia local se conserva.")
    }
  }, [token, session?.authenticated])
  useEffect(() => {
    void refreshCloud()
  }, [refreshCloud])
  useEffect(() => {
    const listener = () => void refreshCloud()
    window.addEventListener("studio-project-updated", listener)
    return () => window.removeEventListener("studio-project-updated", listener)
  }, [refreshCloud])
  const remoteSettings = remote.find(
    (project) => project.id === "workspace-settings",
  )
  async function restoreChannels() {
    try {
      const incoming = validateStore(remoteSettings?.settings?.productionStore)
      saveStore(incoming, true)
      setFinn(incoming)
      setFinnDirty(false)
      setDoc(null)
      setCloudMessage(
        "Configuración recuperada. La copia local anterior conserva su backup.",
      )
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "La copia no es válida.",
      )
    }
  }
  useEffect(() => {
    if (!remoteSettings?.settings?.productionStore || getRecoveryError()) return
    const current = loadStore()
    if (JSON.stringify(current) === JSON.stringify(initialStore))
      void restoreChannels()
  }, [remoteSettings?.revision])
  const entries = useMemo(() => {
    const rows: Entry[] = [
      ...studies.map((study) => ({
        id: study.id,
        title: `${study.title} · ${study.subtitle}`,
        kind: "study" as const,
        template: study.id,
        channel: "Animación",
        duration: study.duration,
        format: `${study.width} × ${study.height}`,
        description: study.description,
        source: study.url,
      })),
      ...finn.projects.map((project) => ({
        id: `finn:${project.id}`,
        title: project.title,
        kind: "finn" as const,
        template: project.id,
        channel:
          finn.channels.find((channel) => channel.id === project.channelId)
            ?.name || "Finn Lab",
        duration: project.scenes.at(-1)?.end || 0,
        format: "9:16",
        description: `${project.scenes.length} escenas · guion, estilos, subtítulos, versiones y exportaciones`,
        source:
          project.id === "ia-por-dentro"
            ? "/exports/finn-pop-animatic-1080.mp4"
            : undefined,
      })),
      ...videos.map((video) => ({
        id: video.id,
        title: video.title,
        kind: "archive" as const,
        template: video.id,
        channel: "Motion editorial",
        duration: video.duration,
        format: video.format,
        description: video.description,
        source: video.exportUrl,
        reference: video.status === "reference",
        referenceUrl: video.referenceUrl,
      })),
      ...drafts.filter(
        (row) =>
          row.id !== "editing-collage" && row.template !== "editing-collage",
      ),
    ]
    const map = new Map(rows.map((row) => [row.id, row]))
    for (const project of remote) {
      if (
        project.kind === "settings" ||
        project.id === "editing-collage" ||
        project.template === "editing-collage"
      )
        continue
      const existing = map.get(project.id)
      if (existing) {
        if (project.title)
          map.set(project.id, { ...existing, title: project.title })
        continue
      }
      const template =
        studies.find((study) => study.id === project.template)?.id || "enbu"
      map.set(project.id, {
        id: project.id,
        title: project.title || "Vídeo recuperado",
        kind: "study",
        template,
        channel: "Tus vídeos",
        duration: studies.find((study) => study.id === template)!.duration,
        format: template === "enbu" ? "1920 × 1292" : "9:16",
        description:
          "Proyecto guardado en Supabase · recupera sus pistas y configuración.",
      })
    }
    return [...map.values()]
  }, [finn, drafts, remote])
  const active: Entry | undefined =
    entries.find((entry) => entry.id === selected) ||
    (selected === "finn-settings"
      ? {
          id: "finn-settings",
          title: "Canales y configuración",
          kind: "finn",
          template: "",
          channel: "Tus canales",
          duration: 0,
          format: "9:16",
          description: "Configuración del workspace",
        }
      : undefined)
  const visible = entries.filter(
    (entry) =>
      (filter === "all" ||
        filter === entry.kind ||
        (filter === "reference" && entry.reference) ||
        (filter === "render" &&
          Boolean(
            entry.source ||
              Object.keys(
                remote.find((project) => project.id === entry.id)?.renders ||
                  {},
              ).length,
          )) ||
        (filter === "cloud" &&
          remote.some((project) => project.id === entry.id))) &&
      `${entry.title} ${entry.channel} ${entry.description}`
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es")),
  )
  const open = (id: string) => {
    setSectionHint("videos")
    setViewHint("animatic")
    setSelected(id)
    setDoc(null)
    setGalleryOpen(false)
    window.location.hash = `video/${id}`
    requestAnimationFrame(() =>
      editor.current?.scrollIntoView({ block: "start" }),
    )
  }
  const onLoaded = useCallback(
    (project: CloudProject | null) => setDoc(project),
    [selected],
  )
  const onFinnChanged = useCallback(
    (store: Store, id?: string) => {
      setFinn(store)
      setFinnDirty(true)
      if (id && selected.startsWith("finn:") && selected !== `finn:${id}`) {
        setViewHint("script")
        setSelected(`finn:${id}`)
        window.location.hash = `video/finn:${id}`
      }
    },
    [selected],
  )
  const sources = useMemo(() => {
    if (!active) return []
    if (active.kind === "finn" && active.template === "ia-por-dentro")
      return finnArtifacts.map((file) => ({
        url: file.url,
        filename: `finn-${file.pack}.mp4`,
        mime: "video/mp4" as const,
        kind: "render" as const,
        variant: file.pack,
        bytes: file.bytes,
        sha256: file.sha256,
      }))
    const artifact = studyArtifacts.find((file) => file.id === active.template)
    const result =
      active.source || artifact
        ? [
            {
              url:
                active.template === "laboral-clothing"
                  ? studies.find((study) => study.id === "laboral-clothing")!.url
                  : active.source || artifact!.url,
              filename: `${active.id}.mp4`,
              mime: "video/mp4" as const,
              kind: "render" as const,
              variant:
                active.template === "brand-strategy"
                  ? `brand-${artifact?.sha256?.slice(0, 12) || "source"}`
                  : "master",
              bytes: artifact?.bytes,
              sha256: artifact?.sha256,
            },
          ]
        : []
    if (
      active.kind === "study" &&
      (active.template === "enbu" || active.template === "blue-hour")
    )
      return [
        ...result,
        {
          url: `/exports/study-${active.template}-atmosphere.wav`,
          filename: `${active.id}-atmosphere.wav`,
          mime: "audio/wav" as const,
          kind: "sfx" as const,
        },
      ]
    return result
  }, [active, studyArtifacts, finnArtifacts])
  async function create(event: FormEvent) {
    event.preventDefault()
    if (!newTitle.trim()) return
    const id = crypto.randomUUID(),
      study = studies.find((study) => study.id === newTemplate)!
    const row: Entry = {
      id,
      title: newTitle.trim(),
      kind: "study",
      template: newTemplate,
      channel: "Tus vídeos",
      duration: study.duration,
      format: `${study.width} × ${study.height}`,
      description:
        "Vídeo independiente con sus propias pistas, guion y ajustes.",
      source: study.url,
    }
    setDrafts((previous) => [...previous, row])
    setCreating(false)
    setNewTitle("")
    open(id)
    if (session?.authorized) {
      try {
        await cloud.save(
          id,
          { title: row.title, kind: row.kind, template: row.template },
          0,
          token,
        )
        await refreshCloud()
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Se conserva la copia local.",
        )
      }
    }
  }
  async function saveChannels() {
    if (!session?.authorized) {
      setAccountOpen(true)
      return
    }
    try {
      const snapshot = finn
      const latest = (await cloud.load("workspace-settings", token)).project
      await cloud.save(
        "workspace-settings",
        {
          title: "Canales y configuración",
          kind: "settings",
          settings: { productionStore: snapshot },
        },
        latest?.revision || 0,
        token,
      )
      if (currentFinn.current === snapshot) setFinnDirty(false)
      await refreshCloud()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo sincronizar.",
      )
    }
  }
  useEffect(() => {
    if (!finnDirty || !session?.authorized) return
    const timer = setTimeout(() => void saveChannels(), 1800)
    return () => clearTimeout(timer)
  }, [finn, finnDirty, session?.authorized, token])
  function thumbnail(entry: Entry) {
    if (entry.reference) return <span>REFERENCIA PENDIENTE</span>
    if (entry.kind === "study")
      return (
        <StudyCanvas
          id={entry.template as StudyId}
          time={
            entry.template === "blue-hour"
              ? 10.5
              : entry.template === "enbu"
                ? 5.2
                : 1.8
          }
        />
      )
    if (entry.kind === "finn") {
      const project = finn.projects.find(
        (project) => project.id === entry.template,
      )
      return project ? (
        <div className="wg-poster">
          <FinnSequence
            time={Math.min(1.5, project.scenes.at(-1)?.end || 1.5)}
            scenes={project.scenes}
            pack={project.pack}
          />
        </div>
      ) : null
    }
    return (
      <div className="wg-poster">
        {entry.template === "discord" ? (
          <MotionSequence time={1.85} />
        ) : (
          <FigmaSequence time={2.5} />
        )}
      </div>
    )
  }
  return (
    <div className="wg-shell">
      <aside className="wg-sidebar">
        <a className="wg-brand" href="#library">
          <span>Y</span>
          <strong>
            yt automation<small>VIDEO WORKSPACE</small>
          </strong>
        </a>
        <p className="ml-kicker">TU ESPACIO</p>
        <button
          className="active"
          onClick={() => {
            window.location.hash = "library"
            setSelected("")
            setGalleryOpen(true)
          }}
        >
          Galería de vídeos <b>{entries.length}</b>
        </button>
        <button onClick={() => setAccountOpen((value) => !value)}>
          Nube y cuenta
        </button>
        <WorkspaceButton
          onClick={() => {
            location.hash = "characters"
          }}
        >
          Personajes y voces
        </WorkspaceButton>
        <button
          onClick={() => {
            const id = finn.projects[0]?.id
            open(id ? `finn:${id}` : "finn-settings")
            setSectionHint("channels")
          }}
        >
          Canales, biblia y referencias
        </button>
        <div className="wg-project-nav">
          <p className="ml-kicker">TODOS LOS VÍDEOS</p>
          {entries.map((entry) => (
            <button
              key={entry.id}
              className={selected === entry.id ? "selected" : ""}
              onClick={() => open(entry.id)}
            >
              <i />
              {entry.title}
            </button>
          ))}
        </div>
        <p className="wg-sidebar-note">
          Un vídeo, sus versiones y todas sus pistas.
          <br />
          Un solo workspace.
        </p>
      </aside>
      <div className="wg-content">
        <header className="wg-topbar">
          <div>
            Workspace <span>/</span>{" "}
            <strong>{active?.title || "Galería de vídeos"}</strong>
          </div>
          <button onClick={() => setAccountOpen((value) => !value)}>
            {session?.authenticated ? "Mi nube privada" : "Iniciar sesión"}
          </button>
        </header>
        <main className="wg-main">
          {error && (
            <div className="ml-error" role="alert">
              {error}
              <button className="ml-text-button" onClick={() => setError("")}>
                Cerrar
              </button>
            </div>
          )}
          {accountOpen && (
            <section className="wg-account">
              <h2>La misma cuenta. Todos tus equipos.</h2>
              <AccountAccess />
              <p>{cloudMessage}</p>
              <button
                className="ml-text-button"
                onClick={() => void refreshCloud()}
              >
                Actualizar mis proyectos
              </button>
              <button
                className="ml-text-button"
                disabled={!session?.authorized}
                onClick={() => void saveChannels()}
              >
                Guardar canales y configuración en nube
                {finnDirty ? " · cambios locales" : ""}
              </button>
              {remoteSettings && (
                <button
                  className="ml-text-button"
                  onClick={() => void restoreChannels()}
                >
                  Restaurar canales de la nube (con backup local)
                </button>
              )}
            </section>
          )}
          <div className="wg-heading">
            <div>
              <p className="ml-kicker">TU COLECCIÓN, SIN CAMBIAR DE ESTUDIO</p>
              <h1>
                {active
                  ? "Cada detalle, en su sitio."
                  : "Todos tus vídeos.\nUn solo lugar."}
              </h1>
              <p>
                {active
                  ? "Guion, animación, voz, SFX, música, versiones y archivos del vídeo seleccionado."
                  : "Crea, revisa y descarga. Los proyectos anteriores también siguen aquí."}
              </p>
            </div>
            <button
              className="ml-button ml-button-primary"
              onClick={() => setCreating((value) => !value)}
            >
              Nuevo vídeo
            </button>
          </div>
          {creating && (
            <form className="wg-create" onSubmit={create}>
              <label className="ml-field">
                <span>Título del vídeo</span>
                <input
                  required
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Tu próxima historia"
                  maxLength={200}
                />
              </label>
              <label className="ml-field">
                <span>Base visual · editable por proyecto</span>
                <select
                  value={newTemplate}
                  onChange={(event) =>
                    setNewTemplate(event.target.value as StudyId)
                  }
                >
                  {studies.map((study) => (
                    <option key={study.id} value={study.id}>
                      {study.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ml-button">Crear vídeo en esta galería</button>
              <p>
                No crea otro estudio: añade un proyecto independiente con sus
                propias pistas.
              </p>
            </form>
          )}
          <details
            className="wg-gallery"
            open={galleryOpen || !active}
            onToggle={(event) => setGalleryOpen(event.currentTarget.open)}
          >
            <summary>
              Galería de vídeos{" "}
              <span>
                {entries.length} proyectos ·{" "}
                {galleryOpen ? "ocultar" : "mostrar"}
              </span>
            </summary>
            <div className="wg-toolbar">
              <label>
                <span>Buscar vídeo</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Título, canal o descripción…"
                />
              </label>
              <label>
                <span>Mostrar</span>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  {[
                    ["all", "Todos"],
                    ["render", "Con MP4 disponible"],
                    ["reference", "Referencias pendientes"],
                    ["study", "Animación"],
                    ["finn", "Canales / Finn"],
                    ["archive", "Motion editorial"],
                    ["cloud", "En la nube"],
                  ].map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <button
                  className={layout === "grid" ? "active" : ""}
                  aria-pressed={layout === "grid"}
                  onClick={() => setLayout("grid")}
                >
                  Cuadrícula
                </button>
                <button
                  className={layout === "list" ? "active" : ""}
                  aria-pressed={layout === "list"}
                  onClick={() => setLayout("list")}
                >
                  Lista
                </button>
              </div>
            </div>
            <div className={`wg-cards ${layout === "list" ? "wg-list" : ""}`}>
              {visible.map((entry) => (
                <article
                  key={entry.id}
                  className={selected === entry.id ? "selected" : ""}
                >
                  <button
                    className={`wg-thumb is-${entry.template}`}
                    aria-label={`Abrir ${entry.title}`}
                    onClick={() => open(entry.id)}
                  >
                    {thumbnail(entry)}
                    <span>{entry.format}</span>
                    <b>
                      {Math.floor(entry.duration / 60)
                        .toString()
                        .padStart(2, "0")}
                      :
                      {Math.round(entry.duration % 60)
                        .toString()
                        .padStart(2, "0")}
                    </b>
                  </button>
                  <div className="wg-card-body">
                    <p>
                      {entry.channel}{" "}
                      <span>
                        {remote.some((project) => project.id === entry.id)
                          ? "EN NUBE"
                          : "PROYECTO"}
                      </span>
                    </p>
                    <button onClick={() => open(entry.id)}>
                      {entry.title}
                    </button>
                    <p>{entry.description}</p>
                    <div>
                      <button
                        className="ml-text-button"
                        onClick={() => open(entry.id)}
                      >
                        Abrir vídeo ↗
                      </button>
                      {entry.source && (
                        <DownloadButton
                          audioProjectId={
                            entry.reference ? undefined : entry.id
                          }
                          className="ml-text-button"
                          file={{
                            url: publicAssetUrl(entry.source),
                            filename: `${entry.id}.mp4`,
                            mime: "video/mp4",
                          }}
                        >
                          Descargar MP4
                        </DownloadButton>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!visible.length && (
              <p className="wg-empty">
                No hay vídeos con este filtro. Prueba otro nombre o selecciona
                «Todos».
              </p>
            )}
          </details>
          {active && (
            <section
              className="wg-editor"
              ref={editor}
              aria-label={`Workspace del vídeo ${active.title}`}
            >
              <header>
                <div>
                  <p className="ml-kicker">
                    VÍDEO SELECCIONADO / {active.channel}
                  </p>
                  <h2>{active.title}</h2>
                </div>
                <button
                  className="ml-button ml-button-quiet"
                  onClick={() => {
                    window.location.hash = "library"
                    setSelected("")
                    setGalleryOpen(true)
                  }}
                >
                  Volver a la galería
                </button>
              </header>
              {active.reference ? (
                <section className="wg-files">
                  <h3>Referencia pendiente de producción</h3>
                  <p>{active.description}</p>
                  {active.referenceUrl && (
                    <a
                      className="ml-button"
                      href={active.referenceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir referencia original
                    </a>
                  )}
                </section>
              ) : active.kind === "study" ? (
                <MotionLab
                  key={`editor:${active.id}`}
                  embedded
                  initialId={active.template as StudyId}
                  projectId={active.id}
                  projectTitle={active.title}
                  cloudProject={doc}
                />
              ) : active.kind === "finn" ? (
                <FinnWorkspace
                  key={`editor:${active.id}:${sectionHint}:${restoreEpoch}`}
                  embedded
                  initialProjectId={active.template}
                  initialView={viewHint}
                  initialSection={sectionHint}
                  onStoreChange={onFinnChanged}
                />
              ) : active.template === "discord" ? (
                <DiscordStudio embedded projectId={active.id} />
              ) : (
                <FigmaStudio embedded projectId={active.id} />
              )}
              <PreviewBoundary
                key={`guide:${active.id}`}
                label="La documentación"
              >
                <Suspense
                  fallback={
                    <span className="ml-footnote" role="status">
                      Cargando documentación…
                    </span>
                  }
                >
                  <StyleGuide
                    id={active.id}
                    title={active.title}
                    kind={active.kind}
                    template={active.template}
                    project={doc}
                    production={finn}
                  />
                </Suspense>
              </PreviewBoundary>
              <AudioWorkspace
                key={`audio:${active.id}`}
                id={active.id}
                channel={active.channel}
                duration={active.duration}
                soundDesign={studies.find((s) => s.id === active.template)?.sfx}
                musicPrompt={
                  active.template === "laboral-clothing"
                    ? studies.find((s) => s.id === "laboral-clothing")
                        ?.musicPrompt
                    : undefined
                }
                scenes={
                  active.kind === "finn"
                    ? finn.projects.find((p) => `finn:${p.id}` === active.id)
                        ?.scenes || defaultScenes
                    : [
                        {
                          id: "main",
                          start: 0,
                          end: active.duration,
                          voice:
                            studies.find((s) => s.id === active.template)
                              ?.narration || "",
                          visual: active.description,
                        },
                      ]
                }
                sources={sources
                  .filter((s) => s.mime === "video/mp4")
                  .map((s) => ({ ...s, url: publicAssetUrl(s.url) }))}
              />
              <ProjectFiles
                key={`files:${active.id}`}
                id={active.id}
                title={active.title}
                kind={active.kind}
                template={active.template}
                sources={sources}
                onLoaded={onLoaded}
              />
            </section>
          )}
          <footer className="wg-footer">
            <span>YT AUTOMATION / VIDEO WORKSPACE</span>
            <span>
              {session?.authenticated
                ? cloudMessage
                : "Tus archivos privados se recuperan al iniciar sesión."}
            </span>
          </footer>
        </main>
      </div>
    </div>
  )
}
