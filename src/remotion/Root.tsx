import { useEffect, useState } from "react"
import {
  AbsoluteFill,
  Composition,
  cancelRender,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import "@fontsource-variable/manrope"
import MotionSequence from "../MotionSequence"
import FigmaSequence from "../FigmaSequence"
import FinnSequence from "../production/FinnSequence"
import { activePacks } from "../production/timing"
import type { Scene } from "../production/data"
import StudyCanvas from "../motion-lab/StudyCanvas"
import { studies, type StudyId } from "../motion-lab/studies"
import Captions from "../production/Captions"
import type { WordTiming } from "../production/timing"
import { editorialAssetUrls, loadEditorialFonts } from "../motion-lab/EditorialSequence"
import "./video.css"

function DiscordVideo() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const [fontHandle] = useState(() => delayRender("Loading Manrope font"))

  useEffect(() => {
    document.fonts
      .load('800 120px "Manrope Variable"')
      .then(() => document.fonts.ready)
      .then(() => continueRender(fontHandle))
      .catch(cancelRender)
  }, [fontHandle])

  return (
    <AbsoluteFill style={{ backgroundColor: "#100b23" }}>
      <MotionSequence time={frame / fps} />
    </AbsoluteFill>
  )
}

export default function RemotionRoot() {
  return (
    <>
      {studies.map((study) => (
        <Composition
          key={study.id}
          id={study.composition}
          component={StudyVideo}
          defaultProps={{
            id: study.id,
            words: [] as WordTiming[],
            pack: "karaoke",
          }}
          width={study.width}
          height={study.height}
          fps={60}
          durationInFrames={Math.round(study.duration * 60)}
        />
      ))}
      <Composition
        id="DiscordMotion"
        component={DiscordVideo}
        durationInFrames={600}
        fps={60}
        width={1080}
        height={1920}
      />
      <Composition
        id="FigmaManifesto"
        component={FigmaVideo}
        durationInFrames={2160}
        fps={60}
        width={1080}
        height={1920}
      />
      {activePacks.map((pack) => (
        <Composition
          key={pack}
          id={`Finn-${pack}`}
          component={FinnVideo}
          defaultProps={{ pack }}
          durationInFrames={3420}
          fps={60}
          width={1080}
          height={1920}
        />
      ))}
    </>
  )
}

function StudyVideo({
  id,
  words,
  pack,
}: {
  id: StudyId
  words: WordTiming[]
  pack: string
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const [handle] = useState(() => delayRender("Loading local study typography"))
  const [ready, setReady] = useState(false)
  useEffect(() => {
    document.fonts
      .load('800 34px "Manrope Variable"')
      .then(() => document.fonts.ready)
      .then(() => id === "editing-collage" || id === "brand-strategy" ? Promise.all([
        loadEditorialFonts(),
        ...editorialAssetUrls().map((url) => {
          const image = new Image(); image.src = url; return image.decode()
        }),
      ]) : undefined)
      .then(() => setReady(true))
      .catch(cancelRender)
  }, [])
  useEffect(() => {
    if (ready) continueRender(handle)
  }, [ready, handle])
  const study = studies.find((study) => study.id === id)!
  const size = { width: study.width / 2, height: study.height / 2 }
  return (
    <AbsoluteFill style={{ background: "#0a0a0d" }}>
      {ready && (
        <>
          <StudyCanvas id={id} time={frame / fps} />
          {words.length > 0 && (
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
              viewBox={`0 0 ${size.width} ${size.height}`}
            >
              <Captions
                time={frame / fps}
                words={words}
                pack={pack}
                width={size.width}
                height={size.height}
              />
            </svg>
          )}
        </>
      )}
    </AbsoluteFill>
  )
}

function FinnVideo({
  pack,
  scenes,
  accent,
  subtitleSize,
}: {
  pack: string
  scenes?: Scene[]
  accent?: string
  subtitleSize?: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const [handle] = useState(() => delayRender("Loading local Finn typography"))
  useEffect(() => {
    document.fonts
      .load('900 48px "Manrope Variable"')
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(cancelRender)
  }, [handle])
  return (
    <AbsoluteFill>
      <FinnSequence
        time={frame / fps}
        pack={pack}
        scenes={scenes}
        accent={accent}
        subtitleSize={subtitleSize}
      />
    </AbsoluteFill>
  )
}

function FigmaVideo() {
  const frame = useCurrentFrame()
  const [handle] = useState(() => delayRender("Loading Figma typography"))
  useEffect(() => {
    document.fonts
      .load('800 130px "Manrope Variable"')
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(cancelRender)
  }, [handle])
  return (
    <AbsoluteFill>
      <FigmaSequence time={frame / 60} />
    </AbsoluteFill>
  )
}
