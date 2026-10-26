import { useEffect, useRef, type VideoHTMLAttributes } from "react"
import { startPreview, pausePreview, useMixedPreview } from "./playback"

export default function MixedVideo({
  projectId,
  ...props
}: VideoHTMLAttributes<HTMLVideoElement> & { projectId: string }) {
  const preview = useMixedPreview(projectId)
  const video = useRef<HTMLVideoElement>(null)
  const owned = useRef(false)
  useEffect(() => {
    if (
      owned.current &&
      preview.hasAudio &&
      !preview.playing &&
      !preview.loading
    )
      video.current?.pause()
  }, [preview.hasAudio, preview.playing, preview.loading])
  return (
    <video
      {...props}
      ref={video}
      muted={preview.hasAudio || props.muted}
      onPlay={(event) => {
        owned.current = true
        if (preview.hasAudio)
          void startPreview(projectId, event.currentTarget.currentTime)
        props.onPlay?.(event)
      }}
      onPause={(event) => {
        if (owned.current && preview.hasAudio) pausePreview(projectId)
        props.onPause?.(event)
      }}
      onSeeked={(event) => {
        if (owned.current && preview.hasAudio && !event.currentTarget.paused)
          void startPreview(projectId, event.currentTarget.currentTime)
        props.onSeeked?.(event)
      }}
      onEnded={(event) => {
        if (preview.hasAudio) pausePreview(projectId)
        props.onEnded?.(event)
      }}
    />
  )
}
