// New, independent provider boundary. Never return provider bodies or credentials.
export class AudioError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}
export const SFX_TEXT_LIMIT = 450
export function compactSfxText(value, limit = SFX_TEXT_LIMIT) {
  const text = String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (text.length <= limit) return text
  const cut = text.slice(0, limit)
  const boundary = cut.lastIndexOf(" ")
  return (boundary > limit - 60 ? cut.slice(0, boundary) : cut).trim()
}
export function providerError(status, code = "", detailMessage = "") {
  const quota = /quota|credit/i.test(code)
  const tooLong =
    /text_too_long|prompt_too_long|max_prompt_length/i.test(code) ||
    /(?:text|prompt).{0,100}(?:too long|maximum|450)|(?:450).{0,80}(?:character|length)/i.test(
      detailMessage,
    )
  const messages = {
    400: "ElevenLabs rechazó los parámetros de la solicitud (HTTP 400). No es un resultado incierto. No se ha reintentado.",
    401: "Clave inválida. Sustituye ELEVENLABS_API_KEY en los secretos de Supabase.",
    402: "No quedan créditos. Recarga saldo en ElevenLabs antes de repetir.",
    403: "Operación no permitida. Habilita su permiso en la clave y comprueba tu plan.",
    404: "Voz o función no disponible. Elige una voz de tu biblioteca.",
    422: "Parámetros no admitidos. Reduce el texto o revisa la duración.",
    429: "Demasiadas solicitudes. Espera un minuto antes de volver a intentarlo.",
  }
  return new AudioError(
    status,
    `eleven_${status}${quota ? "_quota" : tooLong ? "_text_too_long" : ""}`,
    quota
      ? messages[402]
      : tooLong
        ? "ElevenLabs rechazó una descripción demasiado larga. El prompt SFX debe tener como máximo 450 caracteres. No se ha reintentado."
        : messages[status] ||
          "Resultado temporalmente incierto. Revisa el historial de ElevenLabs antes de repetir.",
  )
}
export async function callProvider(key, path, body, fetcher = fetch) {
  if (!key)
    throw new AudioError(
      503,
      "missing_key",
      "Falta la clave. Guarda ELEVENLABS_API_KEY en los secretos de Supabase.",
    )
  let response
  try {
    response = await fetcher(`https://api.elevenlabs.io/v1/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(150000),
    })
  } catch {
    throw new AudioError(
      503,
      "result_uncertain",
      "Conexión interrumpida. Revisa el historial de ElevenLabs antes de repetir; no se reintentó el cobro.",
    )
  }
  if (!response.ok) {
    let code = ""
    let detailMessage = ""
    try {
      const data = await response.json()
      const detail = data.detail ?? data.error
      code = String(detail?.code || detail?.status || detail?.type || "")
      detailMessage =
        typeof detail === "string"
          ? detail.slice(0, 1000)
          : String(detail?.message || "").slice(0, 1000)
    } catch {}
    throw providerError(response.status, code, detailMessage)
  }
  return response
}
export function wordsFromCharacters(alignment) {
  const words = []
  if (!alignment?.characters?.length) return words
  if (
    alignment.characters.length !==
      alignment.character_start_times_seconds?.length ||
    alignment.characters.length !==
      alignment.character_end_times_seconds?.length ||
    alignment.characters.some(
      (char, i) =>
        typeof char !== "string" ||
        !Number.isFinite(alignment.character_start_times_seconds[i]) ||
        !Number.isFinite(alignment.character_end_times_seconds[i]) ||
        alignment.character_start_times_seconds[i] < 0 ||
        alignment.character_end_times_seconds[i] <
          alignment.character_start_times_seconds[i],
    )
  )
    return []
  let word
  alignment.characters.forEach((char, i) => {
    if (/\s/.test(char)) {
      if (word) words.push(word)
      word = null
      return
    }
    const start = alignment.character_start_times_seconds?.[i]
    const end = alignment.character_end_times_seconds?.[i]
    if (!Number.isFinite(start) || !Number.isFinite(end)) return
    word ||= {
      text: "",
      start,
      end,
      sceneId: 0,
      source: "provider-character-alignment",
    }
    word.text += char
    word.end = end
  })
  if (word) words.push(word)
  if (
    words.some(
      (w, i) => w.end <= w.start || (i && w.start < words[i - 1].end - 0.02),
    )
  )
    return []
  return words
}
export function validateAudio(body) {
  const kind = body.kind
  if (!["voice", "sfx", "music"].includes(kind))
    throw new AudioError(400, "invalid_kind", "Elige voz, SFX o música.")
  let text = String(body.text || "").trim()
  if (!text || text.length > (kind === "voice" ? 5000 : 2000))
    throw new AudioError(
      400,
      "text_too_long",
      "Texto vacío o demasiado largo. Usa una escena de hasta 5000 caracteres o una descripción de hasta 2000.",
    )
  if (kind === "sfx") {
    text = compactSfxText(text)
    if (!text)
      throw new AudioError(
        400,
        "empty_text",
        "Describe el efecto de sonido antes de generarlo.",
      )
  }
  if (kind === "voice") {
    if (
      !/^[a-zA-Z0-9_-]{1,100}$/.test(body.voiceId || "") ||
      /^(sk_|xi_)/i.test(body.voiceId)
    )
      throw new AudioError(
        400,
        "voice_required",
        "Selecciona una voz disponible antes de generar; no uses una API key como ID.",
      )
    for (const [from, to] of Object.entries(body.dictionary || {})) {
      if (from && typeof to === "string") text = text.split(from).join(to)
    }
    if (text.length > 5000)
      throw new AudioError(
        400,
        "dictionary_too_long",
        "El diccionario amplía demasiado el texto. Reduce esta escena.",
      )
  }
  const duration = Number(body.duration)
  if (
    kind !== "voice" &&
    (!Number.isFinite(duration) ||
      duration < (kind === "music" ? 3 : 0.5) ||
      duration > (kind === "music" ? 600 : 30))
  )
    throw new AudioError(
      400,
      "invalid_duration",
      "Usa 0,5–30 segundos para SFX o 3–600 segundos para música.",
    )
  const settings = {
    stability: Math.max(
      0,
      Math.min(1, Number(body.settings?.stability ?? 0.48)),
    ),
    similarity_boost: 0.8,
    style: 0.2,
    use_speaker_boost: true,
    speed: Math.max(0.7, Math.min(1.2, Number(body.settings?.speed ?? 1))),
  }
  if (
    Object.values(settings).some(
      (v) => typeof v === "number" && !Number.isFinite(v),
    )
  )
    throw new AudioError(
      400,
      "invalid_settings",
      "Revisa la estabilidad y velocidad de la voz.",
    )
  return {
    kind,
    text,
    duration: kind === "voice" ? null : duration,
    voiceId: kind === "voice" ? body.voiceId : null,
    settings: kind === "voice" ? settings : null,
    revision: 1,
  }
}
export async function generateAudio(key, config, fetcher = fetch) {
  if (config.kind === "voice") {
    const response = await callProvider(
      key,
      `text-to-speech/${config.voiceId}/with-timestamps?output_format=mp3_44100_128`,
      {
        text: config.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: config.settings,
      },
      fetcher,
    )
    let data
    try {
      data = await response.json()
    } catch {
      throw new AudioError(
        502,
        "eleven_invalid_response",
        "ElevenLabs no entregó una respuesta de voz válida. El resultado puede ser facturable: no se reintentó.",
      )
    }
    if (!data?.audio_base64 || typeof data.audio_base64 !== "string")
      throw new AudioError(
        502,
        "empty_audio",
        "El proveedor no devolvió audio. Revisa su historial antes de repetir.",
      )
    let bytes
    try {
      bytes = Uint8Array.from(atob(data.audio_base64), (c) => c.charCodeAt(0))
    } catch {
      throw new AudioError(
        502,
        "eleven_invalid_audio",
        "ElevenLabs entregó audio de voz no válido. Revisa su historial antes de repetir.",
      )
    }
    if (!bytes.length)
      throw new AudioError(
        502,
        "empty_audio",
        "ElevenLabs entregó una voz vacía. No se reintentó la generación.",
      )
    return {
      bytes,
      words: wordsFromCharacters(data.alignment),
    }
  }
  const music = config.kind === "music"
  const response = await callProvider(
    key,
    music
      ? "music?output_format=mp3_44100_128"
      : "sound-generation?output_format=mp3_44100_128",
    music
      ? {
          prompt: `${config.text}. Seamless looping instrumental bed, no vocals, no final cadence.`,
          music_length_ms: Math.round(config.duration * 1000),
          force_instrumental: true,
          model_id: "music_v1",
        }
      : {
          text: compactSfxText(config.text),
          duration_seconds: config.duration,
          model_id: "eleven_text_to_sound_v2",
          prompt_influence: 0.3,
        },
    fetcher,
  )
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (!bytes.length)
    throw new AudioError(
      502,
      "empty_audio",
      "El proveedor devolvió un archivo vacío. Revisa su historial antes de repetir.",
    )
  return { bytes, words: [] }
}
