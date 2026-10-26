import { useEffect, useRef, useState } from "react"
import DirectionFrame, { Finn } from "./Frames"
import FinnPlayer from "./FinnPlayer"
import CaptionSamples from "./CaptionSamples"
import FinnSequence from "./FinnSequence"
import { publicAssetUrl } from "../media/files"
import {
  directions,
  initialChannel,
  initialStore,
  loadStore,
  loadSelection,
  saveStore,
  getRecoveryError,
  packs,
  storageKey,
  validateStore,
  type Channel,
  type Project,
  type Store,
} from "./data"
import "./workspace.css"
import "./workspace-theme.css"
import "@fontsource-variable/manrope"

interface IconProps {
  name: string
  size?: number
}

function Icon({ name, size = 19 }: IconProps) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    video: "M3 5h13v14H3zM16 10l5-3v10l-5-3",
    book: "M12 5Q6 1 2 4v16q5-3 10 0 5-3 10 0V4q-4-3-10 1v15",
    folder: "M3 7V4h6l3 3h9v13H3Z",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    down: "m6 9 6 6 6-6",
    download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
    plus: "M12 4v16M4 12h16",
    spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
    layers: "m12 2 10 6-10 6L2 8Zm-10 10 10 6 10-6M2 16l10 6 10-6",
    clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
    back: "M20 12H4m6-6-6 6 6 6",
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  )
}
function download(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const views = [
  ["styles", "Exploración visual"],
  ["script", "Guion y escenas"],
  ["storyboard", "Storyboard"],
  ["timeline", "Timeline"],
  ["subtitles", "Subtítulos"],
  ["mobile", "Vista móvil"],
  ["animatic", "Animatic"],
  ["export", "Exportaciones"],
]
const fields: [keyof Channel, string, boolean][] = [
  ["name", "Nombre del canal", false],
  ["niche", "Nicho", false],
  ["character", "Personaje", false],
  ["language", "Idioma", false],
  ["format", "Formato", false],
  ["sheet", "Ficha extraída de la referencia", true],
  ["palette", "Paleta · valores aproximados de la imagen", false],
  ["typography", "Tipografías", true],
  ["voice", "Voz fija y ajustes", true],
  ["pronunciation", "Diccionario de pronunciación", true],
  ["rhythm", "Ritmo y cámara", true],
  ["transitions", "Transiciones", true],
  ["scriptTemplate", "Estructura de guion", true],
  ["cta", "CTA estándar", false],
  ["metadata", "Plantilla de metadatos", true],
  ["exportSettings", "Exportación y mezcla", true],
  ["synthetic", "Etiquetado y derechos", true],
]

interface WorkspaceProps {
  embedded?: boolean
  initialProjectId?: string
  initialView?: string
  onStoreChange?: (store: Store, projectId?: string) => void
  initialSection?: string
}
export default function Workspace({
  embedded = false,
  initialProjectId,
  initialView = "animatic",
  initialSection = "videos",
  onStoreChange,
}: WorkspaceProps) {
  const [store, setStore] = useState<Store>(loadStore)
  const firstStore = useRef(store)
  const [selection] = useState(() => loadSelection(store))
  const [channelId, setChannelId] = useState(
    store.projects.find((project) => project.id === initialProjectId)
      ?.channelId || selection.channelId,
  )
  const [projectId, setProjectId] = useState(
    initialProjectId || selection.projectId,
  )
  const [section, setSection] = useState(initialSection)
  const [view, setView] = useState(initialView)
  const [shot, setShot] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [notice, setNotice] = useState("")
  const [saved, setSaved] = useState(true)
  const [variantName, setVariantName] = useState("")
  const [showVersions, setShowVersions] = useState(false)
  const [presetTarget, setPresetTarget] = useState(channelId)
  const importInput = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLDivElement>(null)
  const channel =
    store.channels.find((c) => c.id === channelId) || store.channels[0]
  const project =
    store.projects.find(
      (p) => p.id === projectId && p.channelId === channel.id,
    ) || store.projects.find((p) => p.channelId === channel.id)
  const direction =
    directions.find((d) => d.id === project?.direction) || directions[0]
  const wordCount =
    project?.scenes
      .map((s) => s.voice)
      .join(" ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length ?? 0
  useEffect(() => {
    try {
      saveStore(store)
      setSaved(true)
      if (store !== firstStore.current) onStoreChange?.(store, project?.id)
    } catch {
      setSaved(false)
    }
  }, [store])
  useEffect(() => {
    try {
      localStorage.setItem(
        `${storageKey}-selection`,
        JSON.stringify({ channelId: channel.id, projectId: project?.id ?? "" }),
      )
    } catch {
      // Preference persistence must not replace or invalidate the project document.
    }
  }, [channel.id, project?.id])
  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(""), 6000)
    return () => clearTimeout(timeout)
  }, [notice])
  useEffect(() => {
    document.title = `${channel.name} · YT Automation`
    if (!expanded) return
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null)
    }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [expanded, channel.name])
  function updateChannel(patch: Partial<Channel>) {
    setStore((s) => ({
      ...s,
      channels: s.channels.map((c) =>
        c.id === channel.id ? { ...c, ...patch } : c,
      ),
    }))
  }
  function updateProject(patch: Partial<Project>) {
    if (!project) return
    setStore((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === project.id ? { ...p, ...patch } : p,
      ),
    }))
  }
  function snapshot() {
    if (!project) return
    updateProject({
      versions: [
        ...project.versions,
        {
          date: new Date().toISOString(),
          scenes: structuredClone(project.scenes),
          direction: project.direction,
          pack: project.pack,
          settings: {
            title: project.title,
            accent: project.accent,
            subtitleSize: project.subtitleSize,
            subtitleSpeed: project.subtitleSpeed,
            safe: project.safe,
            variants: structuredClone(project.variants),
            overrides: project.overrides,
          },
        },
      ],
    })
    setNotice("Versión guardada. Puedes recuperarla desde el historial.")
  }
  function newChannel() {
    const name = window.prompt("Nombre del nuevo canal")
    if (!name?.trim()) return
    const id = crypto.randomUUID()
    setStore((s) => ({
      ...s,
      channels: [...s.channels, { ...initialChannel, id, name: name.trim() }],
    }))
    setChannelId(id)
    setSection("bible")
  }
  function newProject() {
    const title = window.prompt("Título del vídeo")
    if (!title?.trim()) return
    const id = crypto.randomUUID()
    const fresh = structuredClone(initialStore.projects[0])
    setStore((s) => ({
      ...s,
      projects: [
        ...s.projects,
        {
          ...fresh,
          id,
          title: title.trim(),
          channelId: channel.id,
          scenes: [
            {
              id: 1,
              title: "Nueva escena",
              start: 0,
              end: 4,
              voice: "",
              visual: "",
            },
          ],
        },
      ],
    }))
    setProjectId(id)
    setSection("videos")
    setView("script")
  }
  async function importFile(file?: File) {
    if (!file) return
    try {
      if (file.size > 5_000_000) throw new Error("El proyecto supera 5 MB")
      const incoming = validateStore(JSON.parse(await file.text()))
      if (
        !window.confirm(
          "¿Importar esta copia? Sustituirá los datos actuales de este navegador. Exporta antes una copia si quieres conservarlos.",
        )
      )
        return
      saveStore(incoming, true)
      setStore(incoming)
      setChannelId(incoming.channels[0].id)
      setProjectId(incoming.projects[0]?.id ?? "")
      setNotice("Proyecto importado.")
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "No se pudo importar el proyecto",
      )
    }
    if (importInput.current) importInput.current.value = ""
  }
  function exportFrame(style: string) {
    const el = gallery.current?.querySelector(
      `[data-direction="${style}"] svg.p-frame`,
    )
    if (!el) return
    const clone = el.cloneNode(true) as SVGElement
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    clone.setAttribute("width", "1080")
    clone.setAttribute("height", "1920")
    download(
      `${style}-frame-${shot + 1}.svg`,
      new XMLSerializer().serializeToString(clone),
      "image/svg+xml",
    )
  }
  return (
    <div className="p-workspace">
      {!embedded && (
        <aside className="p-sidebar">
          <a className="p-brand" href="#workspace">
            <span>
              <Icon name="layers" size={23} />
            </span>
            <strong>
              yt<span>automation</span>
              <small>YOUR NEXT STORY STARTS HERE</small>
            </strong>
          </a>
          <a
            className="p-secondary p-studio-entry"
            href="#motion-lab"
            aria-label="Abrir los dos nuevos estudios de animación"
          >
            Estudio visual · 02 vídeos <Icon name="arrow" size={15} />
          </a>
          <div className="p-workspace-label">
            WORKSPACE <span>PERSONAL</span>
          </div>
          <button
            className="p-channel-switch"
            onClick={() => setSection("channels")}
          >
            <span className="p-channel-avatar">
              F<span>LAB</span>
            </span>
            <span>
              {channel.name}
              <small>Canal de divulgación</small>
            </span>
            <Icon name="down" size={14} />
          </button>
          <p className="p-nav-label">TU ESTUDIO</p>
          <nav>
            {[
              ["channels", "grid", "Canales"],
              ["videos", "video", "Vídeos"],
              ["bible", "book", "Biblia del canal"],
              ["references", "folder", "Referencias"],
            ].map(([id, icon, title]) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={section === id ? "active" : ""}
              >
                <Icon name={icon} />
                <span>{title}</span>
                {id === "videos" && (
                  <small>
                    {store.projects
                      .filter((p) => p.channelId === channel.id)
                      .length.toString()
                      .padStart(2, "0")}
                  </small>
                )}
              </button>
            ))}
          </nav>
          <div className="p-sidebar-projects">
            <p className="p-nav-label">
              EN PRODUCCIÓN{" "}
              <button onClick={newProject} aria-label="Nuevo vídeo">
                <Icon name="plus" size={13} />
              </button>
            </p>
            {store.projects
              .filter((p) => p.channelId === channel.id)
              .map((p) => (
                <button
                  key={p.id}
                  className={p.id === project?.id ? "selected" : ""}
                  onClick={() => {
                    setProjectId(p.id)
                    setSection("videos")
                    setView("animatic")
                  }}
                >
                  <i />
                  {p.title}
                </button>
              ))}
          </div>
          <div className="p-credit-card">
            <Icon name="spark" size={24} />
            <strong>
              Primero la idea.
              <br />
              Después, el render.
            </strong>
            <p>
              Aprueba cada etapa.
              <br />
              Tú decides cuándo producir.
            </p>
            <span>0 CRÉDITOS TTS CONSUMIDOS</span>
          </div>
          <a href="#video/discord" className="p-legacy">
            <Icon name="video" size={15} /> Vídeo Discord <span>↗</span>
          </a>
          <a href="#video/youtube-reference-002" className="p-legacy">
            <Icon name="video" size={15} /> Vídeo Figma <span>↗</span>
          </a>
          <a href="#library" className="p-legacy">
            <Icon name="back" size={15} /> Biblioteca anterior <span>↗</span>
          </a>
          <div className="p-profile">
            <span>Y</span>
            <div>
              Tu espacio creativo<small>YT Automation Workspace</small>
            </div>
            <Icon name="settings" size={16} />
          </div>
        </aside>
      )}
      <div className="p-content">
        {embedded && (
          <nav
            className="p-inline-tools"
            aria-label="Herramientas del vídeo y canal"
          >
            {[
              ["videos", "Vídeo"],
              ["channels", "Canales"],
              ["bible", "Biblia del canal"],
              ["references", "Referencias"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={section === id ? "active" : ""}
                onClick={() => setSection(id)}
              >
                {label}
              </button>
            ))}
            <button onClick={newProject}>Nuevo vídeo en este canal</button>
            <button onClick={() => importInput.current?.click()}>
              Importar copia
            </button>
          </nav>
        )}
        <header className="p-topbar">
          <div>
            Canales <span>/</span> {channel.name} <span>/</span>{" "}
            <b>
              {section === "bible"
                ? "Biblia del canal"
                : section === "references"
                  ? "Referencias"
                  : section === "channels"
                    ? "Todos los canales"
                    : "Vídeos"}
            </b>
          </div>
          <div className={`p-save ${saved ? "" : "error"}`}>
            <i />
            {saved
              ? "Guardado en este navegador"
              : "Sin guardar · exporta una copia"}
            <button
              onClick={() =>
                download(
                  "yt-automation-workspace.json",
                  JSON.stringify(store, null, 2),
                )
              }
              aria-label="Exportar copia de seguridad"
            >
              <Icon name="download" size={16} />
            </button>
          </div>
        </header>
        <main className="p-main">
          {getRecoveryError() && (
            <div className="p-warning" role="alert">
              {getRecoveryError()}{" "}
              <button
                className="p-secondary"
                onClick={() =>
                  download(
                    "workspace-original-recuperacion.json",
                    localStorage.getItem(storageKey) || "",
                  )
                }
              >
                Descargar original
              </button>
              <button
                className="p-secondary"
                onClick={() => importInput.current?.click()}
              >
                Importar copia
              </button>
            </div>
          )}
          <div className="p-notice p-video-location">
            <Icon name="video" />
            <div>
              <strong>Finn, Discord y Figma. Todos a mano.</strong>
              <p>
                Finn ya tiene reproducción sin voz. Los dos MP4 anteriores están
                en tu biblioteca. ElevenLabs, aplazado.
              </p>
            </div>
            <a className="p-secondary" href="#library">
              Ver Discord y Figma
            </a>
          </div>
          {section === "channels" && (
            <>
              <div className="p-heading">
                <div>
                  <p className="p-eyebrow">UN UNIVERSO PARA CADA HISTORIA</p>
                  <h1>Tus canales.</h1>
                  <p>Personajes, estilos y referencias. Todo en su sitio.</p>
                </div>
                <button className="p-primary" onClick={newChannel}>
                  <Icon name="plus" size={16} /> Nuevo canal
                </button>
              </div>
              <div className="p-channel-grid">
                {store.channels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setChannelId(c.id)
                      setSection("videos")
                    }}
                  >
                    <div className="p-channel-cover">
                      <svg viewBox="0 0 270 210">
                        <Finn x={110} y={15} scale={0.8} pose="wave" />
                      </svg>
                      <span>
                        {c.language} / {c.format}
                      </span>
                    </div>
                    <h2>{c.name}</h2>
                    <p>{c.niche}</p>
                    <span>
                      {
                        store.projects.filter((p) => p.channelId === c.id)
                          .length
                      }{" "}
                      vídeos <Icon name="arrow" size={18} />
                    </span>
                  </button>
                ))}
              </div>
              <div className="p-notice">
                <Icon name="folder" />
                <div>
                  <strong>Tu configuración no depende de este chat.</strong>
                  <p>
                    Se guarda en este navegador. Exporta e importa copias JSON
                    para trasladarla; la sincronización entre dispositivos
                    todavía no está conectada.
                  </p>
                </div>
                <button onClick={() => importInput.current?.click()}>
                  Importar copia
                </button>
              </div>
            </>
          )}
          {section === "bible" && (
            <>
              <div className="p-heading">
                <div>
                  <p className="p-eyebrow">LA FUENTE DE VERDAD</p>
                  <h1>La biblia de {channel.name}.</h1>
                  <p>
                    Una vez definido. Siempre consistente. Todos los campos son
                    editables.
                  </p>
                </div>
                <button
                  className="p-secondary"
                  onClick={() =>
                    download(
                      `${channel.name}-biblia.json`,
                      JSON.stringify(channel, null, 2),
                    )
                  }
                >
                  <Icon name="download" size={16} /> Exportar biblia
                </button>
              </div>
              <div className="p-bible-intro">
                <svg viewBox="0 0 140 220">
                  <Finn x={24} y={10} scale={0.9} pose="wave" />
                </svg>
                <div>
                  <span className="p-chip">PERSONAJE FIJO</span>
                  <h2>Finn, en cada historia.</h2>
                  <p>
                    Ficha extraída de tu hoja de modelo, no de un archivo
                    ejecutable. Proporciones y hex aproximados para tu revisión.
                    La referencia sigue siendo la fuente de verdad.
                  </p>
                  <div className="p-swatches">
                    {[
                      "#fff",
                      "#f7cda5",
                      "#009dce",
                      "#1269af",
                      "#9dd66e",
                      "#4e9e35",
                    ].map((c) => (
                      <span key={c} style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-bible-form">
                {fields.map(([key, label, multiline]) => (
                  <label key={key} className={multiline ? "wide" : ""}>
                    <span>{label}</span>
                    {multiline ? (
                      <textarea
                        rows={key === "sheet" ? 10 : 3}
                        value={String(channel[key])}
                        onChange={(e) =>
                          updateChannel({ [key]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        value={String(channel[key])}
                        onChange={(e) =>
                          updateChannel({ [key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
                <label>
                  <span>
                    Sensibilidad de boca · {channel.lipSync.toFixed(2)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".05"
                    value={channel.lipSync}
                    onChange={(e) =>
                      updateChannel({ lipSync: Number(e.target.value) })
                    }
                  />
                  <small>
                    Parámetro guardado; el movimiento real requiere la voz
                    generada.
                  </small>
                </label>
              </div>
            </>
          )}
          {section === "references" && (
            <>
              <div className="p-heading">
                <div>
                  <p className="p-eyebrow">CONTEXTO QUE PERMANECE</p>
                  <h1>Una biblioteca de referencias.</h1>
                  <p>
                    Canal → vídeo. La ficha del personaje permanece aunque la
                    imagen original deje de estar disponible.
                  </p>
                </div>
              </div>
              <div className="p-reference-tree">
                <Icon name="folder" />
                <h2>{channel.name}</h2>
                <div>
                  <Icon name="book" />
                  <span>
                    Personaje / Finn — ficha de modelo
                    <strong>Texto extraído y editable en la biblia</strong>
                  </span>
                  <button onClick={() => setSection("bible")}>
                    Abrir ficha ↗
                  </button>
                </div>
                <div>
                  <Icon name="folder" />
                  <span>
                    Vídeos / {project?.title || "Sin vídeos"}
                    <strong>
                      Guion original + exploración de cuatro estilos
                    </strong>
                  </span>
                  <button
                    onClick={() => {
                      setSection("videos")
                      setView("styles")
                    }}
                  >
                    Ver frames ↗
                  </button>
                </div>
                <p>
                  La hoja de modelo original está archivada junto al proyecto.
                  La subida de nuevas referencias no está implementada.
                </p>
                <a
                  className="p-secondary"
                  href={publicAssetUrl("/references/finn-model-sheet.png")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir hoja original de Finn
                </a>
              </div>
            </>
          )}
          {section === "videos" && !project && (
            <div className="p-empty">
              <Icon name="video" size={40} />
              <h1>Tu primera historia empieza aquí.</h1>
              <button className="p-primary" onClick={newProject}>
                Crear vídeo
              </button>
            </div>
          )}
          {section === "videos" && project && (
            <>
              <div className="p-heading">
                <div>
                  <p className="p-eyebrow">
                    FINN LAB <span>/</span> VIDEO{" "}
                    {String(store.projects.indexOf(project) + 1).padStart(
                      3,
                      "0",
                    )}
                  </p>
                  <h1>Tu historia, en movimiento.</h1>
                  <p>
                    Reproduce las siete escenas, compara los cuatro packs y
                    conserva tus cambios.
                  </p>
                </div>
                <div className="p-heading-actions">
                  <button
                    className="p-secondary"
                    onClick={() => {
                      setShowVersions((v) => !v)
                    }}
                  >
                    <Icon name="clock" size={16} /> Versiones{" "}
                    <small>{project.versions.length}</small>
                  </button>
                  <button className="p-secondary" onClick={snapshot}>
                    Guardar versión
                  </button>
                </div>
              </div>
              <div className="p-project-bar">
                <span className="p-project-icon">
                  <Icon name="video" size={21} />
                </span>
                <div>
                  <input
                    aria-label="Título del vídeo"
                    value={project.title}
                    onChange={(e) => updateProject({ title: e.target.value })}
                  />
                  <span>
                    VIDEO{" "}
                    {String(store.projects.indexOf(project) + 1).padStart(
                      3,
                      "0",
                    )}{" "}
                    <i /> {channel.character} <i /> {channel.language}
                  </span>
                </div>
                <span className="p-project-duration">
                  ~57 s <small>9:16 · 60 FPS</small>
                </span>
                <span className="p-status">
                  <i /> ANIMATIC SIN VOZ
                </span>
              </div>
              <div className="p-stage-bar">
                {["Guion", "Dirección visual", "Animatic", "Render final"].map(
                  (stage, i) => (
                    <div
                      key={stage}
                      className={
                        (i === 0 && project.scriptApproved) ||
                        (i === 1 && project.directionApproved)
                          ? "done"
                          : i === 1
                            ? "current"
                            : ""
                      }
                    >
                      <span>
                        {(i === 0 && project.scriptApproved) ||
                        (i === 1 && project.directionApproved) ? (
                          <Icon name="check" size={12} />
                        ) : (
                          `0${i + 1}`
                        )}
                      </span>
                      {stage}
                      {i < 3 && <b />}
                    </div>
                  ),
                )}
                <small>
                  <Icon name="settings" size={13} /> Aprobación en cada etapa
                </small>
              </div>
              <div
                className="p-view-tabs"
                role="tablist"
                aria-label="Vistas del vídeo"
              >
                {views.map(([id, title]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={view === id}
                    className={view === id ? "active" : ""}
                    onClick={() => setView(id)}
                  >
                    {title}
                    {id === "styles" && <span>4</span>}
                  </button>
                ))}
              </div>
              {showVersions && (
                <section className="p-versions">
                  <h3>Historial de versiones</h3>
                  {!project.versions.length && (
                    <p>
                      Guarda una versión antes de modificar el guion o el
                      estilo.
                    </p>
                  )}
                  {project.versions.map((version, i) => (
                    <div key={i}>
                      <span>
                        V{String(i + 1).padStart(2, "0")} ·{" "}
                        {new Date(version.date).toLocaleString("es-ES")}
                      </span>
                      <button
                        onClick={() => {
                          updateProject({
                            ...version.settings,
                            scenes: structuredClone(version.scenes),
                            direction: version.direction,
                            pack: packs.some((p) => p.id === version.pack)
                              ? version.pack
                              : "pop",
                            scriptApproved: false,
                            directionApproved: false,
                          })
                          setNotice(
                            "Versión recuperada. Revisa las aprobaciones.",
                          )
                        }}
                      >
                        Restaurar
                      </button>
                    </div>
                  ))}
                </section>
              )}
              {view === "styles" && (
                <>
                  <div className="p-section-head">
                    <div>
                      <span className="p-eyebrow">EXPLORACIÓN VISUAL / 01</span>
                      <h2>Misma historia. Otra forma de contarla.</h2>
                      <p>
                        Cuatro direcciones, tres momentos clave. Sin generar
                        vídeo ni consumir créditos TTS.
                      </p>
                    </div>
                    <div
                      className="p-shot-switch"
                      aria-label="Momento de la historia"
                    >
                      {["01 · Hook", "02 · Tokens", "03 · Atención"].map(
                        (label, i) => (
                          <button
                            key={i}
                            className={shot === i ? "active" : ""}
                            onClick={() => setShot(i)}
                          >
                            {label}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="p-directions" ref={gallery}>
                    {directions
                      .filter((d) =>
                        `${d.name} ${d.description}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((d, i) => (
                        <article
                          className={`p-direction-card ${
                            project.direction === d.id ? "selected" : ""
                          }`}
                          key={d.id}
                          data-direction={d.id}
                        >
                          <div className="p-card-top">
                            <span>ESTILO 0{directions.indexOf(d) + 1}</span>
                            <button
                              className="p-zoom"
                              onClick={() => setExpanded(d.id)}
                              aria-label={`Ampliar ${d.name}`}
                            >
                              ↗
                            </button>
                          </div>
                          <button
                            className="p-frame-button"
                            onClick={() => setExpanded(d.id)}
                            aria-label={`Ver secuencia de ${d.name}`}
                          >
                            <DirectionFrame styleId={d.id} shot={shot} />
                          </button>
                          <div className="p-card-info">
                            <span className="p-direction-tag">{d.tag}</span>
                            <h3>{d.name}</h3>
                            <p>{d.description}</p>
                            <div className="p-card-tech">
                              <i style={{ background: d.color }} />
                              {d.technique}
                            </div>
                            <button
                              className={
                                project.direction === d.id ? "chosen" : ""
                              }
                              onClick={() =>
                                updateProject({
                                  direction: d.id,
                                  directionApproved: false,
                                })
                              }
                            >
                              {project.direction === d.id ? (
                                <>
                                  <Icon name="check" size={14} /> Estilo
                                  seleccionado
                                </>
                              ) : (
                                <>
                                  Explorar este estilo{" "}
                                  <Icon name="arrow" size={14} />
                                </>
                              )}
                            </button>
                          </div>
                          <div className="p-card-bottom">
                            <span>3 FRAMES CONCEPTUALES</span>
                            <button
                              onClick={() => exportFrame(d.id)}
                              aria-label={`Descargar frame ${d.name}`}
                            >
                              <Icon name="download" size={13} />
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                  <div className="p-explore-footer">
                    <span>
                      <Icon name="layers" size={15} /> Cambia de momento para
                      comparar los mismos encuadres.
                    </span>
                    <label>
                      <Icon name="grid" size={14} />
                      <input
                        aria-label="Filtrar estilos"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar un estilo..."
                      />
                    </label>
                  </div>
                  <div className="p-director-note">
                    <span>
                      <Icon name="spark" size={21} />
                    </span>
                    <div>
                      <strong>Mi recomendación: cómic cinético.</strong>
                      <p>
                        Mantiene la personalidad de Finn y deja espacio para
                        motion con carácter. El híbrido es la alternativa si
                        buscas más profundidad.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        updateProject({
                          direction: "comic",
                          directionApproved: false,
                        })
                        setExpanded("comic")
                      }}
                    >
                      Ver propuesta <Icon name="arrow" size={15} />
                    </button>
                  </div>
                  <div className="p-presets">
                    <div>
                      <strong>Un estilo que puedes volver a usar.</strong>
                      <p>
                        Guarda paleta, tipografía, ritmo, transiciones y pack de
                        subtítulos. Sin generar assets.
                      </p>
                    </div>
                    <select
                      aria-label="Canal de destino del preset"
                      value={presetTarget}
                      onChange={(e) => setPresetTarget(e.target.value)}
                    >
                      {store.channels.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="p-secondary"
                      onClick={() => {
                        const name = window.prompt(
                          "Nombre del estilo reutilizable",
                          direction.name,
                        )
                        if (!name?.trim()) return
                        const settings = Object.fromEntries(
                          [
                            "palette",
                            "typography",
                            "rhythm",
                            "transitions",
                          ].map((key) => [
                            key,
                            project.overrides?.[key] ||
                              String(channel[(key as keyof Channel)]),
                          ]),
                        )
                        setStore((s) => ({
                          ...s,
                          presets: [
                            ...(s.presets || []),
                            {
                              id: crypto.randomUUID(),
                              channelId: presetTarget,
                              name: name.trim(),
                              direction: project.direction,
                              pack: project.pack,
                              accent: project.accent,
                              subtitleSize: project.subtitleSize,
                              subtitleSpeed: project.subtitleSpeed,
                              settings,
                            },
                          ],
                        }))
                        setNotice("Estilo guardado en el canal seleccionado.")
                      }}
                    >
                      Guardar como estilo
                    </button>
                    {(store.presets || [])
                      .filter((p) => p.channelId === channel.id)
                      .map((p) => (
                        <button
                          className="p-secondary"
                          key={p.id}
                          onClick={() => {
                            updateProject({
                              direction: p.direction,
                              pack: p.pack,
                              accent: p.accent,
                              subtitleSize: p.subtitleSize,
                              subtitleSpeed: p.subtitleSpeed,
                              overrides: p.settings,
                              directionApproved: false,
                            })
                            setNotice(
                              `Estilo ${p.name} aplicado como overrides del vídeo.`,
                            )
                          }}
                        >
                          Aplicar {p.name}
                          <Icon name="arrow" size={13} />
                        </button>
                      ))}
                  </div>
                  <div className="p-approval">
                    <div>
                      <span>EL SIGUIENTE PASO</span>
                      <h3>Elegimos la dirección. Después le damos vida.</h3>
                      <p>
                        Aprobar guarda tu elección. No genera voz ni lanza un
                        render.
                      </p>
                    </div>
                    <button
                      className="p-primary"
                      onClick={() => {
                        updateProject({ directionApproved: true })
                        setNotice(
                          `${direction.name} aprobado. Siguiente: revisar guion y presupuesto de voz.`,
                        )
                      }}
                    >
                      {project.directionApproved ? (
                        <Icon name="check" size={16} />
                      ) : (
                        <Icon name="arrow" size={16} />
                      )}
                      {project.directionApproved
                        ? "Dirección aprobada"
                        : `Aprobar ${direction.name}`}
                    </button>
                  </div>
                </>
              )}
              {view === "script" && (
                <>
                  <div className="p-section-head">
                    <div>
                      <h2>Tu guion. Sin reescribirlo.</h2>
                      <p>
                        {wordCount} palabras · tiempos objetivo ~57 s, todavía
                        no ajustados a una voz real.
                      </p>
                    </div>
                    <button
                      className="p-primary"
                      onClick={() => {
                        updateProject({ scriptApproved: true })
                        setNotice("Guion aprobado. No se ha generado audio.")
                      }}
                    >
                      {project.scriptApproved
                        ? "Guion aprobado"
                        : "Aprobar guion"}
                      <Icon name="check" size={15} />
                    </button>
                  </div>
                  {(wordCount < 125 || wordCount > 150) && (
                    <div className="p-warning">
                      El guion tiene {wordCount} palabras, fuera del objetivo de
                      125–150. Se conserva intacto. A 150 palabras/min rondaría{" "}
                      {Math.round((wordCount / 150) * 60)} s; la duración
                      definitiva depende de la voz.
                    </div>
                  )}
                  <div className="p-script-table">
                    <div className="p-table-header">
                      <span>ESCENA / TIEMPO</span>
                      <span>VOZ EN OFF</span>
                      <span>VISUALES</span>
                    </div>
                    {project.scenes.map((scene, index) => (
                      <div className="p-script-row" key={scene.id}>
                        <div>
                          <span>0{index + 1}</span>
                          <input
                            aria-label={`Título escena ${index + 1}`}
                            value={scene.title}
                            onChange={(e) =>
                              updateProject({
                                scenes: project.scenes.map((s, n) =>
                                  n === index
                                    ? { ...s, title: e.target.value }
                                    : s,
                                ),
                                scriptApproved: false,
                              })
                            }
                          />
                          <small>
                            {scene.start.toFixed(0)}–{scene.end.toFixed(0)} s ·
                            objetivo
                          </small>
                        </div>
                        <textarea
                          rows={5}
                          aria-label={`Voz escena ${index + 1}`}
                          value={scene.voice}
                          onChange={(e) =>
                            updateProject({
                              scenes: project.scenes.map((s, n) =>
                                n === index
                                  ? { ...s, voice: e.target.value }
                                  : s,
                              ),
                              scriptApproved: false,
                            })
                          }
                        />
                        <div>
                          <textarea
                            rows={4}
                            aria-label={`Visual escena ${index + 1}`}
                            value={scene.visual}
                            onChange={(e) =>
                              updateProject({
                                scenes: project.scenes.map((s, n) =>
                                  n === index
                                    ? { ...s, visual: e.target.value }
                                    : s,
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-actions">
                    <button
                      className="p-secondary"
                      onClick={() => {
                        const last = project.scenes.at(-1)
                        updateProject({
                          scenes: [
                            ...project.scenes,
                            {
                              id: Date.now(),
                              title: "Nueva escena",
                              start: last?.end || 0,
                              end: (last?.end || 0) + 4,
                              voice: "",
                              visual: "",
                            },
                          ],
                          scriptApproved: false,
                        })
                      }}
                    >
                      Añadir escena
                    </button>
                    <button
                      className="p-secondary"
                      onClick={() =>
                        download(
                          "video-1-guion.txt",
                          project.scenes.map((s) => s.voice).join("\n\n"),
                          "text/plain",
                        )
                      }
                    >
                      Descargar guion
                    </button>
                  </div>
                </>
              )}
              {view === "storyboard" && (
                <>
                  <div className="p-section-head">
                    <div>
                      <h2>El mapa de la historia.</h2>
                      <p>
                        Siete escenas del motor real. Las notas de revisión
                        quedan fuera del canvas.
                      </p>
                    </div>
                  </div>
                  <div className="p-storyboard">
                    {project.scenes.map((s, i) => (
                      <article key={s.id}>
                        <FinnSequence
                          time={(s.start + s.end) / 2}
                          scenes={project.scenes}
                          pack={project.pack}
                          accent={project.accent}
                          subtitleSize={project.subtitleSize}
                        />
                        <span>
                          ESCENA 0{i + 1} · {s.start}–{s.end}s
                        </span>
                        <h3>{s.title}</h3>
                        <p>{s.voice}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}
              {view === "timeline" && (
                <>
                  <div className="p-section-head">
                    <div>
                      <h2>Todo en su propia pista.</h2>
                      <p>
                        Timing provisional. La voz será el reloj maestro cuando
                        se genere y apruebe.
                      </p>
                    </div>
                  </div>
                  <div className="p-timeline">
                    <div className="p-ruler">
                      <span>00:00</span>
                      <span>00:15</span>
                      <span>00:30</span>
                      <span>00:45</span>
                      <span>00:57</span>
                    </div>
                    {["Voz", "Subtítulos", "Visuales"].map((track, i) => (
                      <div className="p-track" key={track}>
                        <strong>
                          {track}
                          <small>{i === 0 ? "SIN AUDIO" : "PLANIFICADO"}</small>
                        </strong>
                        <div>
                          {project.scenes.map((s) => (
                            <button
                              key={s.id}
                              style={{ flex: s.end - s.start }}
                              onClick={() => {
                                setView(i === 1 ? "subtitles" : "script")
                              }}
                              title={s.title}
                            >
                              {i === 2
                                ? s.title
                                : i === 1
                                  ? packs.find((p) => p.id === project.pack)
                                      ?.name
                                  : "Pendiente"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {view === "subtitles" && (
                <>
                  <div className="p-section-head">
                    <div>
                      <h2>Cuatro formas de decirlo.</h2>
                      <p>
                        Un reloj compartido y el mismo motor que el render. Sin
                        una voz generada, los tiempos siguen siendo estimados.
                      </p>
                    </div>
                    <span className="p-chip">CAPA INDEPENDIENTE</span>
                  </div>
                  <div className="p-subtitle-layout">
                    <CaptionSamples
                      project={project}
                      onSelect={(pack) => updateProject({ pack })}
                    />
                    <aside className="p-sub-editor">
                      <p className="p-eyebrow">TU VARIANTE</p>
                      <h3>{packs.find((p) => p.id === project.pack)?.name}</h3>
                      <label>
                        Color de énfasis
                        <input
                          type="color"
                          value={project.accent}
                          onChange={(e) =>
                            updateProject({ accent: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Tamaño · {project.subtitleSize}
                        <input
                          type="range"
                          min="25"
                          max="60"
                          value={project.subtitleSize}
                          onChange={(e) =>
                            updateProject({
                              subtitleSize: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Velocidad de previsualización · {project.subtitleSpeed}×
                        <input
                          type="range"
                          min=".5"
                          max="2"
                          step=".1"
                          value={project.subtitleSpeed}
                          onChange={(e) =>
                            updateProject({
                              subtitleSpeed: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Nombre de variante
                        <input
                          value={variantName}
                          onChange={(e) => setVariantName(e.target.value)}
                          placeholder="Mi variante"
                        />
                      </label>
                      <button
                        className="p-primary"
                        disabled={!variantName.trim()}
                        onClick={() => {
                          updateProject({
                            variants: [
                              ...project.variants,
                              {
                                name: variantName.trim(),
                                pack: project.pack,
                                accent: project.accent,
                                size: project.subtitleSize,
                                speed: project.subtitleSpeed,
                              },
                            ],
                          })
                          setVariantName("")
                          setNotice("Variante guardada sin regenerar visuales.")
                        }}
                      >
                        Guardar variante
                      </button>
                      {project.variants.map((v, i) => (
                        <button
                          className="p-variant"
                          key={i}
                          onClick={() =>
                            updateProject({
                              pack: v.pack,
                              accent: v.accent,
                              subtitleSize: v.size,
                              subtitleSpeed: v.speed,
                            })
                          }
                        >
                          <i style={{ background: v.accent }} />
                          {v.name}
                          <Icon name="arrow" size={13} />
                        </button>
                      ))}
                      <small>
                        Entrada, efecto y agrupación siguen el diseño de cada
                        pack. Edición avanzada y sincronía real pendientes del
                        audio.
                      </small>
                    </aside>
                  </div>
                </>
              )}
              {view === "mobile" && (
                <>
                  <div className="p-section-head">
                    <div>
                      <h2>Hecho para una pantalla pequeña.</h2>
                      <p>
                        Zonas seguras orientativas para TikTok, Reels y Shorts;
                        revisarlas antes de publicar.
                      </p>
                    </div>
                    <label className="p-toggle">
                      <input
                        type="checkbox"
                        checked={project.safe}
                        onChange={(e) =>
                          updateProject({ safe: e.target.checked })
                        }
                      />{" "}
                      Mostrar zonas seguras
                    </label>
                  </div>
                  <div className="p-mobile-preview">
                    <div className="p-finn-player">
                      <FinnSequence
                        time={[1.5, 5, 22][shot]}
                        scenes={project.scenes}
                        pack={project.pack}
                        accent={project.accent}
                        subtitleSize={project.subtitleSize}
                      />
                    </div>
                    <div className="p-mobile-notes">
                      <h3>Personaje y mensaje, primero.</h3>
                      <p>
                        Reserva margen superior e inferior para la interfaz y el
                        lateral derecho para acciones.
                      </p>
                      {["Hook", "Tokens", "Atención"].map((label, i) => (
                        <button
                          className="p-secondary"
                          key={label}
                          onClick={() => setShot(i)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {(view === "animatic" || view === "export") && (
                <FinnPlayer
                  key={project.id}
                  project={project}
                  exports={view === "export"}
                />
              )}
            </>
          )}
          <footer className="p-footer">
            <span>
              YT AUTOMATION <b>/</b> CREATE WITH INTENTION.
            </span>
            <span>Diseñado para crear. Preparado para lo que viene.</span>
          </footer>
        </main>
      </div>
      <input
        type="file"
        accept=".json,application/json"
        hidden
        ref={importInput}
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {notice && (
        <div className="p-toast" role="status">
          <Icon name="check" size={17} />
          {notice}
          <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {expanded && (
        <div className="p-modal-backdrop" onClick={() => setExpanded(null)}>
          <section
            className="p-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Secuencia de frames"
            tabIndex={-1}
            ref={(el) => el?.focus()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const nodes =
                  e.currentTarget.querySelectorAll<HTMLElement>("button")
                const i = Array.from(nodes).indexOf(
                  document.activeElement as HTMLElement,
                )
                e.preventDefault()
                nodes[
                  (i + (e.shiftKey ? nodes.length - 1 : 1)) % nodes.length
                ]?.focus()
              }
            }}
          >
            <header>
              <div>
                <p className="p-eyebrow">SECUENCIA CONCEPTUAL / 3 FRAMES</p>
                <h2>{directions.find((d) => d.id === expanded)?.name}</h2>
              </div>
              <button
                aria-label="Cerrar comparador"
                onClick={() => setExpanded(null)}
              >
                ×
              </button>
            </header>
            <div className="p-modal-frames">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <DirectionFrame styleId={expanded} shot={i} />
                  <span>
                    0{i + 1} / {["HOOK", "TOKENS", "ATENCIÓN"][i]}
                  </span>
                </div>
              ))}
            </div>
            <footer>
              <p>{directions.find((d) => d.id === expanded)?.motion}</p>
              <button
                className="p-primary"
                onClick={() => {
                  updateProject({
                    direction: expanded,
                    directionApproved: false,
                  })
                  setExpanded(null)
                }}
              >
                Seleccionar dirección <Icon name="arrow" size={15} />
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
