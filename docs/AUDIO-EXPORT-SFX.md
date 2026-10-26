# Exportación y diseño SFX

## Cambios

- El exportador del estudio de audio y las descargas recompuestas consultan las
  captions activas de la vista previa (palabras, tiempos, pack y activación).
- Las captions de una narración generada por lote usan su texto actual y su
  alineación; si no hay alineación, se estiman tiempos sobre ese audio, no sobre
  el guion anterior.
- Audio de FFmpeg acotado a la duración del vídeo antes de mezclar/normalizar.
  El proceso tiene límite de tiempo, termina su worker y muestra progreso.
- Las captions se rasterizan como máximo a 30 fps, manteniendo la frecuencia
  de salida del vídeo. Esto reduce los PNG y memoria para fuentes de 60 fps.
- El exportador principal no depende de volver a cargar la nube si ya dispone
  de una mezcla local.
- SFX por defecto para todo el vídeo (hasta 30 s por solicitud), con contexto
  visual y del guion. Se conservan los prompts y duraciones personalizados.
  BRAND STRATEGY incluye papel, ajedrez, cámara, interfaces, edición y cierre,
  con las marcas temporales de sus capítulos como instrucciones al proveedor.
  Estas instrucciones no garantizan por sí solas sincronía exacta del generador.
- Se realza de forma acotada un SFX de nivel muy bajo en reproducción y
  exportación; un archivo prácticamente silencioso se identifica como tal.
  Las pistas originales no se modifican ni se regeneran automáticamente.
- Se muestra el tramo temporal de los SFX existentes: un archivo de un segundo
  no se convierte mágicamente en una pista de diseño sonoro de 17,5 segundos.

## Comprobaciones

- Compilación de producción correcta.
- Pruebas unitarias de contexto, duración, caché y captions de guion editado.
- Navegador: SFX aislado audible con voz/música silenciadas, captions compartidas
  con el exportador y ausencia de generación al repetir parámetros.
- FFmpeg WASM real: mezcla MP4/WAV, silencios, volúmenes y realce de SFX tenue.
- Exportación BRAND STRATEGY 1080×1920 con captions visibles y audio de 17,5 s.
  Se han utilizado audio local de prueba y el render existente; no se ha generado
  una nueva voz/SFX/música ni consumido créditos de ElevenLabs.
- Prueba adicional pulsando ambos botones de la interfaz:
  `EXPORT_UI=1 node scripts/audio-panel-browser.test.mjs`. Ambos produjeron
  un MP4 de 17,5 s y 35.339.165 bytes; se detectaron captions grabadas en los
  fotogramas de ambos archivos. Audio/cuenta simulados; vídeo, mezcla, codificación
  y comprobación de los archivos reales en el navegador.
- Prueba de duración completa:
  `FULL_CAPTION_EXPORT=1 node scripts/caption-export-browser.test.mjs`.
- La comprobación global TypeScript sigue mostrando los dos errores previos
  ajenos a este trabajo: `EditorialLegacySequence.tsx` (`ObjectShot`) y
  `workspace/cloud.ts` (`Object.hasOwn` con lib ES2020).

## Generación independiente de SFX y música

Un rechazo específico de la etapa SFX podía detener el lote antes de solicitar
música. Ahora se conserva el resultado de cada etapa, un rechazo específico de
SFX permite intentar la música ya autorizada y se informa de generación parcial.
Sesión inválida, cuota agotada, fallos compartidos de almacenamiento y resultados
inciertos siguen deteniendo el lote; ninguna petición facturable se reintenta.

«Generar solo SFX» y «Generar solo Música» no solicitan las otras pistas. Música
sola no requiere Voice ID, diccionario válido ni campos SFX válidos. Las pistas
anteriores se conservan si el proveedor rechaza una nueva solicitud. Una pista
silenciosa no se presenta como éxito ni se regenera eludiendo su caché.

Cada pista muestra generación, reutilización o error, con código/HTTP/operación
cuando están disponibles. Se advierte si hay audio guardado pero está silenciado
o excluido de la mezcla. La prueba de navegador cubre rechazo SFX → música,
música sola sin voz y SFX solo conservando voz/música. Son respuestas controladas:
no confirman permisos ni generación real en la cuenta de ElevenLabs.
