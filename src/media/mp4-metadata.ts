interface Box {
  type: string
  start: number
  end: number
}
export interface Mp4Metadata {
  width: number
  height: number
  duration: number
  fps: number
  hasAudio: boolean
}

/** Read real MP4 track dimensions and sample timing without another codec process. */
export function mp4Metadata(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u32 = (at: number) => view.getUint32(at, false)
  const u64 = (at: number) => Number(view.getBigUint64(at, false))
  const text = (at: number) =>
    String.fromCharCode(...bytes.subarray(at, at + 4))
  function boxes(start: number, end: number): Box[] {
    const result: Box[] = []
    for (let at = start; at + 8 <= end; ) {
      let size = u32(at)
      let header = 8
      if (size === 1) {
        if (at + 16 > end) throw new Error("Cabecera MP4 incompleta.")
        size = u64(at + 8)
        header = 16
      } else if (size === 0) size = end - at
      if (!Number.isSafeInteger(size) || size < header || at + size > end)
        throw new Error(
          "El archivo MP4 está incompleto o tiene metadatos no válidos.",
        )
      result.push({ type: text(at + 4), start: at + header, end: at + size })
      at += size
    }
    return result
  }
  const child = (box: Box, type: string) =>
    boxes(box.start, box.end).find((item) => item.type === type)
  const moov = boxes(0, bytes.length).find((box) => box.type === "moov")
  if (!moov) throw new Error("No se encontraron los metadatos del MP4.")
  let video: Omit<Mp4Metadata, "hasAudio"> | undefined
  let hasAudio = false
  for (const track of boxes(moov.start, moov.end).filter(
    (box) => box.type === "trak",
  )) {
    const media = child(track, "mdia")
    const header = child(track, "tkhd")
    if (!media || !header) continue
    const handler = child(media, "hdlr")
    if (!handler || handler.end - handler.start < 12) continue
    const kind = text(handler.start + 8)
    if (kind === "soun") hasAudio = true
    if (kind !== "vide" || video) continue
    if (header.end - header.start < 84)
      throw new Error("Dimensiones del MP4 no válidas.")
    let width = u32(header.end - 8) / 65536
    let height = u32(header.end - 4) / 65536
    const matrix = header.start + (bytes[header.start] === 1 ? 52 : 40)
    if (
      matrix + 20 <= header.end &&
      view.getInt32(matrix, false) === 0 &&
      view.getInt32(matrix + 16, false) === 0 &&
      Math.abs(view.getInt32(matrix + 4, false)) === 65536
    )
      [width, height] = [height, width]
    const mdhd = child(media, "mdhd")
    if (!mdhd || mdhd.end - mdhd.start < 20)
      throw new Error("No se pudo leer el reloj del vídeo.")
    const version = bytes[mdhd.start]
    const clockAt = mdhd.start + (version === 1 ? 20 : 12)
    if (clockAt + (version === 1 ? 12 : 8) > mdhd.end)
      throw new Error("El reloj del vídeo está incompleto.")
    const timescale = u32(clockAt)
    const declaredDuration = version === 1 ? u64(clockAt + 4) : u32(clockAt + 4)
    const minf = child(media, "minf")
    const stbl = minf && child(minf, "stbl")
    const stts = stbl && child(stbl, "stts")
    let frames = 0,
      ticks = 0
    if (stts && stts.end - stts.start >= 8) {
      const count = u32(stts.start + 4)
      if (stts.start + 8 + count * 8 > stts.end)
        throw new Error("La tabla de fotogramas del MP4 está incompleta.")
      for (let index = 0; index < count; index++) {
        const at = stts.start + 8 + index * 8
        const samples = u32(at)
        frames += samples
        ticks += samples * u32(at + 4)
      }
    }
    video = {
      width,
      height,
      duration: (ticks || declaredDuration) / timescale,
      fps: ticks ? (frames * timescale) / ticks : 0,
    }
  }
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0)
    throw new Error("No se pudo comprobar la pista de vídeo del MP4.")
  return { ...video, hasAudio }
}
