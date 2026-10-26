# Acceso privado y audio v2

Para la reparación actual de generación, el despliegue al proyecto conectado y
la prueba real preparada, sigue **[AUDIO-REPAIR.md](./AUDIO-REPAIR.md)**.

## Versión de retorno

Punto anterior: `60d9fcb`. Copia del árbol anterior, incluidos los archivos restaurados:
`.production/backups/before-auth-audio.tar` (no está en `public/`).
No se ha hecho commit ni modificado datos remotos. No extraigas la copia encima de
trabajo posterior sin guardarlo antes. Esta copia no es un backup de Supabase.

## Activación

La guía completa de siete pasos está en la aplicación, dentro de cada vídeo:
**Voz y audio → Configuración → Guía de activación**.
Su fuente es `src/audio/guide.ts`.

Antes del despliegue puedes necesitar recuperar el acceso:

- El proveedor encontrado es Supabase Auth, email y contraseña. Reutilizar la
  cuenta anterior conserva su identificador y sus archivos privados.
- Supabase → Authentication → Users permite localizar la cuenta. No se ha leído
  un email privado del servidor ni asignado archivos de otra cuenta por parecido
  de email.
- Si no existe ningún usuario, la nueva ruta permite crear un único propietario;
  una reserva única impide dos altas simultáneas. La contraseña se entrega a
  Supabase Auth y no se guarda en KV, código o logs de la aplicación.
- Si existe una cuenta sin permisos: al iniciar sesión, la pantalla permite
  copiar SQL que autoriza exactamente su UUID. Ejecútalo en SQL Editor de tu
  propio proyecto. Como alternativa, un administrador configura
  `STUDIO_OWNER_USER_ID` con el UUID existente. No cambies el UUID para reparar
  audio: rompería la asociación con sus archivos.
- Desactiva **Allow new users to sign up** en Supabase → Authentication →
  Providers → Email. La aplicación no tiene privilegios para cambiar esa opción
  administrativa. Los usuarios no autorizados, incluso si logran registrarse
  directamente en Supabase antes de desactivarla, no pueden abrir el workspace
  ni usar los endpoints del servidor nuevo.
- Configura Site URL y Redirect URLs para el correo de recuperación. Si no llega,
  usa Authentication → Users → cuenta → Send password recovery y revisa SMTP.
- Revoca o rota las credenciales compartidas en diagnósticos anteriores.

## Implementación y costes

- Clave exclusivamente en el secreto de servidor `ELEVENLABS_API_KEY`.
  El navegador solo recibe su existencia y los últimos cuatro caracteres.
- Nueva generación independiente por escena/evento, caché de parámetros y
  reserva atómica. Los fallos con resultado incierto nunca provocan otra llamada
  facturable automática.
- Se entrega el audio recibido aunque falle su alojamiento; se intenta conservar
  una copia pendiente en KV. Si todo el almacenamiento falla, descarga la pista
  antes de cerrar. Un bloqueo con resultado incierto se revisa en el historial del
  proveedor; no se borra para volver a cobrar automáticamente.
- Voz: `eleven_multilingual_v2`, con alineación real si la respuesta la contiene.
  Diccionario por sustitución previa, estabilidad y velocidad editables.
  No hay una voz elegida/escuchada hasta conectar el catálogo de la cuenta.
- SFX: `eleven_text_to_sound_v2`, 0,5–30 segundos por evento.
  La documentación de capacidades indica 40 créditos/segundo cuando se especifica
  duración; la facturación real de la cuenta puede diferir.
- Música: `music_v1`, instrumental forzada, 3–600 segundos; se solicita loop,
  pero la continuidad musical perfecta requiere escucha. Se aplica fundido
  de salida de medio segundo al reproducir o mezclar.
- Archivos propios: IndexedDB del navegador. No se suben automáticamente:
  conserva el original. El audio generado alojado se recupera con enlaces privados
  renovados tras autenticar al propietario.
- Ajustes por vídeo: copia local automática y botón de guardado remoto en un
  namespace nuevo. Predeterminados de canal: extensión de biblia de audio
  independiente; no se reescribe la biblia anterior ni sus datos.
- Mezcla WAV/MP4 con FFmpeg WASM y limitador. Normalización opcional de una pasada
  a objetivo −14 LUFS, no certificación de sonoridad medida de doble pasada.
  WAV es conversión PCM del MP3 recibido: no recupera calidad perdida.
- Los MP4 visuales existentes conservan resolución y fps mediante `-c:v copy`.
  No se crean resoluciones/variantes que no existan. En 4K el uso de memoria del
  navegador puede impedir la recomposición.
- Cambiar duración de voz actualiza el reloj de preview y la extensión de audio;
  copiar un MP4 visual ya renderizado no puede retimar sus escenas ni sus captions
  incrustados. Una exportación con nuevos tiempos/captions requiere un nuevo
  render visual; después puede reutilizarse para cambiar solo la mezcla.
- No se han migrado archivos remotos entre propietarios distintos, ni generado
  nuevos másteres de las cuatro variantes. Los datos anteriores permanecen.

## Documentación consultada

- TTS y alineación: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- Voces: https://elevenlabs.io/docs/api-reference/voices/search
- SFX: https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert
- Coste SFX: https://elevenlabs.io/docs/overview/capabilities/sound-effects
- Música: https://elevenlabs.io/docs/api-reference/music/compose
- Autenticación: https://elevenlabs.io/docs/api-reference/authentication
- Errores: https://elevenlabs.io/docs/eleven-api/resources/errors
- Límites/modelos: https://elevenlabs.io/docs/overview/models
- Precios: https://elevenlabs.io/pricing/api
- Licencia musical: https://elevenlabs.io/music-terms

La tabla musical consultada indica Free sin descargas/API; Starter con API y uso
online comercial individual, sin streaming musical ni cine/TV/radio/Studio Games.
Creator añade distribución musical, no elimina todas las restricciones.
Voz/SFX comercial: utiliza un plan con licencia comercial, no asumas Free.
No se ha consultado una suscripción autenticada ni un contrato particular.

## Verificación

Los resultados concretos se registran en `docs/AUDIO-VERIFICATION.md`.
