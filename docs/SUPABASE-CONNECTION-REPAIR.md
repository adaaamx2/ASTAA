# Reparación de sesión y audio

## Causa encontrada

El proyecto conectado es `haulrxsoutwhzgzoudjt`. El entrypoint del servidor
contenía únicamente una plantilla de salud con prefijo `make-server-bd5da494`,
sin middleware de propietario ni instalación de las rutas de audio existentes.
El cliente seguía solicitando `make-server-4bc3557f`. Además, la plantilla
no admitía `apikey` en el preflight CORS, aunque el cliente lo envía.

## Corrección local

- Cliente y configuración CLI usan `make-server-bd5da494`.
- El servidor vuelve a verificar el token con Supabase Auth y los permisos de
  propietario antes de atender sesión o audio. No se autoriza automáticamente
  a cualquier usuario registrado.
- Se conectan las rutas existentes de audio, con clave en servidor, caché y
  bloqueo de generación. No se han ejecutado llamadas reales a ElevenLabs.
- CORS permite `apikey`, `Authorization` y `Content-Type`.
- Un fallo de transporte en la verificación de sesión hace únicamente un GET
  de salud sin cabeceras para diagnosticar una función ausente. No repite la
  petición privada ni ninguna generación.

## Límite de verificación

Los tests locales no prueban despliegue, login real, permisos de propietario,
tablas, almacenamiento ni acceso real a ElevenLabs. La última comprobación
remota sigue devolviendo `404 NOT_FOUND` para la función nueva. No hay una
herramienta de despliegue Supabase ni CLI autenticada disponible en esta sesión.
No considerar resuelto el incidente remoto hasta obtener la revisión
`audio-v2-owner-gate` en `/health` y verificar `/studio/session` con la sesión
real del propietario.

Esta reparación reconecta sesión y las rutas de audio v2. La plantilla
encontrada tampoco contenía las rutas anteriores de proyectos y archivos;
no se afirma haber restaurado o probado esas rutas.
