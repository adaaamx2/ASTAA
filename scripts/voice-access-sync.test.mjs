import assert from "node:assert/strict"
import { test } from "node:test"
import { studioSession } from "../supabase/functions/server/authorization.mjs"
import {
  callProvider,
  validateAudio,
} from "../supabase/functions/server/audio-provider.mjs"
import {
  voiceCategory,
  ownerGrantSql,
  validVoiceId,
} from "../src/motion-lab/voice-tools.ts"
import { verifySync } from "../src/motion-lab/sync.ts"
import { requestStudio } from "../src/motion-lab/transport.ts"
import { captionAt } from "../src/production/timing.ts"

const uid = "11111111-1111-4111-8111-111111111111"
test("authorization distinguishes missing login and authenticated-but-unapproved accounts", () => {
  assert.equal(studioSession(null).reason, "sign_in_required")
  const pending = studioSession({ id: uid, app_metadata: {} })
  assert.equal(pending.authenticated, true)
  assert.equal(pending.authorized, false)
  assert.equal(pending.reason, "owner_not_authorized")
  assert.equal(studioSession({ id: uid }, uid).authorized, true)
  assert.equal(
    studioSession({ id: uid, app_metadata: { studio_owner: true } }).authorized,
    true,
  )
})
test("public user metadata and anonymous sign-in cannot grant billing access", () => {
  assert.equal(
    studioSession({ id: uid, user_metadata: { studio_owner: true } })
      .authorized,
    false,
  )
  assert.equal(
    studioSession(
      { id: uid, is_anonymous: true, app_metadata: { studio_owner: true } },
      uid,
    ).authorized,
    false,
  )
})
test("the authorization SQL targets exactly one validated, authenticated user ID", () => {
  const sql = ownerGrantSql(uid)
  assert.ok(sql.includes(`where id = '${uid}'::uuid`))
  assert.ok(sql.includes("raw_app_meta_data"))
  assert.equal(ownerGrantSql("'; delete from auth.users; --"), null)
  assert.equal(ownerGrantSql(null), null)
})
test("voice ID validation never accepts a key and bounds are enforced", () => {
  assert.equal(validVoiceId("sk_do_not_put_keys_here"), false)
  assert.throws(() => validateAudio({kind: "voice", voiceId: "", text: "Hola"}), /voz/)
  assert.throws(() => validateAudio({kind: "music", text: "mood", duration: 2}), /3–600/)
})
test("unavailable voice IDs are not mislabeled as an undeployed server", async () => {
  await assert.rejects(
    () =>
      requestStudio(
        { url: "https://example.test/studio", publicKey: "public" },
        "/voices/not-found",
        {
          fetcher: async () =>
            new Response(
              JSON.stringify({
                code: "voice_not_found",
                error: "Ese ID no es accesible con tu cuenta.",
              }),
              { status: 404 },
            ),
        },
      ),
    (error) =>
      error.kind === "response" &&
      error.status === 404 &&
      !error.message.includes("despliega"),
  )
})
test("categorization never infers Spain from Spanish alone", () => {
  assert.equal(
    voiceCategory({ labels: { language: "es" } }),
    "Español · otros o sin acento",
  )
  assert.equal(
    voiceCategory({ labels: { accent: "Mexican", language: "Spanish" } }),
    "Español · otros o sin acento",
  )
  assert.equal(voiceCategory({ labels: { accent: "Castilian" } }), "España")
  assert.equal(voiceCategory({ labels: {} }), "Otros idiomas / sin verificar")
})
const words = [
  {
    text: "Hola,",
    start: 0.1,
    end: 0.6,
    sceneId: 0,
    source: "provider-character-alignment",
  },
  {
    text: "mundo.",
    start: 0.7,
    end: 1.5,
    sceneId: 0,
    source: "provider-character-alignment",
  },
]
test("sync checks use the decoded audio duration, full transcript and actual provider timings", () => {
  const report = verifySync("Hola, mundo.", words, 1.7)
  assert.equal(report.status, "checked")
  assert.ok(Object.values(report.checks).every(Boolean))
  assert.equal(verifySync("Hola, mundo.", words, 0).status, "pending")
  assert.equal(verifySync("Otro guion.", words, 1.7).status, "failed")
  assert.equal(verifySync("Hola, mundo.", words, 1).status, "failed")
})
test("estimated, invalid or unordered cues can never pass technical sync verification", () => {
  assert.equal(
    verifySync(
      "Hola, mundo.",
      words.map((w) => ({ ...w, source: "estimated" })),
      1.7,
    ).status,
    "unverified",
  )
  assert.equal(
    verifySync("Hola, mundo.", [words[1], words[0]], 1.7).status,
    "failed",
  )
  assert.equal(
    verifySync("Hola,", [{ ...words[0], end: Number.NaN }], 1.7).status,
    "failed",
  )
  assert.equal(verifySync("Hola,", [null], 1.7).status, "unverified")
})
test("real inter-word gaps do not flash or restart captions, and future words never activate early", () => {
  const cue = captionAt(words, "karaoke", 0.65)
  assert.equal(cue.active.text, "Hola,")
  assert.deepEqual(
    cue.group.map((word) => word.text),
    ["Hola,"],
  )
  assert.equal(captionAt(words, "karaoke", 0.7).active.text, "mundo.")
  assert.equal(captionAt(words, "pop", 0.65).active.text, "Hola,")
  assert.equal(captionAt(words, "pop", 2), null)
})
