export type Scene = {
  id: number
  title: string
  start: number
  end: number
  voice: string
  visual: string
}
export const scenes: Scene[] = [
  {
    id: 1,
    title: "Una frase. Todo empieza.",
    start: 0,
    end: 3,
    voice: "Escribes una frase, y pasa esto.",
    visual:
      "Finn ante un teclado gigante. Escribe «¿Por qué el cielo es azul?». Enter y zoom dentro de la pantalla.",
  },
  {
    id: 2,
    title: "Tokens, no palabras.",
    start: 3,
    end: 10,
    voice:
      "Primero, tu frase se corta en trocitos llamados tokens: palabras, sílabas o incluso signos.",
    visual:
      "La frase se corta en bloques. Una palabra se divide en dos: token no equivale a palabra.",
  },
  {
    id: 3,
    title: "Un mapa de significado.",
    start: 10,
    end: 18,
    voice:
      "Cada trocito se convierte en números. Son como coordenadas: las palabras con significado parecido quedan cerca.",
    visual:
      "Bloques → números → puntos en un mapa 3D. Perro y gato cerca, coche lejos. Finn señala; cámara orbital.",
  },
  {
    id: 4,
    title: "Todo está conectado.",
    start: 18,
    end: 29,
    voice:
      "Después llega la atención. La IA mira todas las palabras a la vez y decide cuáles están relacionadas. Así capta el contexto.",
    visual:
      "Conexiones de grosor variable. Finn usa una lupa. Sobre el segundo 24, se revelan decenas de capas.",
  },
  {
    id: 5,
    title: "El secreto.",
    start: 29,
    end: 40,
    voice:
      "Y ahora, el secreto. No escribe la respuesta entera: solo calcula cuál es la siguiente pieza más probable. Elige una, la añade… y repite.",
    visual:
      "Barras de probabilidad, selección y pieza que vuela a la respuesta.",
  },
  {
    id: 6,
    title: "Una y otra vez.",
    start: 40,
    end: 48,
    voice:
      "Pieza a pieza, cientos de veces, en un centro de datos lleno de chips, hasta que aparece tu respuesta.",
    visual:
      "Smash cuts, respuesta pieza a pieza. Retroceso a un centro de datos.",
  },
  {
    id: 7,
    title: "Y vuelve a empezar…",
    start: 48,
    end: 57,
    voice:
      "Así que ya lo sabes: no piensa como tú, apuesta. Sígueme para ver qué más pasa por dentro. Y todo vuelve a empezar cada vez que…",
    visual:
      "Finn mira a cámara, gesto cómplice y CTA. Vuelta exacta a la composición inicial para el loop.",
  },
]
export const directions = [
  {
    id: "comic",
    name: "Cómic cinético",
    tag: "LA RECOMENDADA",
    color: "#c3ef67",
    description:
      "Tinta expresiva, papel cálido y cortes gráficos. Finn en su lenguaje más natural.",
    technique: "Rig vectorial · 2.5D",
    motion: "Smear frames, squash & stretch, cámara multiplano.",
  },
  {
    id: "pixel",
    name: "Pixel quest",
    tag: "RETRO DIGITAL",
    color: "#afa1ff",
    description:
      "Un laboratorio de 16 bits. Pixels nítidos, interfaces de juego y luz eléctrica.",
    technique: "Pixel art procedural",
    motion: "Poses a pasos, partículas, parallax y zooms enteros.",
  },
  {
    id: "clay",
    name: "Soft dimension",
    tag: "LOOK 3D",
    color: "#ffbd98",
    description:
      "Volúmenes suaves, luz de estudio y piezas que parecen juguetes.",
    technique: "Boceto vectorial de look 3D",
    motion:
      "Rig 3D por construir tras aprobación. Estos frames no son renders 3D.",
  },
  {
    id: "hybrid",
    name: "Digital playground",
    tag: "2D × PROFUNDIDAD",
    color: "#78d9df",
    description:
      "Finn dibujado dentro de un mundo espacial. Gráficos luminosos y profundidad.",
    technique: "2D + proyección isométrica",
    motion: "Personaje vectorial, cámaras orbitales y conexiones vivas.",
  },
]
export const archivedPacks = [
  {
    id: "pop",
    name: "Pop",
    concept: "Una palabra por beat. Rebote elástico y acento en la clave.",
    font: "Manrope",
    grouping: "1 palabra",
    easing: "spring",
    position: "Inferior",
    effect: "Contorno",
  },
  {
    id: "karaoke",
    name: "Karaoke",
    concept: "Grupo corto con relleno progresivo al ritmo de la voz.",
    font: "Manrope",
    grouping: "2–3 palabras",
    easing: "linear",
    position: "Inferior",
    effect: "Sombra",
  },
  {
    id: "kinetic",
    name: "Kinetic",
    concept: "Claves grandes, rotación y estiramiento; el resto discreto.",
    font: "Manrope",
    grouping: "2–3 palabras",
    easing: "back",
    position: "Centro",
    effect: "Contorno",
  },
  {
    id: "terminal",
    name: "Terminal",
    concept: "Letra a letra con cursor. SFX de tecla pendiente de mezcla.",
    font: "monospace",
    grouping: "Línea",
    easing: "steps",
    position: "Inferior",
    effect: "Caja",
  },
  {
    id: "comic",
    name: "Cómic",
    concept: "Globo con cola, squash & stretch y composición editorial.",
    font: "Manrope",
    grouping: "2–3 palabras",
    easing: "spring",
    position: "Centro",
    effect: "Caja",
  },
  {
    id: "neon",
    name: "Neon glitch",
    concept: "Separación RGB, entrada entrecortada y scanlines.",
    font: "monospace",
    grouping: "Línea",
    easing: "steps",
    position: "Inferior",
    effect: "Glow",
  },
]
export const packs = archivedPacks.filter((pack) =>
  ["pop", "karaoke", "kinetic", "comic"].includes(pack.id),
)
export type Channel = {
  id: string
  name: string
  niche: string
  character: string
  language: string
  format: string
  sheet: string
  palette: string
  typography: string
  voice: string
  pronunciation: string
  rhythm: string
  transitions: string
  scriptTemplate: string
  cta: string
  metadata: string
  exportSettings: string
  synthetic: string
  lipSync: number
}
export type Project = {
  id: string
  channelId: string
  title: string
  scenes: Scene[]
  direction: string
  pack: string
  accent: string
  subtitleSize: number
  subtitleSpeed: number
  safe: boolean
  scriptApproved: boolean
  directionApproved: boolean
  variants: {
    name: string
    pack: string
    accent: string
    size: number
    speed: number
  }[]
  overrides?: Record<string, string>
  versions: {
    date: string
    scenes: Scene[]
    direction: string
    pack: string
    settings?: {
      title: string
      accent: string
      subtitleSize: number
      subtitleSpeed: number
      safe: boolean
      variants: Project["variants"]
      overrides?: Record<string, string>
    }
  }[]
}
export type StylePreset = {
  id: string
  channelId: string
  name: string
  direction: string
  pack: string
  accent: string
  subtitleSize: number
  subtitleSpeed: number
  settings: Record<string, string>
}
export type Store = {
  schema: 2
  channels: Channel[]
  projects: Project[]
  presets?: StylePreset[]
}
export const initialChannel: Channel = {
  id: "finn-lab",
  name: "Finn Lab",
  niche: "IA y tecnología, explicadas desde dentro",
  character: "Finn",
  language: "Castellano de España",
  format: "9:16",
  sheet:
    "Fuente: hoja de modelo de Finn the Human adjunta por el usuario.\nSilueta: cabeza grande con gorro blanco de dos puntas redondeadas, cuerpo compacto y extremidades delgadas. Altura aproximada: 3,2 cabezas.\nRostro: óvalo de piel visible, dos ojos negros pequeños y boca mínima, sin nariz marcada. Cabello oculto.\nVestuario: camiseta azul cian, pantalón corto azul oscuro, mochila verde bicolor, calcetines blancos y zapatos negros.\nLínea: contorno negro fino, redondeado, consistente. Colores planos, casi sin sombreado.\nExpresiones: neutral, sorpresa (boca abierta), duda (mano al mentón), entusiasmo y guiño.\nPoses: frontal, tres cuartos derecho, perfil derecho, espalda, saludo, señalar y pensar.\nProporciones y colores aproximados a partir de la imagen; ficha editable. Finn es un personaje de terceros; autorización de explotación no verificada.",
  palette: "#FFFFFF, #F7CDA5, #009DCE, #1269AF, #9DD66E, #4E9E35, #111111",
  typography:
    "Manrope para interfaz y subtítulos; lettering de cómic para énfasis.",
  voice:
    "Pendiente de elegir y aprobar una voz de catálogo ElevenLabs es-ES. Cálida, natural, con energía. Sin clonación.",
  pronunciation:
    "token: tóken\nChatGPT: chat ge pe té\ntransformer: transfórmer\nGPU: ge pe u",
  rhythm:
    "Cortes cada 2–4 s. Hook desde el primer frame. Giro cada 8–10 s. Voz como reloj maestro.",
  transitions:
    "Match cut, zoom por pantalla, smash cut y conexiones de movimiento.",
  scriptTemplate:
    "Hook 0–3 s → explicación → giro → secreto → repetición → CTA + loop. Objetivo 50–60 s; duración final según voz.",
  cta: "Sígueme para ver qué más pasa por dentro.",
  metadata:
    "Título: {tema} por dentro\nDescripción: Una explicación visual con Finn.\nHashtags: #InteligenciaArtificial #Tecnología #Aprende",
  exportSettings:
    "2160×3840 · 60 fps + 1080×1920 · 60 fps · MP4 H.264. Arquitectura preparada para 16:9. Voz -14 LUFS objetivo en mezcla; true peak ≤ -1 dBTP.",
  synthetic:
    "Informar voz sintética y recursos artificiales cuando lo requiera cada plataforma. Verificar derechos del personaje y recursos antes de monetizar.",
  lipSync: 0.65,
}
export const initialStore: Store = {
  schema: 2,
  channels: [initialChannel],
  projects: [
    {
      id: "ia-por-dentro",
      channelId: "finn-lab",
      title: "Qué pasa dentro de una IA",
      scenes,
      direction: "comic",
      pack: "pop",
      accent: "#c3ef67",
      subtitleSize: 42,
      subtitleSpeed: 1,
      safe: true,
      scriptApproved: false,
      directionApproved: false,
      variants: [],
      versions: [],
    },
  ],
}
export const storageKey = "yt-production-workspace-v1"
export function loadSelection(store: Store) {
  let previous: Partial<Record<"channelId" | "projectId", string>> = {}
  try {
    previous = JSON.parse(
      localStorage.getItem(`${storageKey}-selection`) || "{}",
    )
  } catch {}
  const channel =
    store.channels.find((c) => c.id === previous?.channelId) ||
    store.channels[0]
  const project =
    store.projects.find(
      (p) => p.id === previous?.projectId && p.channelId === channel.id,
    ) || store.projects.find((p) => p.channelId === channel.id)
  return { channelId: channel.id, projectId: project?.id ?? "" }
}
let recoveryError = ""
export function getRecoveryError() {
  return recoveryError
}
export function loadStore(): Store {
  try {
    const value = localStorage.getItem(storageKey)
    if (!value) return structuredClone(initialStore)
    const parsed = JSON.parse(value)
    const validated = validateStore(parsed)
    if (
      parsed.schema === 1 &&
      !localStorage.getItem(`${storageKey}-before-v2`)
    ) {
      localStorage.setItem(`${storageKey}-before-v2`, value)
    }
    return validated
  } catch {
    recoveryError =
      "No se pudo leer la copia guardada. El original se conserva sin sobrescribir. Estás viendo una copia de recuperación; exporta el original o importa una copia válida."
    return structuredClone(initialStore)
  }
}
export function saveStore(store: Store, explicitImport = false) {
  if (recoveryError && !explicitImport) throw new Error(recoveryError)
  if (explicitImport) {
    const previous = localStorage.getItem(storageKey)
    if (previous)
      localStorage.setItem(
        `${storageKey}-before-import-${Date.now()}`,
        previous,
      )
  }
  localStorage.setItem(storageKey, JSON.stringify(store))
  recoveryError = ""
}
export function validateStore(value: unknown): Store {
  const source = value as { schema?: number }
  if (source?.schema !== 1 && source?.schema !== 2)
    throw new Error("Versión de proyecto no compatible")
  const store = structuredClone(value) as Store
  store.schema = 2
  // Only active fields migrate; historical versions and the original backup stay intact.
  if (Array.isArray(store.channels))
    for (const channel of store.channels) {
      delete (channel as unknown as Record<string, unknown>).music
      delete (channel as unknown as Record<string, unknown>).sfx
    }
  if (Array.isArray(store.projects))
    for (const project of store.projects) {
      if (["terminal", "neon"].includes(project.pack)) project.pack = "pop"
      if (Array.isArray(project.variants))
        project.variants = project.variants.filter((v) =>
          packs.some((p) => p.id === v.pack),
        )
      if (Array.isArray(project.scenes))
        for (const scene of project.scenes)
          delete (scene as unknown as Record<string, unknown>).sfx
      if (project.overrides) {
        delete project.overrides.music
        delete project.overrides.sfx
      }
    }
  if (Array.isArray(store.presets))
    for (const preset of store.presets) {
      if (["terminal", "neon"].includes(preset.pack)) preset.pack = "pop"
      if (preset.settings) {
        delete preset.settings.music
        delete preset.settings.sfx
      }
    }
  if (
    store?.schema !== 2 ||
    !Array.isArray(store.channels) ||
    !store.channels.length ||
    !Array.isArray(store.projects)
  )
    throw new Error("Archivo de proyecto no compatible")
  for (const c of store.channels)
    for (const field of Object.keys(initialChannel)) {
      if (
        typeof (c as unknown as Record<string, unknown>)[field] !==
        typeof (initialChannel as unknown as Record<string, unknown>)[field]
      )
        throw new Error(`Campo de canal inválido: ${field}`)
    }
  for (const p of store.projects) {
    if (
      typeof p.id !== "string" ||
      typeof p.title !== "string" ||
      !store.channels.some((c) => c.id === p.channelId) ||
      !Array.isArray(p.scenes) ||
      !Array.isArray(p.variants) ||
      !Array.isArray(p.versions) ||
      !directions.some((d) => d.id === p.direction) ||
      !packs.some((pack) => pack.id === p.pack)
    )
      throw new Error("Vídeo no compatible")
    for (const s of p.scenes)
      if (
        typeof s.voice !== "string" ||
        typeof s.visual !== "string" ||
        !Number.isFinite(s.start) ||
        !Number.isFinite(s.end) ||
        s.end <= s.start
      )
        throw new Error("Escena inválida")
    if (
      !/^#[0-9a-f]{6}$/i.test(p.accent) ||
      !Number.isFinite(p.subtitleSize) ||
      p.subtitleSize < 25 ||
      p.subtitleSize > 60 ||
      !Number.isFinite(p.subtitleSpeed) ||
      p.subtitleSpeed < 0.5 ||
      p.subtitleSpeed > 2 ||
      typeof p.scriptApproved !== "boolean" ||
      typeof p.directionApproved !== "boolean"
    )
      throw new Error("Ajustes de vídeo inválidos")
  }
  if (
    store.presets !== undefined &&
    (!Array.isArray(store.presets) ||
      store.presets.some(
        (p) =>
          !p ||
          typeof p.name !== "string" ||
          typeof p.id !== "string" ||
          !store.channels.some((c) => c.id === p.channelId) ||
          !directions.some((d) => d.id === p.direction) ||
          !packs.some((pack) => pack.id === p.pack),
      ))
  )
    throw new Error("Presets no compatibles")
  return store
}
