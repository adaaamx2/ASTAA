import { useLayoutEffect, useRef, useState } from "react"
import { AbsoluteFill, OffthreadVideo, Sequence, cancelRender, continueRender, delayRender, getRemotionEnvironment, staticFile } from "remotion"
import { publicAssetUrl } from "../media/files"
import { Text } from "../audio/controls"
import { laboralPlan, laboralShot, type LaboralClip } from "./laboral-plan"
import { drawLaboralOverlay, type LaboralAssets } from "./laboral-commercial-overlay"

let pending: Promise<LaboralAssets> | null = null
const assetUrl = (path: string) => getRemotionEnvironment().isRendering ? staticFile(path.slice(1)) : publicAssetUrl(path)
export function loadLaboral() {
  pending ||= Promise.all([
    document.fonts.load('800 96px "Inter Tight Variable"'),
    document.fonts.load('700 56px "Inter Variable"'),
    (async () => {
      const logo = new Image()
      logo.src = assetUrl(laboralPlan.logo)
      await logo.decode()
      return logo
    })(),
  ]).then(([, , logo]) => ({ logo: logo as HTMLImageElement }))
    .catch(error => { pending = null; throw error })
  return pending
}
function Overlay({ time, assets }: { time: number; assets: LaboralAssets }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const c = canvas.current?.getContext("2d")
    if (c) drawLaboralOverlay(c, time, 1920, 1080, assets)
  }, [time, assets])
  return <canvas ref={canvas} width={1920} height={1080} aria-label={`Laboral Clothing · comercial de ropa de trabajo · ${time.toFixed(2)} s`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
}
function NativeFilm({ time, assets }: { time: number; assets: LaboralAssets }) {
  return <AbsoluteFill>
    {laboralPlan.scenes.map((shot, index) => <Sequence key={index} from={Math.round(shot.start * 60)} durationInFrames={Math.round((shot.end - shot.start) * 60)} layout="none">
      <OffthreadVideo src={assetUrl(laboralPlan.clips[shot.clip as LaboralClip])} trimBefore={Math.round(shot.sourceStart * 60)} muted
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
    </Sequence>)}
    <Overlay time={time} assets={assets} />
  </AbsoluteFill>
}
function LiveFilm({ time, assets, playing, speed, onReady }: {
  time: number
  assets: LaboralAssets
  playing: boolean
  speed: number
  onReady?: () => void
}) {
  const videos = useRef<Partial<Record<LaboralClip, HTMLVideoElement>>>({})
  const [ready, setReady] = useState<Partial<Record<LaboralClip, boolean>>>({})
  const [failure, setFailure] = useState("")
  const shot = laboralShot(time)
  useLayoutEffect(() => {
    if (Object.keys(ready).length === Object.keys(laboralPlan.clips).length) onReady?.()
  }, [ready, onReady])
  useLayoutEffect(() => {
    for (const [id, video] of Object.entries(videos.current)) {
      if (!video) continue
      if (id !== shot.clip) { video.pause(); continue }
      const target = Math.max(0, Math.min(video.duration - 0.03 || 0, shot.sourceTime))
      if (Number.isFinite(video.duration) && (!playing || Math.abs(video.currentTime - target) > 0.12))
        video.currentTime = target
      video.playbackRate = Math.max(0.25, Math.min(4, speed))
      if (playing && ready[shot.clip]) void video.play().catch(error => setFailure(error.message))
      else video.pause()
    }
  }, [time, playing, ready, shot.clip, shot.sourceTime, speed])
  useLayoutEffect(() => () => Object.values(videos.current).forEach(video => video?.pause()), [])
  return <>
    {Object.entries(laboralPlan.clips).map(([id, src]) => <video key={id}
      ref={element => { if (element) videos.current[id as LaboralClip] = element }}
      src={assetUrl(src)} muted playsInline preload="auto"
      onLoadedData={() => setReady(previous => previous[id as LaboralClip] ? previous : { ...previous, [id]: true })}
      onError={() => setFailure("No se pudo cargar un plano del comercial. No se mostrará como listo.")}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: id === shot.clip ? 1 : 0 }}
      aria-hidden="true" />)}
    <Overlay time={time} assets={assets} />
    {failure && <Text role="alert">{failure}</Text>}
  </>
}
export default function LaboralPreview({ time, onReady, playing = false, speed = 1 }: {
  time: number
  onReady?: () => void
  playing?: boolean
  speed?: number
}) {
  const native = getRemotionEnvironment().isRendering
  const [assets, setAssets] = useState<LaboralAssets>()
  const [failure, setFailure] = useState("")
  const handle = useRef<number | null>(null)
  useLayoutEffect(() => {
    let live = true
    if (native) handle.current = delayRender("Loading Laboral Clothing official logo and fonts")
    void loadLaboral().then(result => { if (live) setAssets(result) }).catch(error => {
      if (native) cancelRender(error)
      else if (live) setFailure(error.message)
    })
    return () => { live = false; if (handle.current !== null) { continueRender(handle.current); handle.current = null } }
  }, [native])
  useLayoutEffect(() => {
    if (assets && native && handle.current !== null) {
      continueRender(handle.current); handle.current = null
    }
  }, [assets, native])
  if (failure) return <Text role="alert">No se pudo cargar el comercial: {failure}</Text>
  return <div className="ml-art laboral-film" style={{ position: "relative", aspectRatio: "16 / 9", background: laboralPlan.palette.navy }}>
    {assets && (native ? <NativeFilm time={time} assets={assets} /> : <LiveFilm time={time} assets={assets} playing={playing} speed={speed} onReady={onReady} />)}
  </div>
}
