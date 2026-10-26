# FINN — Explicación ilustrada

## Recuperación
Familia `finn`; cada vídeo tiene ID `finn:<project.id>`. Composiciones `Finn-pop`, `Finn-karaoke`, `Finn-kinetic`, `Finn-comic`.
Petición: «Recrea el estilo Finn: personaje ilustrado, fondo de papel crema, trazos verde tinta, explicaciones por escenas y captions animadas».
Fuente de verdad por vídeo: `src/production/data.ts` y el Store del proyecto; motor `FinnSequence.tsx`; personaje `Frames.tsx`; editor `Workspace.tsx`.
El apartado del vídeo añade el guion y los ajustes actuales a esta guía, para no confundir vídeos distintos que usan el mismo personaje.

## Formato y composición
ViewBox 540 × 960. Salida habitual 1080 × 1920 y 60 fps; las variantes exportadas disponibles están en `public/exports/finn-animatics.json`.
Fondo papel crema `#f2eddf`, tinta `#183738`, lima `#c3ef67`. Retícula tenue de 36 unidades, gradiente radial suave y formas ambientales. Manrope Variable para tipografía.
Mantener personaje, proporciones, contornos y poses; no reemplazarlo por un avatar nuevo.

## Guion y escenas
Cada escena tiene `id`, `title`, `start`, `end`, `voice` y `visual`.
El índice se selecciona con tiempo global. El texto y los límites temporales viven en los datos, no en el nombre del estilo.
El proyecto inicial «IA por dentro» contiene explicación de tokens, números, atención, siguiente pieza y repetición; no usar ese guion en todos los vídeos nuevos.
La biblia, canales y referencias del Store son parte de la identidad editorial de la cuenta.

## Movimiento
Tiempo local `t = time - scene.start`; entrada ease-out, pequeño bob continuo, cámara con deriva y zoom moderados. Pose point/think/wave según escena.
Las captions no reinician su reloj con un corte. El personaje y los diagramas se determinan por frame; nada aleatorio sin semilla ni animación CSS autónoma en render.

## Captions y tipografía
`Captions.tsx`, Manrope Variable 800. Packs activos: pop (una palabra, rebote), karaoke (grupos de tres y progreso), kinetic (palabra grande y frase), comic (grupos de cuatro y bocadillo).
`timing.ts` agrupa por longitud, puntuación y silencios. `provider-character-alignment` indica alineación real; `estimated` sigue siendo una estimación.
Preservar tamaño, acento, pack y palabras temporizadas al guardar una versión.

## Voz, SFX, música y versiones
ElevenLabs se solicita desde Supabase con secreto de servidor; nunca incluir una API key en un .md.
Los archivos se referencian por IDs de Storage. Volver a firmar al recuperar; no usar un enlace firmado como única fuente.
Las versiones manuales conservan el Store asociado, ajustes y referencias a pistas, y la restauración hace backup local antes de sustituir datos.
Los audios existentes no se regeneran por cambiar fuente o captions.

## Render y límites
Renderizador `scripts/render-finn.mjs`. Los MP4 `finn-*-animatic-1080.mp4` son renders de los datos usados al generarlos; no se actualizan mágicamente cuando se edita un guion.
Los SRT/VTT «estimated» están nombrados expresamente como estimados. La unión local MP4+MP3 no vuelve a renderizar la animación ni añade captions editadas: para ellas se requiere un render de las escenas con los nuevos datos.
Verificar que el render corresponde a la versión de guion/fuente/voz elegida antes de darlo por final.

## QA
Revisar todas las escenas y sus cortes; palabras completas; bocadillos dentro de zona segura; personaje no recortado; duración del último `end`; sincronía real con audio; versiones recuperables; archivo exportado reproducible.
Conservar datos exactos y composición para reproducir un vídeo concreto, y usar esta guía como gramática para nuevos vídeos de la familia.
