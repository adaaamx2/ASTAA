export type AudioKind = "voice" | "sfx" | "music"
export type ValidatedAudio = {
  kind: AudioKind
  text: string
  duration: number | null
  voiceId: string | null
  settings: {
    stability: number
    similarity_boost: number
    style: number
    use_speaker_boost: boolean
    speed: number
  } | null
  revision: number
}
export type AlignedWord = {
  text: string
  start: number
  end: number
  sceneId: number
  source: string
}
export class AudioError extends Error {
  constructor(status: number, code: string, message: string)
  status: number
  code: string
}
export function validateAudio(body: Record<string, unknown>): ValidatedAudio
export declare const SFX_TEXT_LIMIT: 450
export function compactSfxText(value: unknown, limit?: number): string
export function providerError(
  status: number,
  code?: string,
  detailMessage?: string,
): AudioError
export function callProvider(
  key: string,
  path: string,
  body?: unknown,
  fetcher?: typeof fetch,
): Promise<Response>
export function wordsFromCharacters(alignment: unknown): AlignedWord[]
export interface GeneratedAudio {
  bytes: Uint8Array
  words: AlignedWord[]
}
export function generateAudio(
  key: string,
  config: ValidatedAudio,
  fetcher?: typeof fetch,
): Promise<GeneratedAudio>
