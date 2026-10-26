# BRAND STRATEGY v3 — archived reference-calibration pass

## Recuperación
- ID: `brand-strategy`; composición: `Study-BrandStrategy`.
- Petición futura: «Recrea BRAND STRATEGY: tipografía roja oblicua, esculturas negras clásicas, blanco, esquinas orgánicas, interludios negros y collage de contenido».
- Adjunto original: `f6466dac-6809-4e1b-b6f9-a368ce240496`.
- Archivo conservado: `public/references/brand-strategy-original.mp4`.
- Medición: 720 × 1280; 30 fps; 525 fotogramas; 17.5 s de vídeo; audio AAC estéreo hasta 17.513991 s.
- Motor activo v3: `EditorialSequence.tsx`, geometría `editorial/models.ts`, render `editorial/Stage3D.tsx`, partitura `editorial-timeline.ts`, cámara `editorial-motion.ts`.
- Salida nueva: **1080 × 1920, 60 fps**, 17.5 s; no se amplía un MP4 de 720p.

## Dirección visual
Blanco puro `#ffffff`, negro `#000000` y rojo editorial `#a74049`. **Inter Tight Variable 900 italic real**, local, para protagonistas; **Inter Tight 400 italic real** para apoyo. No Arial, no falsa cursiva por skew. Tracking negativo óptico y métricas reales, sin estirar glifos.
No usar lavanda del workspace dentro del vídeo. No convertir las esculturas en pictogramas: el contraste entre figuras clásicas y tecnología forma parte del estilo.
Composición nativa 1080 × 1920. Titulares arriba; objeto protagonista abajo, cruzando intencionalmente silueta y letras. Amplios márgenes; sin viñetas grises ni degradados de relleno.

## Capas
Fondo; esquinas negras orgánicas; texto secundario; texto rojo por palabras; escultura de estudio; sombras suaves; detalles (barcode, notas, vectores); captions opcionales.
Esquinas con cuatro puntas curvadas, largos lóbulos y centro suave; giran lentamente. En negro pasan a rojo oscuro y desenfoque.
Mallas independientes: escultura negra, rey, reina, teléfono, rig, portátil, escultura tras el portátil e iconos volumétricos. No son recortes ni un montaje de capturas: se iluminan y proyectan por fotograma.

## Partitura reconstruida
| Inicio | Fin | Diseño |
|---|---|---|
| 0 | 2.35 | here's the branding secret; no one / tells / you; estatua delante |
| 2.35 | 5.85 | A brand without a content strategy; is just / posting and / hoping; ajedrez y barcode |
| 5.85 | 7.65 | Negro: and hope is / not a growth plane |
| 7.65 | 11.9 | Every piece of content should; either / attract / new eyes; gimbal; build trust with existing ones |
| 11.9 | 13.6 | Negro: or convert attention / into action |
| 13.6 | 16.3 | Posting randomly does; none of the / three / consistently; portátil e Instagram |
| 16.3 | 17.5 | Avatar circular; Follow for more branding secrets |

Se conserva la grafía visible «growth plane» de la referencia, aunque el sentido habitual sería «growth plan». No corregir silenciosamente un rótulo cuando se solicite fidelidad al original.
El texto de cada escena es contenido de diseño, no una caption automática.

## Movimiento
Tiempo global y curvas quintic C2. Solape de 640 ms. Montaje: paneo al ajedrez, iris negro, iris blanco al móvil, rack de foco, cámara vertical al escritorio y profundidad al cierre.
Entrada escultórica en profundidad, texto por líneas enmascaradas y escalonadas, reina inclinada, móvil con yaw/pitch real y escritorio por capas. Las esquinas rotan suavemente y pasan a rojo oscuro desenfocado en negro.
El iris se aplica tanto al SVG como al fragment shader de los objetos: el plano saliente se recorta por fuera y el entrante por dentro del mismo círculo. En estos enlaces, los fondos mantienen negro/blanco puros. La disolución de foco sí mezcla tonos de forma transitoria, como recurso distinto del iris.
Se conservan tiempos e IDs estables. El motor es puro y determinista; Remotion precarga fuentes y assets. Nunca usar animaciones CSS con reloj distinto del frame.

## Assets, audio y edición
El motor activo usa **Three.js** y objetos creados por código: perfiles torneados del ajedrez, carcasa y pantalla del teléfono, estabilizador articulado, portátil, cámara e iconos. Interfaces generadas mediante Canvas; reflejos de estudio creados localmente. No se cargan fotogramas del MP4 ni PNG de objetos en la composición.
El busto usa **Marble Bust 01 / Rico Cilliers / Poly Haven, CC0**. Se cargan geometría y normal map locales para conservar el detalle; material negro, luces, cámara y animación son del proyecto. Esa geometría **no se declara propia**. Procedencia: `assets/editorial-models/ATTRIBUTION.md`. No se usa un servicio generativo de imágenes.
Los masters Blender de `editorial-generated-v2/` quedan como historial, no como capas del motor actual. Full HD a 60 fps, incluida la exportación con captions.
El base exportado no genera ni factura voz. Guion editable de voz en `studies.ts`; la adaptación no es una transcripción auditiva certificada. La referencia completa permite comparar el audio original.
Voz, música y SFX nuevos se guardan por proyecto. El MP4 final mezcla las pistas activas; las captions opcionales usan los tiempos reales de la voz y se graban dentro de la imagen.

## QA y límites
Comparar 0.93, 1.8, 3.55, 5.3, 7.06, 8.81, 10.56, 12.31, 14.94, 15.81 y 16.68 s.
Comprobar orden de aparición, máscara sobre letras, tamaño de esculturas, posición del barcode, tonalidad de rojo, cambios a negro, móvil y cierre.
Revisión comparada: `PORT=3000 node scripts/brand-reference-review.mjs`. Genera 12 pares al mismo tiempo y tamaño y las seis transiciones en tiras de cinco instantes. Salidas en `.production/brand-reference-review/`.
Informe y bloqueos explícitos: `docs/brand-reference-review.md`. No aprobar un plano solo por compilar ni asignar automáticamente la nota objetivo 9/10.
**No aprobado como 9/10 en todas las escenas.** Persisten diferencias de personaje/pose, contenido de la cámara, figura escribiendo y avatar. No hay herramienta de generación de imágenes expuesta en esta sesión; los assets no se presentan como imágenes generadas por IA.
EDITING se ha retirado del catálogo por petición explícita; no reintroducirlo como otro proyecto al recuperar la nube. Se preservan archivos/versiones históricas, sin destruir pistas privadas.
