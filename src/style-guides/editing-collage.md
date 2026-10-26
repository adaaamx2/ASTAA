# EDITING — Kinetic editorial collage

## Identidad
- ID estable: `editing-collage`; composición: `Study-EditingCollage`.
- Petición futura: «Recrea EDITING: papel casi plano, grotesca negra y topo, objetos 3D procedurales e ilustración anatómica vectorial, cámara continua y montaje tipográfico».
- Adjunto de origen: `fe4187df-1129-4442-9b9f-33f305f6a500`.
- Original conservado en `public/references/editing-collage-original.mp4`.
- Referencia medida: 442 × 780, 60 fps, 1093 fotogramas, 18.216667 s; H.264 y AAC estéreo.
- Motor activo v3: `src/motion-lab/EditorialSequence.tsx`; modelos: `editorial/models.ts`; render WebGL: `editorial/Stage3D.tsx`; partitura estable: `editorial-timeline.ts`; curvas: `editorial-motion.ts`; registro: `studies.ts`.

## Lenguaje visual
Salida nueva: **1080 × 1920, 60 fps**, 18.216667 s. Blanco papel casi plano `#fafaf9`, negro `#0a0b0c` y topo `#a39991`; azul solo para diana y acentos. Se elimina la viñeta radial gris de v1. Las sombras pertenecen a los objetos, no son bandas de gradiente detrás de la página.
Tipografía local: **Inter Variable 800** para titulares y 500–700 para apoyo. Sin Arial, sin deformar glifos con `textLength`, sin fuentes de red. Dos niveles de texto con tracking óptico.
Los objetos se renderizan en 3D por fotograma: multitud extruida, interfaces, diana, aluminio arrugado, labios, cámara, manos, pétalos curvos, reloj, retrato escultórico y ojos con iris radial generado. El grabado anatómico es SVG original. No se usan los recortes raster de v1 ni los PNG intermedios de v2.
Coordenadas nativas 1080 × 1920. Jerarquía por palabra: mucho blanco, un objeto principal, título y anotación.

## Partitura / segundos
| Inicio | Fin | Escena |
|---|---|---|
| 0 | 1.25 | Multitud de siluetas que emerge desde abajo |
| 1.25 | 2.65 | EDITING / is a skill, cuatro pantallas en los bordes |
| 2.65 | 4.65 | while it's, entrada lateral de diana azul con flecha |
| 4.65 | 6.65 | the art of using the / right graphics; cuadrícula de cuatro recortes |
| 6.65 | 8.55 | Ventana de After Effects inclinada |
| 8.55 | 10.1 | the knowledge of / design; cuadro floral turquesa |
| 10.1 | 11.65 | human / psychology; cráneo anatómico |
| 11.65 | 13.55 | along with hours of / work; reloj y [put in] |
| 13.55 | 15 | combine / to create |
| 15 | 16.55 | astonishing – / masterpiece; retrato escultórico enmarcado |
| 16.55 | 18.216667 | Fondo negro, that appeals to / human eye, dos ojos |

La tabla es el montaje reconstruido a partir de muestras; las constantes de `editorialScenes` y los keyframes son editables. No tratar estos límites como detección automática perfecta de cada corte de la referencia.

## Movimiento
Reloj global `time`. Curva quintic smootherstep con velocidad y aceleración nulas en ambos extremos. Las escenas vecinas conviven durante 640 ms, ±320 ms alrededor del límite. No hay desaparición a blanco antes de entrar al siguiente plano.
Montaje v2: profundidad, paneo, zoom de enlace, zoom de interfaz, paneo, cámara vertical, paneo, rack de foco, profundidad e iris a negro. No repetir el mismo slide en todos los cortes.
El texto se revela por líneas enmascaradas con desfase, ligado al mismo reloj. Los objetos tienen giro 3D, entrada en profundidad y trayectorias secundarias. Sin timers CSS ni ruido aleatorio por frame.
Las pantallas quedan en periferia y dejan el centro al título. Mantener profundidad con tamaño, luz de estudio, giro y superposición; sombras discretas y consistentes.

## Assets y procedencia
El motor activo genera geometría, superficies de revolución, extrusiones, materiales PBR, mapas de interfaz y fibras del iris con **Three.js**, en `editorial/models.ts`. `Stage3D.tsx` construye la luz de estudio y el entorno de reflejos por código; usa ACES, antialias y cámara ortográfica. Los iris se proyectan sobre una superficie curva, no detrás del ojo. Los pétalos tienen curvatura, dos capas y estambres.
Excepción documentada: el retrato escultórico usa **Marble Bust 01 / Rico Cilliers / Poly Haven, CC0**, con material negro, normal map y luz nuevos. Geometría y normal local: `public/references/editorial-geometry/`. No se presenta ese escaneado ni su normal map como modelado propio. Procedencia en `assets/editorial-models/ATTRIBUTION.md`.
Los masters Blender `editorial-generated-v2/` y los recortes `editorial-assets/` se conservan como historial, pero **no son imágenes usadas por el motor activo**. La revisión exige cero elementos SVG `image`, geometría WebGL visible y fuentes locales cargadas. El cráneo fallido se sustituyó por `AnatomicalEngraving.tsx`.
Masterpiece usa una reinterpretación escultórica, no una copia de la Mona Lisa. Es una pieza nítida nueva, no una ampliación del MP4 ni una imagen de un servicio de IA.

## Audio, captions y exportación
El render base reconstruido es visual; la pista original puede conservarse separada para comparación. No llamarla SFX de ElevenLabs ni generar audio facturable automáticamente.
La narración de `studies.ts` es una adaptación, no una transcripción auditiva certificada. El proyecto puede generar otra voz y recibir alineación real.
Las captions adicionales son independientes de los títulos de diseño. Si se activan, se graban en el MP4 final mediante `Captions.tsx`; se pueden cambiar de pack sin borrar los textos de escena.
Render base a 60 fps: `Study-EditingCollage`. La exportación final conserva los fps del artefacto también con captions; ambos usan reloj global y pack seleccionado.

## Criterio de fidelidad
Comparar 0.96, 1.87, 3.69, 6.43, 7.34, 9.16, 10.98, 12.8, 14.62, 15.53 y 17.36 s. Verificar tamaño de títulos, orden de objetos, espacios, máscaras y entrada/salida.
`scripts/editorial-visual-review.mjs` genera una hoja de todos los planos y muestras de cada transición; `editorial-motion.test.mjs` comprueba curvas, límites y variedad de cámara. Rúbrica artística: `docs/editorial-v2-review.md`.
No es una copia píxel a píxel: las piezas son nuevas y algunos objetos reinterpretados. La nota artística del informe es autoevaluación de acabado, no medición externa ni garantía de fidelidad literal. Revisar el MP4 nativo, no solo las hojas de contacto.
