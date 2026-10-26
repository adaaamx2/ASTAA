export function validProjectId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9:_-]{1,160}$/.test(id)
}
export function projectKey(user, id) {
  if (!validProjectId(id))
    throw Object.assign(new Error("Proyecto no válido."), { status: 400 })
  return `studio:project:${user}:${id}`
}
export function cleanProjectPatch(body) {
  if (!body || typeof body !== "object") throw new Error("Proyecto no válido.")
  const patch = {}
  for (const key of ["title", "kind", "template", "text", "settings"])
    if (body[key] !== undefined) patch[key] = body[key]
  for (const key of ["title", "kind", "template", "text"])
    if (patch[key] !== undefined && typeof patch[key] !== "string")
      throw new Error("Metadatos no válidos.")
  if (
    patch.title?.length > 200 ||
    patch.text?.length > 10000 ||
    JSON.stringify(patch).length > 4_000_000
  )
    throw new Error("El documento supera el tamaño admitido.")
  return patch
}
export class ProjectRepository {
  constructor(store, sign) {
    this.store = store
    this.sign = sign
  }
  async raw(user, id) {
    return await this.store.get(projectKey(user, id))
  }
  async asset(user, id) {
    if (!/^[a-f0-9]{64}$/.test(id || ""))
      throw new Error("Referencia de archivo no válida.")
    let record = await this.store.get(`studio:asset:${user}:${id}`)
    if (!record && this.store.recoverAsset) record = await this.store.recoverAsset(user, id)
    if (!record || !record.path?.startsWith(`${user}/`))
      throw new Error("El archivo no pertenece a esta cuenta.")
    return record
  }
  async load(user, id) {
    const doc = await this.raw(user, id)
    if (!doc) return null
    const media = {}
    const issues = []
    for (const [kind, assetId] of Object.entries(doc.tracks || {})) {
      try { media[kind] = await this.sign(await this.asset(user, assetId)) }
      catch (error) { issues.push({ kind, assetId, code: error.code || "asset_unavailable", message: error.code ? error.message : "No se pudo recuperar esta pista. Las demás se conservan." }) }
    }
    const renders = {}
    for (const [variant, assetId] of Object.entries(doc.renders || {})) {
      try { renders[variant] = await this.sign(await this.asset(user, assetId)) }
      catch (error) { issues.push({ kind: `render-${variant}`, assetId, code: error.code || "asset_unavailable", message: error.code ? error.message : "No se pudo recuperar este render. Las demás pistas se conservan." }) }
    }
    const generation = media.voice
      ? {
          voice: media.voice,
          sfx: media.sfx || null,
          music: media.music || null,
          text:
            doc.text ||
            media.voice.text ||
            media.voice.words?.map((word) => word.text).join(" ") ||
            "",
          timingSource: media.voice.timingSource || "unavailable",
          status: "restored-needs-listening",
        }
      : null
    return { ...doc, media, renderFiles: renders, generation, issues }
  }
  async save(user, id, patch, revision) {
    const key = projectKey(user, id),
      old = await this.store.get(key)
    const expected = old?.revision || 0
    if (revision !== undefined && revision !== expected)
      throw Object.assign(
        new Error(
          "Este proyecto cambió en otro equipo. Recarga la copia de la nube antes de sobrescribirla.",
        ),
        { status: 409 },
      )
    const next = {
      ...(old || {
        id,
        tracks: {},
        renders: {},
        createdAt: new Date().toISOString(),
      }),
      ...patch,
      revision: expected + 1,
      updatedAt: new Date().toISOString(),
    }
    if (old && this.store.set)
      await this.store.set(
        `studio:project-history:${user}:${id}:${expected}`,
        old,
      )
    if (!(await this.store.compareAndSet(key, expected, next)))
      throw Object.assign(
        new Error(
          "Otro equipo ha actualizado el proyecto. Se conserva tu copia local.",
        ),
        { status: 409 },
      )
    return next
  }
  async createVersion(user, id, name) {
    const doc = await this.raw(user, id)
    if (!doc) throw Object.assign(new Error("Guarda primero el proyecto."), { status: 404 })
    const version = { id: crypto.randomUUID(), name: String(name || "Versión").slice(0, 120), createdAt: new Date().toISOString(), snapshot: doc }
    await this.store.set(`studio:version:${user}:${id}:${version.id}`, version)
    return version
  }
  async restoreVersion(user, id, versionId, revision) {
    if (!/^[a-f0-9-]{36}$/.test(versionId)) throw new Error("Versión no válida.")
    const version = await this.store.get(`studio:version:${user}:${id}:${versionId}`)
    if (!version?.snapshot || version.snapshot.id !== id) throw new Error("No se encuentra esta versión.")
    const { title, kind, template, text, settings, tracks, renders } = version.snapshot
    return this.save(user, id, { title, kind, template, text, settings, tracks, renders }, revision)
  }
  async attach(
    user,
    id,
    kind,
    assetId,
    info = {},
    variant = "master",
    onlyIfMissing = false,
  ) {
    if (
      !["voice", "sfx", "music", "render"].includes(kind) ||
      !/^[a-zA-Z0-9_-]{1,40}$/.test(variant)
    )
      throw new Error("Tipo de pista no válido.")
    const asset = await this.asset(user, assetId)
    if (asset.kind !== kind)
      throw new Error("El tipo de archivo no corresponde a esta pista.")
    for (let attempt = 0; attempt < 3; attempt++) {
      const old = await this.raw(user, id)
      if (
        onlyIfMissing &&
        (kind === "render" ? old?.renders?.[variant] : old?.tracks?.[kind])
      )
        return old
      const patch = {
        ...info,
        tracks: { ...(old?.tracks || {}) },
        renders: { ...(old?.renders || {}) },
      }
      for (const field of ["title", "kind", "template"])
        if (old?.[field]) patch[field] = old[field]
      if (info.settings)
        patch.settings = { ...(old?.settings || {}), ...info.settings }
      if (kind === "render") patch.renders[variant] = assetId
      else patch.tracks[kind] = assetId
      if (kind === "voice")
        patch.text =
          asset.text ||
          asset.words?.map((word) => word.text).join(" ") ||
          old?.text ||
          ""
      try {
        return await this.save(user, id, patch, old?.revision || 0)
      } catch (error) {
        if (error.status !== 409 || attempt === 2) throw error
      }
    }
  }
}
