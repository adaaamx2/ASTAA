# Verificación real y pendientes

Este documento conserva el informe histórico de audio v2. El procedimiento
actual y el destino autorizado están en **[AUDIO-REPAIR.md](./AUDIO-REPAIR.md)**;
los estados remotos indicados debajo no son una comprobación del despliegue actual.

## Comprobado

- `pnpm run build`: correcto; advertencia de tamaño de bundle.
- `node --test scripts/audio-system.test.mjs scripts/voice-access-sync.test.mjs scripts/media-projects.test.mjs scripts/production.test.mjs`:
  **33 pruebas correctas**. Proveedor y almacenamiento simulados: no prueban
  que la cuenta remota tenga permisos, saldo o almacenamiento operativo.
- Entre esas pruebas, el servidor conserva bytes pendientes cuando falla
  Storage y los recupera después sin una segunda llamada al proveedor simulado.
- `node scripts/audio-mixer-browser.test.mjs`: navegador real, IndexedDB,
  Web Audio y FFmpeg WASM reales, con tres tonos creados localmente y un MP4
  negro de un segundo. Ningún audio se solicitó a ElevenLabs.
  - Música silenciada: dos entradas en la mezcla, amplitud a 1320 Hz ~0,000014.
  - Música activa: tres entradas, amplitud a 1320 Hz ~0,0276.
  - La voz a 440 Hz sigue presente (~0,10) en ambas exportaciones.
  - Solo voz excluye las otras dos pistas.
  - Con todas silenciadas, el MP4 no contiene audio decodificable.
  - Mezcla WAV de un segundo decodificada correctamente.
- La interfaz sin sesión muestra el acceso privado y no monta la galería.
- `node scripts/audio-app-regression.test.mjs`: galería, ENBU, BRAND STRATEGY y
  workspace Finn montan sin excepciones. Sesión/nube **simuladas** y proveedores
  bloqueados en este test. La UI avisa de clave ausente. No equivale a iniciar
  sesión en Supabase real ni a revisar todas las herramientas existentes.
- Clave vacía e inválida: pruebas controladas de mensajes en español y ausencia
  de repeticiones automáticas. No se envió una clave inválida al proveedor real.
- Revisión del orden del middleware: los endpoints nuevos y los anteriores de
  proyectos/archivos exigen un propietario verificado. Excepciones públicas
  intencionadas: health y alta inicial de propietario.
- No se han modificado los archivos de datos de canal, vídeo, escena o guion.
  No se ha escrito ni borrado información remota.

## Estado remoto comprobado con solicitudes de lectura

Destino: el proyecto Supabase ya configurado, sin publicar cambios:

| Ruta | Resultado |
| --- | --- |
| health | HTTP 200; versión antigua `video-workspace-v3` |
| auth/status | HTTP 404 |
| studio/audio/status | HTTP 404 |
| studio/projects sin sesión de usuario | HTTP 401 |

**El servidor nuevo no está desplegado.** No hay token de despliegue disponible
en este entorno ni herramienta de despliegue Supabase expuesta.
No se ha reproducido un error 520 de despliegue: no se intentó desplegar sin
autorización disponible. Publicar la web no prueba que se publique la función.

## Pendiente / límites de lo comprobado

- Alta real, login real, refresco/revocación de sesión y recuperación por email.
- Desactivar el registro directo en la configuración de Supabase.
- Verificar 401 de todas las rutas en la función nueva desplegada.
- Clave real, catálogo de voces de la cuenta, voz España audible, permisos SFX y
  música, consumo y licencia concreta del plan.
- Storage y asociación del audio nuevo al propietario real.
- No se ha reasignado información entre UUID de usuarios diferentes.
- No se han generado vídeos completos, ni nuevos MP4 de todas las variantes
  1080/4K, ni aprobado visualmente BRAND STRATEGY.
- No se ha medido LUFS de doble pasada ni probado memoria con un máster 4K largo.
- Los MP4 prerenderizados conservan sus imágenes, tiempos y captions incrustados;
  retimar esas imágenes requiere render visual nuevo.
- No se localizó un endpoint Anthropic en el árbol de aplicación inspeccionado.
  No se afirma haber probado un chat/backend que esta versión no expone.
- El navegador de pruebas informa un certificado no válido al cargar Google Fonts
  y al contactar Supabase directamente. Las pruebas locales de audio pasan;
  el diagnóstico remoto de lectura se hizo con curl, no con ese navegador.

## Typecheck

`pnpm exec tsc --noEmit` **no pasa**, por dos defectos presentes antes del cambio:

- `EditorialLegacySequence.tsx`: faltan `irisMode` e `irisProgress` en `ObjectShot`.
- `workspace/cloud.ts`: `Object.hasOwn` no está incluido en el `lib` configurado.

No se han corregido por ser ajenos al alcance. Los errores introducidos durante
la implementación se corrigieron antes de la revisión final.
