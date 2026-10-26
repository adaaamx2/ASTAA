# DISCORD — Conexiones que se sienten

## Identidad y recuperación
ID `discord`, composición `DiscordMotion`, 1080 × 1920, 60 fps, 10 segundos.
Petición: «Recrea el estilo Discord — Conexiones que se sienten: violeta profundo, tipografía cinética, logo metálico y transiciones de cámara».
Fuente: `src/MotionSequence.tsx`; editor `src/DiscordStudio.tsx`; composición `src/remotion/Root.tsx`. Render `public/exports/discord-motion.mp4`.

## Diseño
Fondo radial de violeta brillante a berenjena `#100b23`, texto crema/lavanda, acentos lima `#d8ff9b`, metal en logo y cifras. Fuente del proyecto: Manrope Variable, titulares 800. ViewBox 1080 × 1920.
Logo vectorial Discord, elipses orbitales, anillos y gráfica de barras. La tipografía tiene escala monumental y se mueve por letra; no colocar texto como captions genéricas cuando forma parte de la composición.

## Estructura temporal
Cuatro escenas de 2.5 s. Inicio: logo, «NO ES UN CHAT.» que deja paso a «ES TU LUGAR.».
Segundo bloque: 200+ millones y conectividad. Los bloques posteriores y sus textos exactos están en las ramas `scene === 2` y `scene === 3` de `MotionSequence.tsx`; ese código es el guion visual ejecutable.
Tiempo global `time`, tiempo local `t`, easing de salida de 380 ms, cámara con zoom/rotación, flashes cortos. Letras con desfase de 28 ms y entrada tipo spring.
Las cifras del vídeo son contenido editorial del proyecto original; no presentarlas como estadísticas actualizadas sin verificar.

## Capas
Gradiente, órbitas, cámara, logo, titulares, métricas, trazos, partículas/formas secundarias y transición. Los SVG deben conservar sus IDs/gradientes al renderizar.
Mantener `MotionSequence` como motor común de preview y Remotion.

## Audio y captions
No asumir que el archivo base contiene voz personalizada. Las pistas que se asocien al proyecto son independientes.
Los títulos del SVG ya se incluyen en el render nativo. Si se añaden captions de voz, deben renderizarse además; no confundir el título editorial con subtítulos alineados.
La herramienta local MP4 + MP3 solo sustituye/mezcla audio: no recompone textos ni quema captions nuevas.

## Render y QA
Comando oficial: `pnpm video:render`. Still: `pnpm video:still`.
Verificar escenas en 0, 2.5, 5 y 7.5 s; ausencia de letras cortadas; continuidad de zoom; lectura móvil; logo correcto; dimensiones; audio solicitado.
Guardar versión antes de cambiar contenido, voz, fuente, tiempos o paleta.
Para una reproducción exacta de este proyecto, reutilizar el código y sus constantes, no inferirlo de una miniatura.
