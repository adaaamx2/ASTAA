import { useEffect, useState } from "react"
import { estimateWords, type WordTiming } from "../production/timing"
import type { Scene } from "../production/data"
import { readAudioState } from "./engine"
export default function useAudioTimeline(id: string, scenes: Scene[]) {
  const [audio, setAudio] = useState(() => readAudioState(id))
  useEffect(() => {
    setAudio(readAudioState(id))
    let previous = ""
    const receive = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail.id !== id) return
      const signature = JSON.stringify([
        detail.state.clips,
        detail.state.duration,
      ])
      if (signature !== previous) {
        previous = signature
        setAudio(detail.state)
      }
    }
    window.addEventListener("audio-state-updated", receive)
    return () => window.removeEventListener("audio-state-updated", receive)
  }, [id])
  const clips = audio?.clips.filter((c) => c.kind === "voice") || []
  const hasVoice = clips.some((c) => c.asset)
  const timedScenes = hasVoice
    ? scenes.map((scene) => {
        const clip = clips.find((c) => c.sceneId === String(scene.id))
        return clip
          ? { ...scene, start: clip.start, end: clip.start + clip.duration }
          : scene
      })
    : scenes
  const words: WordTiming[] = hasVoice
    ? timedScenes.flatMap((scene) => {
        const clip = clips.find((c) => c.sceneId === String(scene.id))
        return clip?.words?.length
          ? clip.words.map((w) => ({
              ...w,
              start: w.start + clip.start,
              end: w.end + clip.start,
              sceneId: scene.id,
              source: "provider-character-alignment" as const,
            }))
          : estimateWords([scene])
      })
    : estimateWords(scenes)
  return {
    scenes: timedScenes,
    words,
    hasVoice,
    estimated: words.some((w) => w.source === "estimated"),
  }
}
