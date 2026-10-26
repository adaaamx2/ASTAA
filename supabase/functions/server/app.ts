import { Hono } from "npm:hono"
import { cors } from "npm:hono/cors"
import { createClient } from "jsr:@supabase/supabase-js@2.49.8"
import * as kv from "./kv_store.tsx"
import { studioSession } from "./authorization.mjs"
import { installAudioRoutes } from "./audio-routes.tsx"
import { installProjectRoutes } from "./project-routes.ts"
import { installVoiceLabRoutes } from "./voice-lab-routes.mjs"

// Keep application routes separate from Make's generated server entrypoint.
const app = new Hono<{
  Variables: {
    ownerId: string
    studioSession: ReturnType<typeof studioSession>
  }
}>()
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 600,
  }),
)
const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )
const digest = async (value: unknown) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(value)),
      ),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")

for (const prefix of ["/make-server-bd5da494", "/make-server-4bc3557f"]) {
  app.get(`${prefix}/health`, (c) =>
    c.json({
      status: "ok",
      revision: "audio-v6-sfx-prompt-limit",
      features: ["voice-lab-v1"],
    }),
  )
  app.get(`${prefix}/auth/status`, async (c) => {
    try {
      const { data, error } = await admin().auth.admin.listUsers({
        page: 1,
        perPage: 1,
      })
      if (error) throw error
      return c.json({
        setup: data.users.length === 0 && !Deno.env.get("STUDIO_OWNER_USER_ID"),
      })
    } catch {
      return c.json(
        {
          error: "No se pudo comprobar Supabase Auth.",
          code: "auth_unavailable",
        },
        503,
      )
    }
  })
  app.post(`${prefix}/auth/owner`, async (c) => {
    try {
      const client = admin()
      const { data, error } = await client.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      })
      if (error) throw error
      if (data.users.length || Deno.env.get("STUDIO_OWNER_USER_ID"))
        return c.json(
          {
            error:
              "Ya existe una cuenta. Inicia sesión o recupera su contraseña.",
          },
          403,
        )
      const body = await c.req.json()
      if (
        typeof body.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
        typeof body.password !== "string" ||
        body.password.length < 12
      )
        return c.json(
          {
            error:
              "Usa un email válido y una contraseña de al menos 12 caracteres.",
          },
          400,
        )
      const { error: lock } = await client
        .from("kv_store_4bc3557f")
        .insert({ key: "auth:owner-bootstrap", value: { at: Date.now() } })
      if (lock)
        return c.json(
          {
            error:
              lock.code === "23505"
                ? "La creación del propietario ya se inició. Revisa Authentication → Users."
                : "No se pudo reservar el propietario. Comprueba la tabla KV del backend.",
          },
          lock.code === "23505" ? 409 : 503,
        )
      const result = await client.auth.admin.createUser({
        email: body.email.trim(),
        password: body.password,
        email_confirm: true,
        app_metadata: { studio_owner: true },
      })
      if (result.error)
        return c.json(
          {
            error:
              "No se pudo crear la cuenta. Revisa Authentication → Users antes de repetir.",
          },
          503,
        )
      return c.json({ created: true })
    } catch {
      return c.json(
        { error: "No se pudo crear el propietario.", code: "auth_unavailable" },
        503,
      )
    }
  })
  // Health and setup are public. Private and billable routes require an owner.
  app.use(`${prefix}/*`, async (c, next) => {
    if (c.req.method === "OPTIONS") return next()
    try {
      const token = (c.req.header("Authorization") || "").replace(
        /^Bearer\s+/i,
        "",
      )
      const { data, error } = token
        ? await admin().auth.getUser(token)
        : { data: { user: null }, error: null }
      if (error && ![400, 401, 403, 422].includes(Number(error.status)))
        throw error
      const user = error ? null : data.user
      const state = studioSession(user, Deno.env.get("STUDIO_OWNER_USER_ID"))
      if (!user || !state.authorized)
        return c.json(
          { ...state, error: state.message, code: state.reason },
          state.authenticated ? 403 : 401,
        )
      c.set("ownerId", user.id)
      c.set("studioSession", state)
      return next()
    } catch {
      return c.json(
        {
          error: "Supabase no pudo verificar la sesión.",
          code: "auth_unavailable",
        },
        503,
      )
    }
  })
  app.get(`${prefix}/studio/session`, (c) => c.json(c.get("studioSession")))
  installAudioRoutes(app, prefix, admin, kv, digest)
  installProjectRoutes(app, prefix, admin, kv)
  installVoiceLabRoutes(app, prefix, admin, kv)
}

export default app
