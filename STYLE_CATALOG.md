# YT Automation — Catálogo reproducible de estilos y vídeos

Cuando el usuario diga «recrea el estilo X» o «recrea el vídeo Y», consultar este índice y la guía correspondiente antes de escribir una composición nueva. No sustituir un motor existente por una imitación genérica.

| Nombre / alias | ID o familia | Guía durable | Motor |
|---|---|---|---|
| ENBU, danza del fuego | enbu | src/style-guides/enbu.md | art.ts / fireScene |
| BLUE HOUR, lago nocturno | blue-hour | src/style-guides/blue-hour.md | art.ts / blueScene |
| Laboral Clothing, Viste lo que eres | laboral-clothing | src/style-guides/laboral-clothing.md | laboral-scene.ts / LaboralPreview.tsx |
| BRAND STRATEGY, no one tells you | brand-strategy | src/style-guides/brand-strategy.md | EditorialSequence.tsx |
| Discord, Conexiones que se sienten | discord | src/style-guides/discord.md | MotionSequence.tsx |
| Figma, No soy solo una herramienta | youtube-reference-002 / figma | src/style-guides/figma.md | FigmaSequence.tsx |
| Finn, IA por dentro, otros proyectos Finn | finn:<id> | src/style-guides/finn.md | production/FinnSequence.tsx y Store |

Cada vídeo de la galería tiene un apartado «Guía del estilo y receta de este vídeo».
La descarga .md añade ID, nombre, familia, ajustes disponibles, guion, palabras temporizadas, IDs de pistas/renders y datos de escenas Finn. No contiene tokens ni enlaces firmados.
Para un vídeo personalizado, combinar su receta con la versión guardada en Supabase: el estilo no identifica por sí solo una voz o un guion.

## Referencias nuevas
Los dos MP4 suministrados están en `public/references/editing-collage-original.mp4` y `brand-strategy-original.mp4`.
La composición activa es **BRAND v4 / Living editorial**, en `BrandSequence.tsx`; movimiento en `brand-motion-v4.ts`. La revisión actual solicita contraste tipográfico, degradados, diseño y vida dentro de cada plano. Es una reinterpretación deliberada, no una copia 1:1.
`EditorialSequence.tsx` es su entrada y precarga de fuentes. `brand-spec.ts` conserva ID, duración, cortes y aprobación. Salida: 1080 × 1920 / 60 fps. No mezclar el motor WebGL archivado ni autoaprobar escenas como 9/10 por pasar los tests.
El busto deriva de geometría CC0 de Rico Cilliers / Poly Haven; el resto de objetos es procedural o vectorial. Procedencia: `assets/editorial-models/ATTRIBUTION.md`.
Las referencias no se reproducen como fondo de la recreación. Sus fuentes/modelos/keyframes originales no están disponibles: no anunciar igualdad 1:1 certificada.
Render: `PORT=3000 node --experimental-strip-types scripts/render-editorial.mjs brand-strategy`.
Revisión actual: `PORT=3000 node scripts/brand-v4-review.mjs`.
Informe de dirección de arte y estado de aprobación: `docs/brand-reference-review.md`.

## Retirado por petición del usuario
EDITING (`editing-collage`) no aparece en galería ni selector y no se registra como composición activa.
Se conservan datos y archivos históricos para no destruir versiones privadas; no deben reinsertarse desde Supabase ni convertirse silenciosamente a ENBU.
`EditorialLegacySequence.tsx` y `EditorialWebGLLegacy.tsx` conservan código histórico, no la implementación activa.

## Recuperación de la interfaz
La vista editorial y las guías se cargan de forma aislada. `PreviewBoundary.tsx` contiene fallos de esas vistas sin vaciar el workspace.
Comprobar arranque real: `PORT=3000 node scripts/app-smoke-browser.test.mjs`.
Comprobar que la reproducción espera a los recursos: `PORT=3000 node scripts/visual-readiness-browser.test.mjs`.

## Captions del MP4 final
`src/media/caption-frames.tsx` rasteriza `production/Captions.tsx`, el mismo motor de la vista previa, con fuente local y tiempos del proyecto.
`media/mux.ts` superpone la secuencia transparente y recodifica H.264/AAC cuando están activadas. Sin captions puede copiar el vídeo para la mezcla de audio.
La base, el final con captions y una unión local MP4+MP3 son operaciones distintas y deben estar identificadas como tales.
