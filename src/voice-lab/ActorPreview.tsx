import { useEffect, useRef, useState } from "react"
import type { Character, LabAudio, LabProject } from "./model"
import {
  characterImage,
  envelope,
  paintCharacter,
  palette,
} from "./character-video"
import { AudioPlayer } from "./media"
import Captions from "../production/Captions"
import { Box, Text } from "../audio/controls"

export default function ActorPreview({
  project,
  character,
  audio,
}: {
  project: LabProject
  character?: Character
  audio: LabAudio
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const player = useRef<HTMLAudioElement>(null)
  const [time, setTime] = useState(0)
  const [error, setError] = useState("")
  useEffect(() => {
    setError("")
    let live = true,
      frame = 0
    let image: ImageBitmap | null = null
    const context = new AudioContext()
    void (async () => {
      const response = await fetch(audio.url, {
        signal: AbortSignal.timeout(30000),
      })
      if (!response.ok) throw new Error("No se pudo recuperar la voz.")
      const buffer = await context.decodeAudioData(await response.arrayBuffer())
      const levels = envelope(buffer)
      image = await characterImage(character)
      if (!live) {
        image?.close()
        return
      }
      await document.fonts.load('800 24px "Manrope Variable"')
      const tick = () => {
        if (!live) return
        const time = player.current?.currentTime || 0
        setTime(time)
        if (canvas.current)
          paintCharacter(
            canvas.current,
            time,
            project,
            character,
            image,
            levels,
            palette(canvas.current),
          )
        frame = requestAnimationFrame(tick)
      }
      tick()
    })().catch((error) => {
      if (live) setError(error.message)
    })
    return () => {
      live = false
      cancelAnimationFrame(frame)
      image?.close()
      void context.close()
    }
  }, [project, character, audio.url])
  return (
    <Box className="vl-preview">
      <Box className="vl-preview-frame">
        <canvas
          ref={canvas}
          width={540}
          height={960}
          aria-label="Vista previa del personaje sincronizada con el audio"
        />
        <svg
          className="vl-captions"
          viewBox="0 0 540 960"
          aria-label="Captions del audio seleccionado"
        >
          <Captions
            time={time}
            words={project.words.map((word) => ({
              ...word,
              sceneId: 0,
              source:
                project.timingSource === "estimated"
                  ? "estimated"
                  : "provider-character-alignment",
            }))}
            pack="karaoke"
            width={540}
            height={960}
          />
        </svg>
      </Box>
      <AudioPlayer
        ref={player}
        src={audio.url}
        aria-label={`Voz de ${audio.name}`}
      />
      <Text className="vl-muted">
        El audio manda: personaje y captions leen su posición. Sin animación de
        boca.
      </Text>
      {error && <Text role="alert">{error}</Text>}
    </Box>
  )
}
