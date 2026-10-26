# Discord motion — Remotion export

The export uses the same `src/MotionSequence.tsx` animation as the web preview,
driven by Remotion's frame number rather than a realtime clock. No screen recording,
preview controls, or studio chrome is included.

## Render an MP4

Install dependencies with `pnpm install`, then run:

```sh
pnpm run video:render
```

Output: `public/exports/discord-motion.mp4`

After rendering, use **Descargar MP4** below the app's preview to download the
file. This downloads the most recent render; after changing the animation, run
the render command again to update it.

- 1080 × 1920, vertical 9:16
- 10 seconds, 60 fps / 600 frames
- H.264, yuv420p, CRF 18
- Silent, matching the original animation
- Bundled Manrope font; no Google Fonts request during rendering

The first render may download Remotion's Chrome Headless Shell. Rendering needs
Node.js, network access for that initial download, and Chrome's Linux system
libraries when running on Linux.

## Preview and edit locally

```sh
pnpm exec remotion studio src/remotion/index.tsx
```

Use this on your own machine; the Figma Make preview server is separate and does
not need to be restarted. Select `DiscordMotion`. You can also use Remotion
Studio's render dialog to choose an output.

## Render one frame

```sh
pnpm run video:still
```

Output: `public/exports/discord-motion.png` (frame 105 / 1.75 seconds).

## Other outputs

```sh
pnpm exec remotion render src/remotion/index.tsx DiscordMotion out/discord.webm --codec=vp9
```

For 30 fps, change both `fps` to `30` and `durationInFrames` to `300` in
`src/remotion/Root.tsx`. Timing remains ten seconds.

Remotion's licensing terms may apply depending on your organization and usage.
