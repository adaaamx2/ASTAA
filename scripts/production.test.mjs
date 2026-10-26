import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { test } from "node:test"
import {
  initialStore,
  scenes,
  packs,
  validateStore,
  loadStore,
  loadSelection,
  saveStore,
  storageKey,
  getRecoveryError,
} from "../src/production/data.ts"
import {
  estimateWords,
  subtitleCues,
  subtitleFile,
  activePacks,
  groupWords,
} from "../src/production/timing.ts"

test("the seven-scene narration remains unchanged", () => {
  assert.equal(scenes.length, 7)
  const narration = scenes.map((s) => s.voice).join("\n\n")
  assert.equal(
    createHash("sha256").update(narration).digest("hex"),
    "a1165fb38fc0dbbf892591c7eff4700c773a18d23593a81af52c24caca2af3c2",
  )
})

test("only four subtitle packs are active", () => {
  assert.deepEqual(packs.map((p) => p.id).sort(), [...activePacks].sort())
})

test("estimated fallback is speech-weighted, never advertised as provider sync", () => {
  const words = estimateWords([
    {
      id: 1,
      title: "",
      start: 0,
      end: 4,
      voice: "Y extraordinariamente.",
      visual: "",
    },
  ])
  assert.ok(words[1].end - words[1].start > (words[0].end - words[0].start) * 3)
  assert.ok(words.every((word) => word.source === "estimated"))
})

test("caption grouping is global and does not restart on scene boundaries", () => {
  const words = [
    {
      text: "Cada",
      start: 0,
      end: 0.3,
      sceneId: 1,
      source: "provider-character-alignment",
    },
    {
      text: "pequeño",
      start: 0.3,
      end: 0.95,
      sceneId: 1,
      source: "provider-character-alignment",
    },
    {
      text: "detalle",
      start: 0.95,
      end: 1.5,
      sceneId: 2,
      source: "provider-character-alignment",
    },
    {
      text: "importa.",
      start: 1.5,
      end: 2.1,
      sceneId: 2,
      source: "provider-character-alignment",
    },
  ]
  assert.deepEqual(
    groupWords(words, 3)[0].map((word) => word.text),
    ["Cada", "pequeño", "detalle"],
  )
})

test("reload restores the selected channel/video, with safe fallback for stale IDs", () => {
  const store = structuredClone(initialStore)
  store.channels.push({ ...store.channels[0], id: "second-channel" })
  store.projects.push({
    ...structuredClone(store.projects[0]),
    id: "second-video",
    channelId: "second-channel",
  })
  let preference = JSON.stringify({
    channelId: "second-channel",
    projectId: "second-video",
  })
  globalThis.localStorage = { getItem: () => preference }
  assert.deepEqual(loadSelection(store), {
    channelId: "second-channel",
    projectId: "second-video",
  })
  preference = "null"
  assert.deepEqual(loadSelection(store), {
    channelId: "finn-lab",
    projectId: "ia-por-dentro",
  })
  preference = JSON.stringify({ channelId: "deleted", projectId: "deleted" })
  assert.deepEqual(loadSelection(store), {
    channelId: "finn-lab",
    projectId: "ia-por-dentro",
  })
})

test("v1 migrates without mutating narration, edits or historical versions", () => {
  const old = structuredClone(initialStore)
  old.schema = 1
  old.channels[0].music = "legacy music"
  old.channels[0].sfx = "legacy effects"
  old.projects[0].title = "Mi título"
  old.projects[0].pack = "neon"
  old.projects[0].scenes[0].sfx = "legacy click"
  old.projects[0].versions = [
    {
      scenes: structuredClone(old.projects[0].scenes),
      pack: "neon",
      direction: "comic",
      date: "2026-01-01",
    },
  ]
  const migrated = validateStore(old)
  assert.equal(migrated.schema, 2)
  assert.equal(migrated.projects[0].title, "Mi título")
  assert.equal(migrated.projects[0].pack, "pop")
  assert.equal(migrated.channels[0].music, undefined)
  assert.equal(migrated.projects[0].scenes[0].sfx, undefined)
  assert.equal(migrated.projects[0].versions[0].scenes[0].sfx, "legacy click")
  assert.deepEqual(
    migrated.projects[0].scenes.map((s) => s.voice),
    scenes.map((s) => s.voice),
  )
  assert.equal(old.schema, 1)
  assert.equal(old.channels[0].music, "legacy music")
})

test("estimated cues stay ordered, inside their scene, and preserve Spanish text", () => {
  const words = estimateWords(scenes)
  assert.equal(
    words.map((w) => w.text).join(" "),
    scenes.map((s) => s.voice).join(" "),
  )
  for (const [i, word] of words.entries()) {
    assert.equal(word.source, "estimated")
    assert.ok(word.end > word.start)
    assert.ok(!i || word.start >= words[i - 1].end - 1e-9)
    const scene = scenes.find((s) => s.id === word.sceneId)
    assert.ok(word.start >= scene.start && word.end <= scene.end)
  }
  for (const pack of activePacks) {
    const cues = subtitleCues(scenes, pack)
    assert.equal(
      cues.map((c) => c.text).join(" "),
      words.map((w) => w.text).join(" "),
    )
    assert.ok(subtitleFile(scenes, pack, "vtt").startsWith("WEBVTT\n\n"))
    assert.match(subtitleFile(scenes, pack, "srt"), /00:00:00,000 -->/)
    assert.ok(subtitleFile(scenes, pack, "srt").includes("…"))
  }
})

test("migration keeps a recoverable backup; corrupt storage cannot be overwritten", () => {
  const entries = new Map()
  globalThis.localStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  }
  const old = structuredClone(initialStore)
  old.schema = 1
  const original = JSON.stringify(old)
  entries.set(storageKey, original)
  assert.equal(loadStore().schema, 2)
  assert.equal(entries.get(`${storageKey}-before-v2`), original)
  saveStore(loadStore())
  assert.equal(JSON.parse(entries.get(storageKey)).schema, 2)
  entries.set(storageKey, "{broken")
  const fallback = loadStore()
  assert.ok(getRecoveryError())
  assert.throws(() => saveStore(fallback))
  assert.equal(entries.get(storageKey), "{broken")
  saveStore(initialStore, true)
  assert.equal(getRecoveryError(), "")
  assert.ok([...entries.values()].includes("{broken"))
})
