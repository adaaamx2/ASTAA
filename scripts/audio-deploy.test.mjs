import assert from "node:assert/strict"
import { test } from "node:test"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

test("deployment package targets only current project, function and source revision", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/deploy-audio-backend.mjs", "--check"],
    { encoding: "utf8" },
  )
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /ystgyievwiburdycbbrg \/ make-server-bd5da494/)
  const source = readFileSync("scripts/deploy-audio-backend.mjs", "utf8")
  assert.ok(!source.includes("vethkrbhwctkwcsvfnfj"))
  assert.ok(
    source.includes('"app.ts"') && source.includes('"project-routes.ts"'),
  )
})

test("live verification has a network-free configuration check", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/verify-live-audio.mjs", "--check"],
    { encoding: "utf8" },
  )
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /ystgyievwiburdycbbrg.*audio-v6-sfx-prompt-limit/)
})
