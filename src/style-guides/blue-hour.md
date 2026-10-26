# BLUE HOUR — Un lugar donde no pasa nada

## Recuperación
- ID: `blue-hour`; composición: `Study-BlueHour`.
- Petición: «Recrea BLUE HOUR, el lago nocturno ilustrado, con barca, pato y movimientos pequeños; conserva la calma y la composición».
- Referencia: `public/references/blue-hour-original.mp4`.
- Motor: `src/motion-lab/art.ts`, función `blueScene`; montaje: `StudyCanvas.tsx`.

## Formato e identidad
1080 × 1920, 18 segundos, 60 fps. Coordenadas 540 × 960. Ilustración vertical por planos, no fotografía. Azul profundo, índigo, azul grisáceo y pequeños puntos de luz cálida.
La orilla y la vegetación enmarcan el lago; agua y cielo dejan respirar la escena. Barca, pato y hoja son los detalles narrativos. No introducir tipografía grande sobre la ilustración por defecto.

## Capas y movimiento
Cielo nocturno, fondo lejano, siluetas vegetales, agua y reflejos, orilla, barca, pato, hoja, luces y viñeta.
Movimiento global determinista: ondulación del agua, balanceo de barca, deriva de la hoja y reflejos. Amplitudes pequeñas y curvas suaves. Conservar los períodos y fases de `blueScene`; no convertirlos en movimientos aleatorios entre renders.
El bucle debe sentirse vivo pero no acelerado. La jerarquía es entorno → objetos → detalles; nada debe vibrar como una transición de motion corporativo.

## Guion y audio
Guion inicial y prompt de SFX en `studies.ts`. Voz tranquila y pausada; la elección de Voice ID pertenece al proyecto y no al estilo global.
Atmósfera procedural original: `public/exports/study-blue-hour-atmosphere.wav`, agua suave, crujidos y vegetación. Está identificada como procedural, no ElevenLabs.
Música opcional y propia del proyecto. Mantenerla por debajo de la voz.

## Captions
Componente común `Captions.tsx`, fuente local Manrope Variable 800, packs pop/karaoke/kinetic/comic. Acento azul pálido `#c5e5ff`.
Zona inferior segura, sin ocupar el borde. Se sincronizan con palabras reales cuando están disponibles. No interpretar la narración inicial como tiempos de audio real.

## Exportación y versiones
Base: `public/exports/study-blue-hour.mp4`; generador: `scripts/render-studies.mjs`.
El MP4 final incluye las pistas activas y las captions activadas. El modo con captions rasteriza el mismo SVG de la vista previa, a 30 fps, y recodifica H.264/AAC.
Guardar versiones antes de cambiar voz, guion, pack, música o SFX. Las versiones guardan IDs de archivos, no enlaces firmados como única fuente.

## QA y límites
Comparar encuadre, barca, pato, hoja, ondas y ritmo con el original en varios tiempos. Revisar audio y captions en la descarga.
Es una interpretación procedural previa, no una copia 1:1 demostrada. Mantener la referencia separada y no sustituir la recreación por su reproducción.
