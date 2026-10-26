import { AudioError, callProvider } from "./audio-provider.mjs"

export function validateVoiceJob(body) {
  if (!/^[a-f0-9-]{36}$/.test(body.jobId || ""))
    throw new AudioError(
      400,
      "invalid_job",
      "No se recibió un identificador de generación válido.",
    )
  if (
    !/^[a-zA-Z0-9_-]{1,100}$/.test(body.voiceId || "") ||
    /^(sk_|xi_)/i.test(body.voiceId)
  )
    throw new AudioError(
      400,
      "voice_required",
      "Elige una voz o introduce un Voice ID, no una API key.",
    )
  const script = String(body.script || "").trim()
  const taggedScript = String(body.taggedScript || script).trim()
  const spoken = (value) =>
    value
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  if (!script || taggedScript.length > 5000)
    throw new AudioError(
      400,
      "script_length",
      "Usa un guion de hasta 5.000 caracteres, incluidas las etiquetas.",
    )
  if (spoken(script) !== spoken(taggedScript))
    throw new AudioError(
      400,
      "script_changed",
      "Las etiquetas pueden cambiar la interpretación, pero no las palabras del guion. Revisa el texto etiquetado.",
    )
  return {
    jobId: body.jobId,
    voiceId: body.voiceId,
    script,
    taggedScript,
    name: String(body.name || "Narración")
      .trim()
      .slice(0, 120),
    characterId: String(body.characterId || "").slice(0, 80),
  }
}

export function alignedWords(alignment) {
  if (!alignment?.characters?.length) return []
  const result = []
  let word = null,
    tag = false
  for (let index = 0; index < alignment.characters.length; index++) {
    const char = alignment.characters[index]
    if (char === "[") {
      tag = true
      continue
    }
    if (tag) {
      if (char === "]") tag = false
      continue
    }
    if (/\s/.test(char)) {
      if (word && word.end > word.start) result.push(word)
      word = null
      continue
    }
    const start = alignment.character_start_times_seconds?.[index]
    const end = alignment.character_end_times_seconds?.[index]
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end < start
    )
      continue
    word ||= { text: "", start, end }
    word.text += char
    word.end = end
  }
  if (word && word.end > word.start) result.push(word)
  return result
}

/** Exactly one provider call for one explicitly authorized take. Never retry. */
export async function generateVoiceTake(key, job, take, fetcher = fetch) {
  const response = await callProvider(
    key,
    `text-to-speech/${encodeURIComponent(job.voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      text: job.taggedScript,
      model_id: "eleven_v3",
      seed: job.seeds[take],
      voice_settings: { stability: 0.5 },
    },
    fetcher,
  ).catch((error) => {
    if (error.code?.endsWith("_text_too_long"))
      throw new AudioError(
        error.status,
        "voice_script_too_long",
        "Eleven v3 rechazó la longitud del guion. Usa hasta 5.000 caracteres incluidas las etiquetas, o divide la narración. No se ha reintentado.",
      )
    throw error
  })
  let data
  try {
    data = await response.json()
  } catch {
    throw new AudioError(
      502,
      "voice_take_uncertain",
      "ElevenLabs no devolvió una respuesta válida. Revisa el historial antes de repetir.",
    )
  }
  if (typeof data.audio_base64 !== "string" || !data.audio_base64)
    throw new AudioError(
      502,
      "voice_take_empty",
      "ElevenLabs no devolvió audio. No se ha reintentado.",
    )
  let bytes
  try {
    bytes = Uint8Array.from(atob(data.audio_base64), (char) =>
      char.charCodeAt(0),
    )
  } catch {
    throw new AudioError(
      502,
      "voice_take_invalid",
      "El audio de ElevenLabs no es válido. No se ha reintentado.",
    )
  }
  if (!bytes.length)
    throw new AudioError(
      502,
      "voice_take_empty",
      "La toma recibida está vacía.",
    )
  const alignment = data.normalized_alignment || data.alignment
  const words = alignedWords(alignment)
  const ends = alignment?.character_end_times_seconds || []
  const duration = Math.max(0, ...ends.filter(Number.isFinite))
  return { bytes, base64: data.audio_base64, words, duration }
}

export function uploadedType(bytes, image = false) {
  const text = (start, end) => new TextDecoder().decode(bytes.slice(start, end))
  if (image) {
    if (bytes[0] === 137 && text(1, 4) === "PNG") return ["image/png", "png"]
    if (bytes[0] === 255 && bytes[1] === 216) return ["image/jpeg", "jpg"]
    if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP")
      return ["image/webp", "webp"]
  } else {
    if (text(0, 3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 224) === 224))
      return ["audio/mpeg", "mp3"]
    if (text(0, 4) === "RIFF" && text(8, 12) === "WAVE")
      return ["audio/wav", "wav"]
    if (text(0, 4) === "OggS") return ["audio/ogg", "ogg"]
    if (text(4, 8) === "ftyp") return ["audio/mp4", "m4a"]
    if (
      bytes[0] === 26 &&
      bytes[1] === 69 &&
      bytes[2] === 223 &&
      bytes[3] === 163
    )
      return ["audio/webm", "webm"]
  }
  throw new AudioError(
    400,
    "unsupported_file",
    image
      ? "Sube una imagen PNG, JPG o WebP."
      : "Sube audio MP3, WAV, M4A, OGG o WebM válido.",
  )
}
