# Recuperación de la pantalla en blanco

## Causas verificadas

Dos referencias sin definición se ejecutaban al importar módulos del workspace:

1. `EditorialSequence.tsx` exportaba `brandAssetUrls` sin importarlo.
2. `StyleGuide.tsx` todavía construía la entrada de EDITING usando `editing`,
   aunque se había retirado su import.

La segunda se confirmó como `ReferenceError: editing is not defined` en el
protocolo Runtime del navegador. Antes de las correcciones `#root` estaba vacío.
No era un fallo de Supabase, no se requería cambiar claves ni borrar almacenamiento.

## Correcciones

- Entrada editorial pequeña y explícita, conectada a `BrandSequence`.
- Implementaciones anteriores conservadas como código histórico, fuera de la
  entrada activa. EDITING sigue retirado de la galería, selector y composiciones.
- Guía actual de BRAND enlazada a su informe correcto, sin entrada retirada.
- Carga dinámica y límites de error para vista editorial y documentación.
  Un fallo de una vista presenta un aviso local, sin desmontar el workspace.
- La reproducción y el audio esperan a la fuente y los cinco masters visuales.
  El reloj se inicia en el frame elegido, no avanza oculto durante la carga.
- El render nativo mantiene su bloqueo de carga hasta que el frame está montado;
  un error durante un render nativo cancela la exportación, no genera un MP4 de error.

## Verificación reproducible

```sh
PORT=3000 node scripts/app-smoke-browser.test.mjs
PORT=3000 node scripts/visual-readiness-browser.test.mjs
PORT=3000 node scripts/style-catalog-browser.test.mjs
pnpm build
```

La prueba de arranque escucha `Runtime.exceptionThrown`, comprueba galería,
ENBU, BRAND y el enlace retirado, y provoca un error aislado deliberado para
verificar que la página sobrevive.

La prueba de recursos intercepta y retiene las cinco imágenes. Al pulsar
reproducción el reloj permanece en 0 mientras faltan recursos y reanuda desde 0
cuando estos están disponibles.

No se han eliminado proyectos privados, voces, pistas o versiones.
La recuperación técnica no significa aprobación artística: el objetivo 9/10
de cada escena sigue registrado en `docs/brand-reference-review.md`.
