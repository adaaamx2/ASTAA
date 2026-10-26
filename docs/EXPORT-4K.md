# Exportación 4K independiente

## Uso

En **Voz y audio**, debajo de los exportadores anteriores, aparece un bloque
independiente: **Exportar MP4 4K · 60 fps**.

1. Selecciona el MP4 visual en el selector existente.
2. Ajusta la mezcla y activa las captions en la vista previa si quieres grabarlas.
3. Pulsa el botón 4K. Muestra progreso por tramos y permite cancelar.

No genera voz, música ni efectos, no consume créditos y no sobrescribe archivos.
Sin mezcla generada conserva el audio incluido en el MP4 original, si existe.
Con mezcla generada respeta volumen, máster, silencios, pistas excluidas y Solo.
Si todas las pistas están silenciadas no reincorpora el audio original por sorpresa.

## Independencia

- UI y estado: `src/media/Export4kButton.tsx`.
- Codificación: `src/media/export-4k.ts`, con su propio worker de FFmpeg.
- Planificación y verificación: `export-4k-plan.ts` y `mp4-metadata.ts`.
- Se reutilizan en lectura la mezcla y las captions de los componentes existentes.
- No se han modificado `mixMp4`, `mixWav`, `AudioWorkspace.exportFile`,
  `MotionLab.exportMix`, `DownloadButton`, generación ni backend.
- La única integración en `AudioPanel` es importar y montar el componente nuevo.

## Formato y límites

- Vertical: **2160×3840**; horizontal/cuadrado: **3840×2160**.
- Conserva el contenido mediante escala proporcional y bandas; no recorta.
- MP4 H.264, 60 fps constantes, AAC cuando hay audio.
- Un origen menor se reescala: no se presenta como render nativo 4K.
- Un origen con menos fps duplica fotogramas: no usa interpolación de movimiento.
- Las captions reutilizan su rasterizador actual, que muestrea hasta 30 fps;
  el vídeo de salida se codifica a 60 fps.
- Se trabaja en tramos de hasta 120 fotogramas para limitar memoria de imágenes
  de captions. Al finalizar se comprueban dimensiones, tiempos y fps reales
  del MP4 antes de descargarlo.
- Límite de duración: 10 minutos; límite total de proceso: 30 minutos, con
  límites adicionales por etapa. La viabilidad depende de CPU/memoria del equipo.
- Evita ejecutar otros renders al mismo tiempo. Si el equipo no soporta 4K,
  la app muestra el fallo y conserva los exportadores anteriores sin cambios;
  nunca descarga un archivo menor etiquetándolo falsamente como 4K.

## Verificación

- `node --test scripts/export-4k.test.mjs`: orientación, reloj de 60 fps,
  segmentación sin pérdida de fotogramas y lectura de metadatos MP4 reales.
- `node scripts/export-4k-browser.test.mjs`: codificación real de 2,1 s,
  2160×3840, 60 fps; audio, captions antes/después de un corte de tramo,
  silencios, conservación del audio original y cancelación.
- `FOUR_K_UI=1 node scripts/export-4k-browser.test.mjs`: la misma comprobación
  pulsando el botón real y capturando su descarga `fixture-4k-60fps.mp4`.
- `FULL_4K_EXPORT=1 node scripts/export-4k-browser.test.mjs`: variante preparada
  para comprobar el render completo de BRAND STRATEGY, de 17,5 s. Ejecutada
  correctamente: **2160×3840, 60 fps, vídeo/audio de 17,5 s**, 65.482.343 bytes,
  captions visibles, 9 tramos. Duración del procesamiento en este entorno:
  518 s (aproximadamente 8 min 38 s).
- Las pistas de estas pruebas son tonos locales, no audio nuevo de ElevenLabs.
- Build de producción correcto. El typecheck general conserva los dos errores
  previos ajenos a esta funcionalidad (`EditorialLegacySequence` y `Object.hasOwn`).
