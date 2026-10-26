export type LibraryVideo = {
  id: string
  title: string
  description: string
  status: "ready" | "reference"
  duration: number
  format: string
  tags: string[]
  compositionId?: string
  exportUrl?: string
  referenceUrl?: string
}

// Add future projects here. Keep an existing video's id stable so its link stays valid.
export const videos: LibraryVideo[] = [
  {
    id: "discord",
    title: "Discord — Conexiones que se sienten",
    description:
      "Tipografía cinética, millones de conexiones y un lugar para los tuyos.",
    status: "ready",
    duration: 10,
    format: "9:16",
    tags: ["Motion design", "Discord", "Kinetic type"],
    compositionId: "DiscordMotion",
    exportUrl: "/exports/discord-motion.mp4",
  },
  {
    id: "youtube-reference-002",
    title: "Figma — No soy solo una herramienta",
    description:
      "Un manifiesto visual de 36 segundos: tipografía cinética, ilustraciones originales y motion editorial inspirado en las referencias aportadas.",
    status: "ready",
    duration: 36,
    format: "9:16",
    tags: ["Motion editorial", "Figma", "React Bits"],
    compositionId: "FigmaManifesto",
    exportUrl: "/exports/figma-manifesto.mp4",
    referenceUrl: "https://www.youtube.com/watch?v=VS9VzNaX_hg",
  },
]
