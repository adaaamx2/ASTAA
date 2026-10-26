# Despliegue de la función de audio correcta

Proyecto: `vethkrbhwctkwcsvfnfj`. Función: `make-server-4bc3557f`.
No usar otro slug ni desplegar todas las funciones.

## Desde un ordenador con Node.js 22

Descomprimir el paquete completo, abrir una terminal en esa carpeta y ejecutar:

```sh
node scripts/deploy-audio-backend.mjs
```

La CLI oficial abre su login en el navegador si no hay un token de administración
en el entorno local. No utiliza la clave pública ni `sb_secret` para administrar
despliegues. No se necesita `supabase init`, `supabase link`, contraseña de
PostgreSQL, Docker ni instalar las dependencias de React.

El script:

1. Comprueba que estén todos los archivos.
2. Descarga una copia de la función remota a una carpeta temporal local.
3. Despliega únicamente `make-server-4bc3557f`, usando `supabase/config.toml`
   para incluir `functions/server/index.tsx` y sus módulos.
4. Mantiene `verify_jwt = true`.
5. Comprueba en la URL remota `audioRevision: durable-audio-v1`.
6. Se detiene ante cualquier fallo. No llama a ElevenLabs.

Después, iniciar sesión en la aplicación y pulsar
**Comprobar conexión · sin créditos** para verificar Storage. La revisión de
`/health` confirma el despliegue, no una generación ni la escritura en Storage.
No se regeneran voces para comprobarlo.

Opciones sin despliegue:

```sh
node scripts/deploy-audio-backend.mjs --check
node scripts/deploy-audio-backend.mjs --verify
```

## Diagnóstico confirmado en esta reparación

- La API de administración aceptó la autorización.
- Se respaldó la versión remota 6, que contenía el mensaje genérico antiguo.
- El bucket de audio existía y era privado, con MIME MP3 y JSON.
- El bucket de medios devolvió HTTP 400 con `Bucket not found`: el código remoto
  antiguo solo reconocía 404 en esa comprobación; el código local ya contempla
  ambos casos.
- El intento de desplegar desde el entorno de Make terminó en
  `520: Origin is disallowed`. No confirmó publicación y no se debe presentar
  como despliegue completado.

El error de bucket de medios es un fallo concreto confirmado, no una prueba
de que explique por sí solo todos los fallos de generación anteriores.
La causa completa debe revisarse con el diagnóstico del servidor actualizado.
