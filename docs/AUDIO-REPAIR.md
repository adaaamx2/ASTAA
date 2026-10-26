# Reparación de generación — proyecto conectado

## Destino único

- Proyecto conectado y confirmado: `ystgyievwiburdycbbrg` (`voice-studio`).
- Función: `make-server-bd5da494`.
- Revisión esperada del backend actualizado: `audio-v6-sfx-prompt-limit`.
- Se reutilizan los usuarios, secretos y archivos de ese proyecto.
- No se modifica ningún proyecto antiguo. No se borran bloqueos ni pistas para
  forzar otra generación.

## Paso que requiere al propietario

Make ya ha conectado `voice-studio`; su ruta pública `/health` ha confirmado
`audio-v5-generation-preflight`. La corrección de longitud SFX se aplica en la
app antes del envío y es compatible con ese backend: no requiere reconectar.
La defensa adicional del servidor y el diagnóstico revisado de HTTP 400 se
identifican como `audio-v6-sfx-prompt-limit` al desplegar esa actualización.

El agente no dispone de autorización de despliegue Supabase en su entorno.
Guardar archivos en Make o publicar la web **no demuestra** que la función remota
se haya actualizado.

**Desde Make:** Ajustes → Supabase → desplegar/volver a desplegar el backend
del proyecto conectado. Comprueba que el proyecto seleccionado sea el anterior.
Si esa opción no está disponible, usa la alternativa de terminal de abajo.

**Alternativa de terminal:** descarga el código de Make o el paquete de reparación,
descomprímelo y abre una terminal en la carpeta que contiene `supabase/` y `scripts/`.
Necesitas Node.js 22 y npm/npx o pnpm:

```sh
node scripts/deploy-audio-backend.mjs --check
node scripts/deploy-audio-backend.mjs
node scripts/deploy-audio-backend.mjs --verify
```

El segundo comando solicita iniciar sesión mediante la CLI oficial de Supabase.
Necesitas una cuenta con permiso para desplegar funciones en este proyecto.
Descarga primero una copia de la función existente a una carpeta temporal y
se detiene si ese respaldo falla. No ejecuta migraciones, no crea usuarios,
no cambia secretos y no solicita audio.

No pegues contraseñas ni tokens en el chat. El script obtiene destino y revisión
de los archivos de configuración actuales y rechaza otro destino.

## Comprobación gratuita y prueba real

```sh
node scripts/verify-live-audio.mjs
```

Primero verifica la revisión publicada. Solo después pide tu email y contraseña
de la app en la terminal (contraseña oculta, sin guardarla). Comprueba autorización
de propietario, existencia del secreto, catálogo, escritura/lectura de KV y
subida/firma de un archivo de prueba de Storage. Borra únicamente sus sondas.
No consume créditos de generación.

Si pasa, la prueba real de pago está preparada:

```sh
node scripts/verify-live-audio.mjs --generate
```

Repite las comprobaciones gratuitas y pide escribir `GENERAR`. Solicita una frase
breve, un SFX de 0,5 segundos y música de 3 segundos, secuencialmente. Usa la primera
voz accesible del catálogo; para elegir otra, configura `STUDIO_VOICE_ID` en tu
terminal (es un Voice ID, no una clave). Guarda los MP3 recibidos en una carpeta
temporal privada, renueva sus enlaces desde Storage y comprueba la caché con los
mismos parámetros. No reintenta automáticamente llamadas facturables.

`verification.json` no contiene contraseñas, tokens, claves ni enlaces firmados.
Indica las pistas, hashes y comprobaciones de recuperación/caché. Si ya existían,
se reutilizan y no se afirma que haya habido un nuevo cobro. Se comprueba la firma
MP3, **no** la calidad auditiva: abre los archivos y escúchalos. La prueba no
certifica por sí sola exportaciones MP4/WAV.

## Si falla una comprobación

- `audio_backend_outdated` o revisión distinta: el despliegue aún no está aplicado.
- `audio_index_unavailable`: comprueba la tabla privada en el proyecto correcto.
  Solo si falta, ejecuta en su SQL Editor el archivo
  `supabase/migrations/202610200001_studio_private_kv.sql`. Es aditivo y no sustituye
  filas; no ejecutes migraciones de otros proyectos.
- `storage_permission_denied`: revisa el rol de servicio y Storage del proyecto;
  no cambies la clave de ElevenLabs para resolver un permiso de Supabase.
- `eleven_401`, `eleven_403`, `eleven_402`/cuota: clave, permisos o saldo del
  proveedor, respectivamente. Se necesita acceso TTS, SFX y Music.
- `generation_locked`, resultado incierto o pérdida de conexión: revisa primero
  el historial de ElevenLabs. No borres el bloqueo ni cambies el texto para eludirlo.
- `persistencePending`: los bytes recibidos se conservan; reintenta su alojamiento
  con los mismos parámetros, no una nueva generación.

Para diagnóstico comparte solo el código, la operación y el HTTP; nunca tokens,
contraseñas, claves, URLs firmadas ni la respuesta completa de autenticación.

## Verificación de esta reparación

- 54 pruebas automatizadas correctas: validación, proveedor simulado, rutas,
  preflight, Storage, caché, recuperación pendiente, lotes y destino de despliegue.
- Navegador real con proveedor/audio de prueba: un rechazo del preflight impide
  todas las solicitudes de generación; tras permitirlo se generan las tres
  pistas de prueba, la segunda pulsación las reutiliza y los volúmenes/silencios
  afectan a la reproducción. No equivale a generar con ElevenLabs real.
- CLI Supabase 2.121.0: comprobados los comandos y flags de despliegue y respaldo.
- Comprobación remota de revisión: sigue pendiente la publicación de esta revisión.
  No se ha ejecutado el verificador de pago con una sesión real ni se ha confirmado
  consumo en la cuenta del propietario.
