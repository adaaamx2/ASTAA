export interface LabWord {
  text: string
  start: number
  end: number
}
export interface Character {
  id: string
  name: string
  description: string
  voiceId: string
  imageId?: string
  imageUrl?: string
}
export interface LabAudio {
  id: string
  name: string
  script: string
  taggedScript?: string
  voiceId?: string
  characterId?: string
  duration: number
  words: LabWord[]
  timingSource: string
  origin: "generated" | "uploaded"
  take?: number
  jobId?: string
  url: string
  createdAt: string
  persistencePending?: boolean
  mimeType?: string
}
export interface LabScene {
  id: number
  start: number
  end: number
  text: string
  action: string
}
export interface LabProject {
  id: string
  title: string
  characterId: string
  audioId: string
  duration: number
  words: LabWord[]
  timingSource: string
  scenes: LabScene[]
  sfx: string
  music: string
  tracks: Partial<Record<"sfx" | "music", LabTrack>>
  revision: number
  createdAt: string
}
export interface LabTrack {
  id: string
  duration: number
}
export const tagGroups = {
  Emoción: [
    "weak",
    "angry",
    "bored",
    "menacing",
    "playful",
    "tired",
    "excited",
    "sad",
  ],
  Vocalización: [
    "clears throat",
    "coughing",
    "chuckling",
    "sighing",
    "sniffling",
    "yawning",
    "laughing",
    "sharp exhale",
    "scoffing",
    "humming",
    "panting",
    "gasping",
  ],
  Interpretación: ["whispering", "singing", "slowly", "softly"],
}
export function spokenText(text: string) {
  return text
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
export function autoTag(script: string, tone: string) {
  const tag = ({
    entusiasta: "excited",
    cercano: "playful",
    íntimo: "whispering",
    dramático: "sad",
    pausado: "slowly",
  } as Record<string, string>)[tone]
  return script
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(Boolean)
    .map((sentence) => {
      if (/\[[^\]]+\]/.test(sentence)) return sentence
      const emotion = /[¡!]/.test(sentence) ? "excited" : tag
      return emotion ? `[${emotion}] ${sentence}` : sentence
    })
    .join("\n\n")
}
export function timelineWords(audio: LabAudio): LabWord[] {
  if (audio.words.length) return audio.words
  const tokens = spokenText(audio.script).split(/\s+/).filter(Boolean)
  const total = tokens.reduce((sum, token) => sum + token.length, 0) || 1
  let time = 0
  return tokens.map((text, index) => {
    const start = time
    time =
      index === tokens.length - 1
        ? audio.duration
        : time + (audio.duration * text.length) / total
    return { text, start, end: time }
  })
}
export function prepareScenes(words: LabWord[]): LabScene[] {
  const groups: LabWord[][] = []
  let group: LabWord[] = []
  for (const word of words) {
    group.push(word)
    if ((/[.!?]$/.test(word.text) && group.length >= 4) || group.length >= 14) {
      groups.push(group)
      group = []
    }
  }
  if (group.length) groups.push(group)
  return groups.map((items, index) => ({
    id: index + 1,
    start: index === 0 ? 0 : items[0].start,
    end: items.at(-1)!.end,
    text: items.map((word) => word.text).join(" "),
    action: /[?¿]/.test(items.map((word) => word.text).join(" "))
      ? "Gesto de pregunta y pausa"
      : index === 0
        ? "Entrada del personaje y atención a cámara"
        : "Énfasis de cabeza y cambio de plano suave",
  }))
}
