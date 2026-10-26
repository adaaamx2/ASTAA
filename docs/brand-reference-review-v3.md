# BRAND STRATEGY v3 — archived comparison report

## Estado

**En revisión, no aprobado como 9/10 ni como copia 1:1.**
El umbral solicitado es 9 por escena; un build correcto no satisface ese umbral.
Las valoraciones artísticas son autoevaluación, no mediciones externas.
EDITING se ha retirado del catálogo, del selector y de las composiciones activas.
No se han borrado archivos o versiones privadas históricas.

## Referencia comprobada

Adjunto: `7c3fb9dc-513a-448c-8d58-8c4dae978ad8`.
Es idéntico, byte a byte, al vídeo guardado en
`public/references/brand-strategy-original.mp4`.

SHA-256: `cfd2818409fdf8ee36a6b962dc7bd22c14c87ef6caf5f73cef3c9d7473d3c682`.
720 × 1280, 30 fps, 17.5 s. El render de la composición es 1080 × 1920 / 60 fps.

## Análisis → solución → aplicación

| Problema observado | Cambio aplicado |
|---|---|
| Titulares con proporción y escala distintas | Ajuste por palabra y por línea contra capturas a igual tamaño; sin deformar glifos |
| Cuerpo de texto demasiado grande en negro | Escala pequeña, dos líneas compactas y contraste del original |
| Titulares de ajedrez entraban varios segundos antes | Se conserva la pausa del original; el texto rojo entra desde 4.56 s |
| La figura aparecía prácticamente colocada desde el primer frame | Entrada críticamente amortiguada desde debajo del encuadre |
| Móvil enorme, cortado por la derecha y nota superpuesta | Reducción, cambio de encuadre y separación de la nota izquierda |
| Esquinas genéricas mal orientadas | Giro corregido y espejo para las esquinas rojas de los interludios negros |
| Texto del portátil con interlineado demasiado abierto | Bloque de tres líneas más compacto y alineado con la referencia |
| Slides, iris y zooms sin correspondencia en el original | Motor dedicado de BRAND: movimientos independientes, pausas y desenfoques cortos |
| Descarga podía servir un render anterior de nube | Verificación del hash de la base y variantes inmutables por hash |

## Revisión pendiente de cierre

`PORT=3000 node scripts/brand-reference-review.mjs` genera:
- doce comparativas de referencia y reconstrucción al mismo tiempo y tamaño;
- seis tiras de transición, con cinco instantes por transición;
- comprobación de fuentes locales, pausa del ajedrez y procedencia de imágenes.

Salidas: `.production/brand-reference-review/`.
Son **42 muestras temporales de cada vídeo**, no una prueba de igualdad píxel a píxel.

## Bloqueos de fidelidad que NO se dan por resueltos

1. **Personaje inicial:** el original es un hombre barbado, musculado y pensante,
   con mano en la boca y torso completo. El master disponible es un busto romano.
   No es el mismo asset; cambiar tamaño, iluminación o interpolación no lo arregla.
2. **Cámara:** el dispositivo es un render propio, pero el live view no contiene
   la escena cálida con personas del original. No se presenta como si la contuviera.
3. **Portátil:** el original muestra una figura completa sentada, con brazos y
   manos escribiendo. Colocar un busto detrás de un portátil no reproduce esa pose.
4. **Avatar:** se conserva la composición circular/neón, pero la identidad y la
   fotografía del original no son el retrato escultórico disponible.

No hay una herramienta de generación de imágenes expuesta en esta sesión.
Los recursos actuales son renders y vectores programáticos; el busto deriva de
geometría CC0 atribuida. No se sustituye esa limitación por recortes del vídeo
ni se afirma que se hayan generado imágenes mediante IA.

## Especificación de reemplazo de assets

- **Hero:** figura masculina clásica negra, pelo y barba rizados, pecho/torso
  completo, índice apoyado cerca de labios, vista 3/4 izquierda; luz suave lateral,
  sombra consistente y alpha limpio. Cabeza y mano deben tapar parte de “tells/you”.
- **Escritorio:** mismo personaje, sentado mirando hacia la derecha y abajo,
  antebrazos y dedos sobre teclado; luz de acento roja tenue y anatomía coherente.
- **Live view:** una escena original cálida con personas, integrada en la
  perspectiva de la pantalla; sin reutilizar píxeles de la referencia.
- **Avatar:** retrato original apropiado al mismo lenguaje de marca, encuadre
  circular y fondo neón; no declarar que sea la misma identidad del vídeo.

Los masters deben ser al menos 1600 px, con alpha, sin bordes sucios ni fondos
recortados mediante umbral. La aprobación visual se revisa nuevamente al integrarlos.

## Confirmación

No se confirma el objetivo 9/10 en todas las escenas mientras persistan estos
bloqueos. Las pruebas técnicas, el MP4 y la documentación son entregables
separados de la aprobación artística.
