# Audio: comprobación gratuita y recuperación persistente

Revisión del backend: `durable-audio-v1`, visible en `/health` y `/studio/status`.
La presencia de esa revisión no es una condición obligatoria en el cliente.

Antes de enviar una generación, el cliente intenta
`POST /studio/storage-check` con la sesión del propietario. Comprueba el bucket,
escrituras de prueba con MIME MP3 y JSON, firma de URL y escritura/lectura del índice KV.
Solo elimina sus propios archivos de prueba. No llama a ElevenLabs.
Si falta **la ruta**, intenta la misma comprobación mediante la ruta estable
`POST /studio/generate`, enviando únicamente `{operation: "storage-check"}`:
sin Voice ID, texto ni autorización de gasto. El backend actualizado responde
sin llamar al proveedor. Un backend anterior rechaza esos campos ausentes con
su mensaje conocido de validación de voz y HTTP 400; en ese caso se conserva
el flujo anterior, con una única generación cuando el usuario la autoriza.
No se presenta ese modo como una comprobación satisfactoria de Storage.

No hay fallback ante permisos insuficientes, red caída, JSON inválido, errores
reales de Storage, ni errores 400 no reconocidos. Un 404 estructurado con
`storage_object_missing` o un error de proyecto **no es** una ruta inexistente.
Nunca se reintenta una petición facturable por otra ruta.

El botón «Comprobar conexión · sin créditos» permite ejecutar ese diagnóstico
sin pulsar Generar y sin autorizar consumo.

Después de recibir audio del proveedor, el servidor guarda los bytes base64,
metadatos y alineación en `studio:asset:<usuario>:<id>:pending` en KV **antes**
de subir el MP3 a Storage. Si la subida o el guardado de metadatos falla, la
siguiente petición de la misma configuración recupera esa copia antes de
comprobar el bloqueo. No repite la generación. La copia pendiente se elimina
solo después de confirmar MP3, sidecar, índice y enlace firmado.

Si una operación falla **después de obtener audio**, el backend actualizado
devuelve además los bytes como audio inline con la alineación original y marca
el resultado como pendiente de nube. Puede reproducirse, descargarse y
exportarse sin una consulta obligatoria a Storage. No se presenta como alojado.
La copia en el navegador es temporal: descargar antes de cerrar la pestaña.
Si la voz está pendiente, no se generan SFX nuevos. Las pistas de nube existentes
no se sustituyen y una carga de proyecto antigua no oculta la voz local pendiente.

Alternativas ya disponibles sin generación: recuperar y vincular audios desde
«Archivos del vídeo», o utilizar «Alternativa local · unir un MP4 y un MP3».
La mezcla local básica no añade automáticamente captions alineadas.

Límites: si el proveedor devuelve un resultado incierto, o falla KV antes de
guardar el resultado, se conserva el bloqueo y no se reintenta automáticamente.
Esta recuperación no puede reconstruir bytes perdidos por versiones anteriores.
No eliminar bloqueos antiguos para forzar una nueva llamada facturable.

Verificación sin créditos:

```sh
node --experimental-strip-types --test scripts/storage-audio.test.mjs scripts/pending-audio.test.mjs scripts/media-projects.test.mjs scripts/studio-transport.test.mjs scripts/elevenlabs-provider.test.mjs
```

La comprobación remota de `/health` y `/studio/status` confirma disponibilidad
del servidor y configuración declarada, no permisos de Storage ni éxito de una
generación. Las nuevas protecciones del backend requieren desplegar esa revisión
y comprobar Storage con una sesión autorizada; el arreglo de compatibilidad
del cliente no depende de que aparezca una ruta nueva. No atribuir errores a
certificados o a la voz sin evidencia de esa operación.
