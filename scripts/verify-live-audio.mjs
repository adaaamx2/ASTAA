import { readFileSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createHash } from "node:crypto"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const info = readFileSync(join(root, "utils/supabase/info.tsx"), "utf8")
const project = info.match(/projectId\s*=\s*"([^"]+)"/)?.[1]
const publicKey = info.match(/publicAnonKey\s*=\s*"([^"]+)"/)?.[1]
const revision = readFileSync(
  join(root, "supabase/functions/server/app.ts"),
  "utf8",
).match(/revision:\s*"([^"]+)"/)?.[1]
const base = `https://${project}.supabase.co/functions/v1/make-server-bd5da494`
let token

async function request(path, body) {
  let response
  try {
    response = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        apikey: publicKey,
        Authorization: `Bearer ${token || publicKey}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(190000),
    })
  } catch {
    throw new Error(
      `Conexión interrumpida en ${path}. No se reintentó la solicitud; no cambies los parámetros para eludir la caché.`,
    )
  }
  let data
  try {
    data = await response.json()
  } catch {
    throw new Error(`Respuesta no válida en ${path} (HTTP ${response.status}).`)
  }
  if (!response.ok)
    throw new Error(
      `${path}: HTTP ${response.status} · ${data.code || "sin código"} · ${data.operation || "sin operación"} · ${String(data.error || "Solicitud rechazada").slice(0, 400)}`,
    )
  return data
}

async function ask(label) {
  if (!process.stdin.isTTY)
    throw new Error(
      "Usa una terminal interactiva para iniciar sesión. No compartas contraseñas ni tokens en el chat.",
    )
  const input = createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  try {
    return (await input.question(label)).trim()
  } finally {
    input.close()
  }
}

async function password() {
  if (!process.stdin.isTTY)
    throw new Error("La contraseña requiere una terminal interactiva.")
  process.stdout.write(
    "Contraseña de tu cuenta de la app (oculta, no se guarda): ",
  )
  const wasRaw = process.stdin.isRaw
  process.stdin.setRawMode(true)
  process.stdin.resume()
  try {
    return await new Promise((resolve, reject) => {
      let value = ""
      const listener = (bytes) => {
        for (const char of bytes.toString("utf8")) {
          if (char === "\r" || char === "\n" || char === "\u0003") {
            process.stdin.off("data", listener)
            process.stdout.write("\n")
            if (char === "\u0003") reject(new Error("Cancelado."))
            else resolve(value)
            return
          }
          if (char === "\u007f" || char === "\b") value = value.slice(0, -1)
          else if (char >= " ") value += char
        }
      }
      process.stdin.on("data", listener)
    })
  } finally {
    process.stdin.setRawMode(Boolean(wasRaw))
    process.stdin.pause()
  }
}

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok)
    throw new Error(
      `No se pudo descargar el audio: HTTP ${response.status}. No se repitió la generación.`,
    )
  const bytes = Buffer.from(await response.arrayBuffer())
  // Check an MP3 signature, not just a successful HTTP response or nonempty HTML.
  let mp3 = bytes.subarray(0, 3).toString() === "ID3"
  for (let i = 0; !mp3 && i < Math.min(bytes.length - 1, 4096); i++)
    mp3 = bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0
  if (bytes.length < 100 || !mp3)
    throw new Error(
      "El archivo descargado no parece un MP3 válido. No se reintentó la generación.",
    )
  return bytes
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex")

async function main() {
  if (project !== "ystgyievwiburdycbbrg" || !publicKey || !revision)
    throw new Error("La configuración no coincide con el proyecto autorizado.")
  if (process.argv.includes("--check")) {
    console.log(
      `Configuración local válida: ${project} · ${revision}. Sin red ni gasto.`,
    )
    return
  }
  const health = await request("/health")
  if (health.revision !== revision)
    throw new Error(
      `Backend SIN ACTUALIZAR: remoto=${health.revision}; requerido=${revision}. Ejecuta node scripts/deploy-audio-backend.mjs. No se solicitó audio.`,
    )
  const email = await ask("Email de tu cuenta de la app: ")
  let secret = await password()
  const auth = await fetch(
    `https://${project}.supabase.co/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: publicKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: secret }),
      signal: AbortSignal.timeout(20000),
    },
  )
  secret = ""
  const session = await auth.json()
  if (!auth.ok || !session.access_token)
    throw new Error("No se pudo iniciar sesión. No se generó audio.")
  token = session.access_token
  if (!(await request("/studio/session")).authorized)
    throw new Error("La cuenta no tiene permiso de propietario.")
  if (!(await request("/studio/audio/status")).configured)
    throw new Error(
      "Falta ELEVENLABS_API_KEY en los secretos del proyecto conectado.",
    )
  if (!(await request("/studio/audio/preflight", {})).ready)
    throw new Error(
      "Supabase no confirmó Storage e índice. No se generó audio.",
    )
  const { voices } = await request("/studio/audio/voices")
  console.log(
    `PRECHECK REAL correcto: sesión, secreto, catálogo (${voices.length} voces), escritura y firma de Storage e índice. Sin generación.`,
  )
  if (!process.argv.includes("--generate")) {
    console.log(
      "Para probar las tres generaciones reales: node scripts/verify-live-audio.mjs --generate",
    )
    return
  }
  const voiceId = process.env.STUDIO_VOICE_ID || voices[0]?.id
  if (!voiceId)
    throw new Error(
      "El catálogo está vacío. Configura STUDIO_VOICE_ID con una voz accesible antes de la prueba.",
    )
  console.log(
    "PRUEBA REAL DE PAGO: una frase breve de voz, SFX de 0,5 s y música de 3 s. Hasta tres solicitudes facturables. Una repetición usa los mismos parámetros y su caché; no se eliminan bloqueos.",
  )
  if ((await ask("Escribe GENERAR para autorizar esta prueba: ")) !== "GENERAR")
    throw new Error("Cancelado antes de generar.")
  const directory = mkdtempSync(join(tmpdir(), "yt-elevenlabs-real-"))
  const summary = { project, revision, realProvider: true, tracks: [] }
  for (const config of [
    { kind: "voice", text: "Esta es una prueba real de voz breve.", voiceId },
    {
      kind: "sfx",
      text: "A soft brief airy whoosh, no music or speech",
      duration: 0.5,
    },
    {
      kind: "music",
      text: "Quiet warm ambient instrumental piano",
      duration: 3,
    },
  ]) {
    console.log(`Solicitando ${config.kind}…`)
    const result = await request("/studio/audio/generate", config)
    const bytes = await download(result.url)
    writeFileSync(join(directory, `${config.kind}.mp3`), bytes, { mode: 0o600 })
    if (result.persistencePending)
      throw new Error(
        `Audio recibido y conservado en ${directory}, pero su alojamiento está pendiente. No se continuó con las demás pistas.`,
      )
    const renewed = await request(`/studio/audio/assets/${result.id}`)
    if (hash(await download(renewed.url)) !== hash(bytes))
      throw new Error(
        "La recuperación desde Storage no coincide con el audio generado.",
      )
    const cached = await request("/studio/audio/generate", config)
    if (cached.cacheHit !== true || cached.id !== result.id)
      throw new Error("El servidor no confirmó la caché. Se detuvo la prueba.")
    summary.tracks.push({
      kind: config.kind,
      id: result.id,
      bytes: bytes.length,
      sha256: hash(bytes),
      cacheHitOnFirstRequest: result.cacheHit,
      cacheVerified: true,
    })
    writeFileSync(
      join(directory, "verification.json"),
      JSON.stringify(summary, null, 2),
      { mode: 0o600 },
    )
    console.log(
      `OK REAL ${config.kind}: MP3 descargado, recuperado de Storage y caché confirmada.`,
    )
  }
  console.log(
    `Tres pistas REALES verificadas. Archivos y resumen sin secretos: ${directory}. Escucha los MP3 para verificar su contenido; la firma MP3 no sustituye una comprobación auditiva.`,
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
