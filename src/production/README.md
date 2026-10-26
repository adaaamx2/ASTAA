# Finn Lab — current implementation

The default route opens Finn's **full seven-scene interactive animatic**, not the
old conceptual-frame gallery. ElevenLabs is deferred by the user's latest
instruction: opening or playing the project does not contact the provider.
There is no substitute synthetic voice, browser credential input or paid call.

## Playback and files

- `FinnSequence.tsx` is a pure time-based vector composition used by both the
  browser and four Remotion compositions: `Finn-pop`, `Finn-karaoke`,
  `Finn-kinetic`, `Finn-comic`. Duration: **57 seconds, provisional**, at 60 fps.
- The exact original narration is seven scenes / 127 words. Its SHA256 is
  protected by `scripts/production.test.mjs`. No speech was rewritten.
- The preview has play/pause, seek, restart, scene navigation and all four packs.
- `timing.ts` generates explicitly **estimated** words and real SRT/VTT files;
  these are not provider alignment. SRT/VTT cannot preserve animation.
- The original Finn model sheet is archived in
  `public/references/finn-model-sheet.png`; ownership/licensing is not verified.
- Discord and Figma retain their existing editor routes and MP4 files. They
  are directly linked in the workspace sidebar and through `#library`.

## Persistence and recovery

`data.ts` migrates schema 1 to schema 2, preserving editable narration and
historical versions. Before migration, the browser keeps the original in
`yt-production-workspace-v1-before-v2`. Music/SFX are removed from active models,
tracks and controls; retired subtitle packs remain historical, not active.

An invalid saved document is **not overwritten** with seed data: automatic save
is blocked, a recovery notice is shown, and the original can be downloaded.
Explicit import saves another dated backup before replacing the active document.

Persistence is still browser localStorage with JSON export/import. It is **not**
a shared server project repository, cloud memory or multi-device synchronization.
The last selected channel and video are restored on reload, with validated
fallbacks when a selection no longer exists.

## Reproducible verification and rendering

```sh
node --experimental-strip-types --test scripts/production.test.mjs
PORT=3000 node --experimental-strip-types scripts/workspace-browser.test.mjs --require-exports
pnpm exec tsc --noEmit
pnpm run build
pnpm run format <changed-files>

# Four complete silent 1080p60 animatics, technical validation and manifest:
node --experimental-strip-types scripts/render-finn.mjs

# Optional native 4K60 and downscaled 1080p60 chain, substantial runtime:
node --experimental-strip-types scripts/render-finn.mjs --4k

# Render an exported browser document rather than repository seed settings:
node --experimental-strip-types scripts/render-finn.mjs --project /tmp/workspace.json --video ia-por-dentro
```

The script verifies dimensions, fps, all 3420 frames, duration, no audio track,
complete decoding and file hashes before atomically publishing a download.
It reuses outputs only when document settings and verified hashes match.
Completed partial files also have private checkpoints so a failed validation can
resume without recapturing the video. Cancellation preserves verified outputs.
For `--4k`, 1080p outputs are reduced from the actual native 4K file, not upscaled.
The UI labels repository renders separately when browser edits differ.

Finn-specific `remotion.config.ts` limits x264 threads to fit workspace memory;
it does not change the archived Discord/Figma render settings. A native 4K
one-second preflight succeeded after correcting the encoder memory issue.
That is **not** evidence that all full-length 4K exports have been produced.

## Not finished / must not be advertised as finished

- No recorded/generated narration, measured voice timing, alignment or RMS mouth
  animation. The mouth deliberately does not simulate speaking without audio.
- This is an animated vector **animatic**, not the fully directed/approved final
  rig, camera choreography or seven complete editable LifeSheets in the plan.
- Full multimodal QA, audio review, calibrated motion detection, alpha overlays,
  the shared server project/worker system and authenticated Anthropic generation
  are not complete. No fake approval or successful chat generation is displayed.
- Technical validation is not visual approval. Artifacts remain “needs review”.
- The existing global Google Fonts import can fail TLS in the test browser;
  Finn uses the installed local Manrope font and does not rely on that request.

## Credential safety

A misnamed tracked environment file contained a credential-like value. Its exact
contents were backed up in `.production/private/` with mode 0600 and the tracked
working-tree file was sanitized without printing the value. Git history was not
rewritten: the previously committed credential must be rotated before reuse.
Vite now denies environment-file variants and `.production/` files, including
raw requests; HTTP 403 checks verify these guards. No provider requests were made.

The host supervises Vite; do not start a second development server. The active
host preview was observed on port 3000 (the scaffold's 8443 is only a default).
