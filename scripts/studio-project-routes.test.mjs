import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"

test("real Hono entrypoint mounts private projects, assets, versions and uploads, not placeholder responses", async () => {
  const owner = "11111111-1111-4111-8111-111111111111"
  const rows = new Map(),
    files = new Map()
  const kv = {
    get: async (key) => structuredClone(rows.get(key) ?? null),
    set: async (key, value) => rows.set(key, structuredClone(value)),
    del: async (key) => rows.delete(key),
    getByPrefix: async (prefix) =>
      [...rows]
        .filter(([key]) => key.startsWith(prefix))
        .map(([, value]) => structuredClone(value)),
  }
  let bucketExists = false
  const admin = {
    auth: {
      getUser: async (token) => ({
        data: {
          user:
            token === "owner-token"
              ? { id: owner, app_metadata: { studio_owner: true } }
              : token === "other-token"
                ? { id: "other", app_metadata: {} }
                : null,
        },
        error: null,
      }),
      admin: {
        listUsers: async () => ({
          data: { users: [{ id: owner }] },
          error: null,
        }),
      },
    },
    from: (table) => {
      assert.equal(table, "kv_store_4bc3557f")
      return {
        insert: async ({ key, value }) => {
          if (rows.has(key)) return { error: { code: "23505" } }
          rows.set(key, structuredClone(value))
          return { error: null }
        },
        update: ({ value }) => {
          const where = {}
          const query = {
            eq: (field, expected) => {
              where[field] = expected
              return query
            },
            select: async () => {
              const previous = rows.get(where.key)
              if (String(previous?.revision) !== where["value->>revision"])
                return { data: [], error: null }
              rows.set(where.key, structuredClone(value))
              return { data: [{ key: where.key }], error: null }
            },
          }
          return query
        },
      }
    },
    storage: {
      getBucket: async () =>
        bucketExists
          ? { data: { public: false }, error: null }
          : { data: null, error: { status: 404 } },
      createBucket: async () => {
        bucketExists = true
        return { error: null }
      },
      from: () => ({
        upload: async (path, bytes) => {
          files.set(path, bytes)
          return { error: null }
        },
        createSignedUrl: async (path) => ({
          data: { signedUrl: `https://private.test/${path}` },
          error: null,
        }),
        download: async () => ({ error: { status: 404 } }),
      }),
    },
  }
  globalThis.__studioAdmin = admin
  globalThis.__studioKv = kv
  const oldDeno = globalThis.Deno
  globalThis.Deno = { env: { get: () => "" } }
  const encode = (source) =>
    `data:text/javascript;base64,${Buffer.from(
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    ).toString("base64")}`
  const url = (path) => new URL(path, import.meta.url).href
  try {
    const audioSource = (
      await readFile(
        new URL(
          "../supabase/functions/server/audio-routes.tsx",
          import.meta.url,
        ),
        "utf8",
      )
    )
      .replace(
        '"./audio-provider.mjs"',
        JSON.stringify(url("../supabase/functions/server/audio-provider.mjs")),
      )
      .replace(
        '"./storage.mjs"',
        JSON.stringify(url("../supabase/functions/server/storage.mjs")),
      )
    let source = await readFile(
      new URL("../supabase/functions/server/app.ts", import.meta.url),
      "utf8",
    )
    source = source
      .replace('"npm:hono"', JSON.stringify(import.meta.resolve("hono")))
      .replace(
        '"npm:hono/cors"',
        JSON.stringify(import.meta.resolve("hono/cors")),
      )
      .replace(
        /import \{ createClient \} from "[^"]+"/,
        "const createClient = () => globalThis.__studioAdmin",
      )
      .replace(
        'import * as kv from "./kv_store.tsx"',
        "const kv = globalThis.__studioKv",
      )
      .replace(
        '"./authorization.mjs"',
        JSON.stringify(url("../supabase/functions/server/authorization.mjs")),
      )
      .replace('"./audio-routes.tsx"', JSON.stringify(encode(audioSource)))
      .replace(
        '"./project-routes.ts"',
        JSON.stringify(url("../supabase/functions/server/project-routes.ts")),
      )
      .replace(
        '"./voice-lab-routes.mjs"',
        JSON.stringify(
          url("../supabase/functions/server/voice-lab-routes.mjs"),
        ),
      )
    const { default: app } = await import(encode(source))
    const root = "/make-server-bd5da494/studio"
    const preflight = await app.request(root + "/projects", {
      method: "OPTIONS",
      headers: {
        Origin: "https://preview.test",
        "Access-Control-Request-Headers": "authorization,apikey,content-type",
      },
    })
    assert.equal(preflight.status, 204)
    assert.ok(
      preflight.headers
        .get("Access-Control-Allow-Headers")
        .toLowerCase()
        .includes("apikey"),
    )
    const request = (path, body, token = "owner-token") =>
      app.request(root + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
        },
        ...(body === undefined
          ? {}
          : { body: body instanceof FormData ? body : JSON.stringify(body) }),
      })
    assert.equal((await request("/projects", undefined, "")).status, 401)
    assert.equal(
      (await request("/voice-lab/bootstrap", undefined, "")).status,
      401,
    )
    assert.equal(
      (await request("/voice-lab/bootstrap", undefined, "other-token")).status,
      403,
    )
    assert.equal((await request("/voice-lab/bootstrap")).status, 200)
    assert.equal(
      (await request("/projects", undefined, "other-token")).status,
      403,
    )
    rows.set("studio:project:foreign:secret", { id: "secret", revision: 1 })
    assert.deepEqual(await (await request("/projects")).json(), {
      projects: [],
    })
    assert.equal(
      (
        await request("/projects/demo", {
          title: "My studio",
          revision: 0,
          tracks: { voice: "foreign" },
        })
      ).status,
      200,
    )
    const list = await (await request("/projects")).json()
    assert.equal(list.projects.length, 1)
    assert.equal(list.projects[0].title, "My studio")
    assert.deepEqual(list.projects[0].tracks, {})
    assert.equal(
      (await request("/projects/demo", { title: "Stale", revision: 0 })).status,
      409,
    )
    const form = new FormData()
    form.set(
      "file",
      new File(
        [
          new Uint8Array([
            0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0,
          ]),
        ],
        "test.mp4",
        { type: "video/mp4" },
      ),
    )
    form.set("kind", "render")
    const uploaded = await request("/projects/demo/media", form)
    assert.equal(
      uploaded.status,
      200,
      JSON.stringify(await uploaded.clone().json()),
    )
    const doc = (await uploaded.json()).project
    assert.ok(
      doc.renderFiles.master.url.startsWith(`https://private.test/${owner}/`),
    )
    assert.equal(files.size, 2, "media and metadata sidecar")
    const created = await (
      await request("/projects/demo/versions", { name: "First" })
    ).json()
    const versions = await (await request("/projects/demo/versions")).json()
    assert.equal(versions.versions[0].name, "First")
    assert.equal(
      (
        await request(`/projects/demo/versions/${created.version.id}/restore`, {
          revision: doc.revision,
        })
      ).status,
      200,
    )
    assert.equal((await (await request("/assets")).json()).assets.length, 1)
    assert.equal((await request("/session")).status, 200)
  } finally {
    globalThis.Deno = oldDeno
    delete globalThis.__studioAdmin
    delete globalThis.__studioKv
  }
})
