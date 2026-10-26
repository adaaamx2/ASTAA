export const UHD_FPS = 60
export const UHD_SEGMENT_FRAMES = 120

export function uhdDimensions(width: number, height: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error(
      "No se pudieron determinar las dimensiones del vídeo original.",
    )
  return width < height
    ? { width: 2160, height: 3840 }
    : { width: 3840, height: 2160 }
}

export function uhdSegments(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 600)
    throw new Error(
      "La exportación 4K del navegador admite vídeos de hasta 10 minutos.",
    )
  const frames = Math.ceil(duration * UHD_FPS)
  const segments = []
  for (let frame = 0; frame < frames; frame += UHD_SEGMENT_FRAMES) {
    const count = Math.min(UHD_SEGMENT_FRAMES, frames - frame)
    segments.push({
      start: frame / UHD_FPS,
      duration: count / UHD_FPS,
      frames: count,
    })
  }
  return segments
}

export function uhdVideoFilter(
  width: number,
  height: number,
  duration: number,
) {
  return `setpts=PTS-STARTPTS,fps=${UHD_FPS},scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,tpad=stop_mode=clone:stop_duration=${duration}`
}
