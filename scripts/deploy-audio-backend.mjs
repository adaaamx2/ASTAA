import { existsSync, mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const info = readFileSync(join(root, "utils/supabase/info.tsx"), "utf8")
const project = info.match(/projectId\s*=\s*"([^"]+)"/)?.[1]
const config = readFileSync(join(root, "supabase/config.toml"), "utf8")
const functionName = config.match(/\[functions\.([^\]]+)\]/)?.[1]
const revision = readFileSync(
  join(root, "supabase/functions/server/app.ts"),
  "utf8",
).match(/revision:\s*"([^"]+)"/)?.[1]
if (
  project !== "ystgyievwiburdycbbrg" ||
  functionName !== "make-server-bd5da494" ||
  !revision
)
  throw new Error(
    "El destino no coincide con el proyecto autorizado ystgyievwiburdycbbrg / make-server-bd5da494. No se desplegará nada.",
  )
function run(args) {
  const hasNpx =
    spawnSync("npx", ["--version"], {
      stdio: "ignore",
      shell: process.platform === "win32",
    }).status === 0
  const runner = hasNpx ? "npx" : "pnpm"
  const cli = hasNpx
    ? ["--yes", "supabase@2.121.0"]
    : ["dlx", "supabase@2.121.0"]
  const result = spawnSync(runner, [...cli, ...args], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  })
  if (result.error || result.status !== 0)
    throw new Error(
      `La CLI no completó «${args.slice(0, 2).join(" ")}». Comprueba Node.js y npm/npx o pnpm. Se detiene el despliegue; no se genera audio.`,
    )
}

async function verify() {
  const publicKey = info.match(/publicAnonKey\s*=\s*"([^"]+)"/)?.[1]
  if (!publicKey)
    throw new Error("Falta la clave pública configurada del proyecto.")
  const response = await fetch(
    `https://${project}.supabase.co/functions/v1/${functionName}/health`,
    {
      headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  )
  if (!response.ok)
    throw new Error(`La función responde HTTP ${response.status}.`)
  const data = await response.json()
  if (data.revision !== revision)
    throw new Error(
      `El servidor ejecuta ${String(data.revision || "revisión desconocida").slice(0, 100)}; se necesita ${revision}. No generar audio ni repetir voces.`,
    )
  if (!data.features?.includes("voice-lab-v1"))
    throw new Error(
      "El backend no confirma voice-lab-v1. Las rutas de personajes y biblioteca todavía no están desplegadas.",
    )
  console.log(
    `CONFIRMADO: ${functionName} ejecuta ${revision} con voice-lab-v1.`,
  )
  console.log(
    "Backend actualizado. Comprueba sesión y Storage sin créditos con: node scripts/verify-live-audio.mjs",
  )
}

async function main() {
  for (const file of [
    "supabase/config.toml",
    "utils/supabase/info.tsx",
    ...[
      "index.tsx",
      "app.ts",
      "project-routes.ts",
      "kv_store.tsx",
      "audio-provider.mjs",
      "audio-routes.tsx",
      "storage.mjs",
      "authorization.mjs",
      "projects.mjs",
      "pending-audio.mjs",
      "voice-lab-provider.mjs",
      "voice-lab-routes.mjs",
    ].map((file) => `supabase/functions/server/${file}`),
  ]) {
    if (!existsSync(join(root, file)))
      throw new Error(`Falta ${file}. Descomprime el paquete completo.`)
  }
  console.log(
    `Destino único: ${project} / ${functionName}. No se borran funciones, archivos ni datos.`,
  )
  if (process.argv.includes("--check")) {
    console.log(
      "Paquete completo. Comprobación local: sin red, sin autenticación y sin gasto.",
    )
    return
  }
  if (process.argv.includes("--verify")) return verify()
  // Credentials remain with the official CLI or in the caller's environment.
  // Never accept a token argument or write credentials into the project.
  if (!process.env.SUPABASE_ACCESS_TOKEN && !process.stdin.isTTY)
    throw new Error(
      "Se necesita autorización de despliegue. Ejecuta este script en tu terminal para iniciar sesión en Supabase, o proporciona SUPABASE_ACCESS_TOKEN de forma privada en ese entorno. No lo pegues en el chat.",
    )
  if (!process.env.SUPABASE_ACCESS_TOKEN) run(["login"])
  const backup = mkdtempSync(join(tmpdir(), "yt-audio-backup-"))
  run([
    "functions",
    "download",
    functionName,
    "--project-ref",
    project,
    "--use-api",
    "--workdir",
    backup,
  ])
  console.log(`Respaldo de la versión anterior: ${backup}`)
  run([
    "functions",
    "deploy",
    functionName,
    "--project-ref",
    project,
    "--use-api",
  ])
  await verify()
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
