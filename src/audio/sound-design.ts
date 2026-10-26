import type { AudioState } from "./engine"
import { compactSfxText } from "../../supabase/functions/server/audio-provider.mjs"

export function sfxDuration(state: AudioState) {
  return state.sfxDuration ?? Math.min(30, Math.max(0.5, state.duration))
}

export function sfxPrompt(state: AudioState) {
  if (state.drafts?.sfx?.trim()) return compactSfxText(state.drafts.sfx)
  const context =
    state.soundDesign ||
    state.clips
      .filter((clip) => clip.kind === "sfx" && !clip.asset)
      .map((clip) => clip.description)
      .join(". ")
  const script =
    state.drafts?.voice ??
    state.clips
      .filter((clip) => clip.kind === "voice")
      .map((clip) => clip.text || clip.description)
      .join(" ")
  return [
    `Throughout ${sfxDuration(state)}s:`,
    compactSfxText(
      context || "Precise editorial transitions and tactile object movements",
      280,
    ),
    `Script mood: ${compactSfxText(script, 85)}.`,
    "Clear audible Foley and transients. No speech or music.",
  ]
    .join(" ")
    .slice(0, 450)
}
