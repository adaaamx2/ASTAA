# Flujo simplificado de audio

La pantalla muestra Crear audio, Mezclar y escuchar, y Exportar tu mezcla.
El botón «Generar voz + SFX + música» ejecuta las tres etapas en orden.
Cada etapa reemplaza su pista solo después de recibir, decodificar y guardar
el audio. Valida los tres formularios antes de cobrar y reutiliza etapas
completadas con los mismos parámetros. Un fallo detiene el lote, sin reintento
facturable automático. Los volúmenes se ajustan después.

Las muestras de voz proceden de `preview_url` del catálogo o de la consulta de
metadatos por Voice ID. No se llama a TTS para escucharlas; si no existe muestra,
no se ofrece una prueba de pago automática. Las claves permanecen en servidor.

## Verificado localmente

- Prueba de navegador con nube y proveedor simulados: selección por Voice ID,
  muestra sin generación y un clic que completa voz, SFX y música. Una segunda
  pulsación sin cambios no genera solicitudes. Verifica salida Web Audio real
  al pulsar Reproducir en el vídeo, avance visual, volumen en directo, silencio
  y reanudación desde 0,7 s. Diseño móvil sin desbordamiento horizontal.
- El reproductor principal y el mezclador comparten transporte, pistas, volumen
  y reloj. La tarjeta de audio incluye un vídeo con la mezcla; los reproductores
  de estudios, Finn, Figma y Discord usan las pistas nuevas, no solo audio antiguo.
- Prueba HTTP con Hono real y Supabase simulado: rutas de proyectos, archivos,
  subidas, revisiones y versiones; CORS con `apikey`, 401 sin sesión y 403
  para cuentas que no son propietarias.
- Prueba real con Web Audio y FFmpeg WASM, tonos locales y MP4 de prueba:
  música silenciada excluida del MP4, voz al 25% con amplitud aproximada 0,025
  frente a 0,100 al 100%, solo voz, MP4 sin audio al silenciar todas las pistas
  y exportación WAV decodificable.
- Las pruebas no generan audio real con ElevenLabs ni consumen créditos.

## Límites

Las comprobaciones de proveedor usan respuestas simuladas, no la cuenta real.
Los endpoints nuevos necesitan el backend actualizado en Supabase. La
compilación del cliente no demuestra ese despliegue.
La migración no destructiva `202610200001_studio_private_kv.sql` prepara el índice
privado en proyectos vacíos. No se ha ejecutado SQL remoto en estas pruebas.

Última lectura remota durante la comprobación posterior: `/health` responde HTTP
200 con revisión `audio-v3-projects-batch-preview`; el backend nuevo ya está activo.
`/studio/projects` sin sesión de propietario responde HTTP 401, como debe.
Esto no verifica una generación autenticada: la sesión de herramientas no dispone
de la sesión privada del propietario ni puede leer el secreto de ElevenLabs.
No se ha afirmado una generación real que no se haya comprobado.

La consulta opcional de suscripción ya no precede ni bloquea el catálogo.
El test de navegador deniega deliberadamente `/audio/connection` con HTTP 403
y verifica que se pueden seleccionar voces y solicitar las tres generaciones.
Una tabla KV ausente devuelve `audio_index_unavailable` y explica que no se ha
llamado a ElevenLabs, en lugar de un fallo genérico de guardado.

El MP4 reutiliza las imágenes y los subtítulos incrustados del render elegido.
Una narración de duración distinta no vuelve a renderizar esas imágenes.
Las descargas individuales de pistas originales no aplican la mezcla; el MP4
y el botón «Descargar mezcla WAV» sí aplican silencio, solo, volumen y máster.
La normalización opcional de ajustes avanzados modifica el nivel global.

El typecheck global conserva dos errores ajenos a audio:
`EditorialLegacySequence.tsx` (ObjectShot incompleto) y `workspace/cloud.ts`
(`Object.hasOwn` no incluido en la biblioteca TypeScript configurada).
