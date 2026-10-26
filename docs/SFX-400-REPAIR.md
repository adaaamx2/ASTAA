# SFX: revisión del HTTP 400

El error comunicado era `eleven_400`, operación `elevenlabs_generation`.
El backend sustituía todas las respuestas HTTP 400 por «resultado temporalmente
incierto», descartando el motivo de validación del proveedor.

## Incompatibilidad corregida

La receta automática de BRAND STRATEGY añadía un contexto extenso y el guion a
instrucciones generales. El resultado superaba los 1.000 caracteres y nuestra
validación admitía 2.000.

La guía oficial de Sound Effects documenta prompts de **450 caracteres máximo**:
https://elevenlabs.io/docs/eleven-creative/playground/sound-effects

La referencia del endpoint y el OpenAPI no expresan ese límite en el campo
`text`; por eso comprobar únicamente el esquema no detectaba la incompatibilidad:
https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert

Ahora cliente y servidor usan la misma compactación a 450 caracteres, también
para borradores antiguos. El texto predeterminado conserva las acciones de
papel, ajedrez, cámara, flecha, edición y cierre de BRAND STRATEGY, y un contexto
breve del guion. El editor muestra el contador y limita las entradas nuevas.
Voz y música mantienen sus textos y revisiones de caché.

## Diagnóstico y comprobaciones

- HTTP 400 se presenta como rechazo de parámetros, no como resultado incierto.
- Los errores identificados como texto excesivo reciben
  `eleven_400_text_too_long`; no se devuelve el cuerpo privado del proveedor.
- Pruebas de longitud del payload real, borradores antiguos, estabilidad de
  normalización/caché y ausencia de reintentos de pago.
- La prueba del navegador rechaza cualquier solicitud SFX superior a 450
  caracteres y verifica generación independiente de SFX/música con audio local.
- No se ha gastado saldo ni confirmado una nueva generación con la clave privada.
  El HTTP 400 original no incluía su submotivo, así que no se presenta una prueba
  controlada como confirmación del resultado en la cuenta real.

El servidor remoto comprobado aún responde con revisión v5. El arreglo del
payload se aplica antes de enviar la petición y funciona con esa versión.
La defensa adicional de backend y su mensaje revisado requieren desplegar v6,
sin cambiar proyecto, secretos, usuarios o datos.
