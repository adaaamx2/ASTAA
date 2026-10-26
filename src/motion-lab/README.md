# Motion Lab: voices, authorization and synchronization

## Voice selection

`GET /studio/voices` is the connected ElevenLabs account's catalog, not the
entire public library. The UI supports name/ID/accent search and explicit
metadata categories; Spanish alone is never labeled as a Spain accent.

`GET /studio/voices/:id` retrieves an accessible voice and its existing
`preview_url`. This is a read-only provider request, not TTS. Some private,
inaccessible or plan-restricted voices cannot be used; some voices have no
public preview. The UI never generates paid speech to substitute for a
missing free sample. A paid fixed-phrase test is separately labeled and
requires explicit authorization.

Do not put an API key into the Voice ID field. Provider credentials are
read only from `ELEVENLABS_API_KEY` on the Supabase server.

## Why the old owner error occurred

Connecting a Supabase project and storing a provider key do not authorize
an application user to spend provider credits. The previous error combined
missing/expired authentication with a signed-in account lacking owner rights.

`GET /studio/session` now distinguishes these states before paid controls
are enabled. The server still validates every generation separately.
Only a verified Supabase user matching `STUDIO_OWNER_USER_ID` or having
server-assigned `app_metadata.studio_owner=true` is allowed. Public keys,
anonymous accounts and editable `user_metadata` cannot authorize billing.

### One-time account approval

1. Deploy/redeploy the current `server` Edge Function from Make settings.
   Its health response identifies `motion-studio-v2`; status has `version: 2`.
2. Sign in to the application using a Supabase Auth account.
3. If permission is pending, the UI offers **Copiar SQL para autorizar mi cuenta**.
   It uses only that verified session's validated UUID.
4. The project administrator executes this SQL in the linked Supabase SQL
   Editor, then the user clicks **Comprobar permisos de mi sesión**.

The application does **not** execute authorization SQL or promote the first
visitor. The agent has no Supabase management token/SQL capability in this
environment and cannot grant live permissions or publish the Edge Function.
No provider key needs to be pasted into chat or the browser for this setup.

The Supabase user access token is scoped to the current browser tab using
sessionStorage; expired sessions return to login. Passwords are not persisted.

## Sync verification

The voice media element's `currentTime` is the playback clock. A buffering
or paused voice does not leave captions advancing on a separate wall clock.
After the voice ends, the visual study may finish its remaining tail.
Sound effects are paused/resynchronized with voice playback.

`verifySync` checks the original transcript, real provider timing source,
finite/ordered timestamps, and bounds against the **decoded audio duration**.
The preview samples observed audio-versus-render-clock drift and warns above
80 ms. The report is downloadable without tokens or signed URLs.

These are technical checks, not speech recognition or a substitute for
listening. Start/middle/end review controls and an explicit human confirmation
are provided; technical success never automatically marks auditory review done.
Estimated cues cannot pass as verified provider alignment. Short caption holds
prevent flashing between real spoken-word gaps without activating future words.

## Checks

```sh
pnpm exec tsc --noEmit
node --experimental-strip-types --test scripts/voice-access-sync.test.mjs scripts/elevenlabs-provider.test.mjs scripts/studio-transport.test.mjs scripts/production.test.mjs
PORT=3000 node --experimental-strip-types scripts/voice-workflow-browser.test.mjs
PORT=3000 node --experimental-strip-types scripts/voice-catalog-browser.test.mjs
pnpm run build
```

Browser workflow tests use intercepted Supabase responses and a local silent
WAV fixture with byte-range support. They validate authorization gates, free
sample behavior and the media clock; they do not claim a paid provider request
or an auditory review of real generated narration.
