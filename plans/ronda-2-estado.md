# Ronda 2 — estado comprobado

## Cambio de prioridad autorizado

El usuario ha aplazado ElevenLabs y ha pedido avanzar sin nuevas preguntas.
No se ha utilizado la credencial ni llamado a TTS o Anthropic. Los vídeos de
esta ejecución son **animatics sin voz**, no producciones finales aprobadas.

## Implementado

- Finn abre directamente en una reproducción completa de siete escenas, con
  play/pause, reinicio, scrub y selección de escena/pack.
- Narración original protegida por SHA256: siete escenas y 127 palabras intactas.
- Una composición vectorial por reloj compartida entre navegador y Remotion.
- Pop, Karaoke, Kinetic y Cómic son los únicos packs activos.
- Música/SFX eliminados de los modelos y controles activos. Las versiones
  históricas y la copia previa a la migración no se destruyen.
- Schema 1 → 2 con copia recuperable; los datos inválidos no se sobrescriben.
- El último canal/vídeo seleccionado se recupera después de recargar.
- Discord y Figma mantienen sus MP4 y rutas; enlaces directos desde Finn Lab.
- Hoja original de Finn archivada y accesible desde Referencias.
- SRT/VTT reales, explícitamente estimados. No conservan las animaciones.
- Render reproducible, hashes, descargas verificadas, checkpoints privados y
  publicación atómica de artefactos, sin porcentajes ficticios.

## Exportaciones

El manifiesto real es `public/exports/finn-animatics.json`; solo contiene
descargas que han pasado la comprobación técnica. **Pop, Karaoke, Kinetic y
Cómic están renderizados y verificados**. Los cuatro MP4 completos están
disponibles en Finn Lab → Exportaciones, junto a sus SRT/VTT estimados.

Cada MP4 completo: 1080×1920, 60 fps, 57 s, 3420 frames y ninguna pista de
audio. El worker comprueba metadata y decodificación completa antes de
publicarlo. El render usa Manrope instalado localmente.

Un preflight nativo 2160×3840/60 de un segundo ha pasado metadata y
decodificación, tras limitar los hilos de x264. **No hay ocho MP4 finales ni
cuatro 4K completos**. El CLI dispone de una opción nativa `--4k`; disponer
de ese código no se cuenta como un render ejecutado.

## QA y límites reales

`public/exports/finn-qa.json` conserva 21 imágenes Pop inspeccionadas
individualmente y 570 muestras geométricas de texto. Las muestras proceden de
la preview que usa la misma composición, no de una inspección de cada frame
decodificado del MP4. No hay texto fuera del canvas en ese muestreo.

La revisión visual deja pendientes concretos:

1. Limpiar la densidad/solapes de algunas etiquetas numéricas del mapa.
2. Hacer coincidir exactamente pose, cámara y titular del final con el inicio.
3. Completar la dirección de arte, actuación, cortes y fichas de vida del plan.
4. Revisión exhaustiva de las otras variantes, transiciones, eventos y movimiento.

Por tanto, el estado correcto es **necesita revisión**, no aprobado/listo.
No existen voz real, alineación, sincronía auditiva aprobada, RMS de boca,
overlays alfa, almacenamiento compartido de proyectos en servidor ni chat
Anthropic terminado. No se han añadido imitaciones de esas funciones.

## Seguridad

Se encontró una credencial aparente en un archivo de entorno mal nombrado y
ya rastreado. Su contenido se conservó privadamente con permisos 0600 y el
archivo de trabajo rastreado se saneó sin revelar el valor. Vite bloquea los
archivos de entorno y `.production/`, también con `?raw`; comprobado con
respuestas HTTP 403. No se reescribió el historial de Git: la credencial
anterior requiere rotación antes de reutilizarla.

## Verificación reproducible

```sh
pnpm run format <archivos modificados>
pnpm exec tsc --noEmit
node --experimental-strip-types --test scripts/production.test.mjs
pnpm run build
PORT=3000 node --experimental-strip-types scripts/workspace-browser.test.mjs --require-exports
git diff --check
```

Las pruebas dirigidas de datos cubren narración, migración sin mutaciones,
copias y recuperación, selección persistente, cuatro packs y cues españoles.
El test de navegador cubre migración/backup, edición y recarga, escritorio y
móvil, reproducción, biblioteca/rutas anteriores y, con `--require-exports`,
descargas completas/hash y reproducción del MP4.

Advertencias ambientales: el import global anterior de Google Fonts falla
TLS en el navegador de pruebas, pero Finn usa Manrope local. Vite avisa de
un bundle superior a 500 kB; la build no falla por esa advertencia.

### Resultado de esta ejecución

- Formateador, TypeScript, build y `git diff --check`: correctos.
- Seis pruebas dirigidas de datos: correctas.
- Navegador de escritorio/móvil, edición-recarga, migración con backup,
  reproducción y rutas antiguas: correctos.
- Cuatro MP4 descargados completos y comparados con sus hashes; reproducción
  real del MP4 en navegador comprobada. Los cuatro pasaron decodificación FFmpeg.
- Ocho descargas SRT/VTT reales y no vacías: correctas.
- Segunda ejecución del render: cuatro aciertos de caché verificados, sin
  volver a renderizar ni llamar a proveedores.
- Discord/Figma: archivos binariamente idénticos a los de HEAD.
- Recursos privados: HTTP 403; sin tokens tipo `sk_` en `src/` ni build cliente.

Estos resultados verifican el alcance implementado, no los entregables
pendientes ni la aprobación artística final.
