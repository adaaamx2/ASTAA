# ENBU — La danza del fuego

## Identidad y recuperación
- ID estable: `enbu`. Composición Remotion: `Study-Enbu`.
- Petición reutilizable: «Recrea el estilo ENBU: danza de katana, fuego procedural y sol incandescente; conserva el encuadre y la coreografía».
- Referencia conservada: `public/references/enbu-original.mp4`.
- Fuente editable: `src/motion-lab/art.ts` (`fireScene`, `swordEnergy`), `StudyCanvas.tsx`.
- Registro, narración y prompt de SFX: `src/motion-lab/studies.ts`.

## Formato y composición
1920 × 1292, 18 s, 60 fps. Coordenadas internas 960 × 646. Escena horizontal cinematográfica; figura articulada en el centro, sol circular enorme detrás, suelo oscuro, espada luminosa y estelas que describen arcos.
Negros cálidos, naranja, ámbar y crema. El fondo debe permanecer oscuro para que el filo sea el punto de máxima luminancia. No convertirlo en una interfaz ni añadir tarjetas.

## Capas
Fondo y halo solar; geometría de armadura y articulaciones; cuerpo y espada; energía de cada corte; estelas; chispas y brasas; atmósfera; captions independientes.
Las partículas y el ruido son deterministas. Mantener las mismas semillas al reproducir una versión.

## Movimiento
La coreografía depende del tiempo global, no de animaciones CSS. Usar las funciones originales para reproducir poses, fases y energía; no sustituir la secuencia por una imagen con zoom.
El arco del filo, la rotación de hombros/brazos y las brasas deben reaccionar al mismo golpe. La cámara no debe recortar la espada.
Para la partitura exacta, leer las fases y constantes de `fireScene` y `swordEnergy`; sus ecuaciones son la fuente de verdad, no una descripción aproximada.

## Texto, voz y captions
El guion inicial está en `studies.ts`; cada proyecto puede sustituirlo. Las captions usan `Captions.tsx`, Manrope Variable 800, tamaño y zona segura calculados a partir del viewport. Acento de captions: `#ffd18a`.
Packs: pop, karaoke, kinetic, comic. La voz real manda sobre el reloj. Si ElevenLabs devuelve palabras alineadas, conservar `start`, `end`, `sceneId` y `source`. Un timing estimado debe seguir identificado como estimado.

## Sonido
Atmósfera procedural en `public/exports/study-enbu-atmosphere.wav`: fuego, crepitaciones y whooshes. No es audio generado por ElevenLabs.
La voz, SFX generados y música de un proyecto son pistas privadas independientes. No inventar voces ni reutilizar enlaces firmados caducados.

## Exportación
Base: `public/exports/study-enbu.mp4`. Generador nativo: `scripts/render-studies.mjs`.
El MP4 final de Motion Lab mezcla las pistas activas y, si captions está activado, rasteriza el componente real por fotograma y lo integra en el vídeo. El botón de base está identificado como sin captions ni voz personalizada.
Exportar captions requiere recodificar; conservar resolución, reloj, zona segura y pack. No confundir un .srt aparte con captions grabadas.

## Cambios permitidos y control
Se pueden cambiar voz, guion, captions y pistas sin alterar la identidad visual. Si cambia la coreografía o la paleta, guardar una versión con nombre.
Revisar inicio, tres cortes, final, duración del audio, clipping, caracteres acentuados, sincronía y presencia de captions en el archivo descargado, no solo en la interfaz.
La referencia y el estudio procedural no son idénticos píxel a píxel: no anunciarlo como una copia 1:1 verificada.
