# Project 002 — Figma / A motion manifesto

- Stable route: `#video/youtube-reference-002` (original catalog id preserved).
- Composition: `FigmaManifesto`, 1080 × 1920, 60 fps, 2160 frames / 36 seconds.
- Animation: `src/FigmaSequence.tsx`; preview: `src/FigmaStudio.tsx`.
- Render: `pnpm run video:render:figma` → `public/exports/figma-manifesto.mp4`.
- No audio. Spanish on-screen narrative; not an official Figma advertisement.
- Art direction: supplied reference images, black/cream/burgundy, halftone,
  perspective, large type, continuous camera movement. Not an exact YouTube recreation.
- Two original procedural SVG illustrations are embedded in the composition.
  These are code-created graphics, not AI-generated images.
- BlurText's staggered opacity / displacement / blur pattern is adapted for a
  deterministic frame clock, inspired by React Bits (MIT + Commons Clause; see `REACT-BITS-LICENSE.md`):
  https://github.com/DavidHDev/react-bits/blob/main/src/content/TextAnimations/BlurText/BlurText.jsx
  No runtime Motion dependency or wall-clock animation is used.
- Manrope is bundled locally for deterministic rendering.

## Reuse in future prompts

Refer to this project number and this document to retain its visual direction.
Each project's component and catalog entry remain independent. No new asset or
reference folder convention is imposed by this implementation.
