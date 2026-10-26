# BRAND STRATEGY v4 — revisión de motion editorial

## Criterio

El pedido actual no se resuelve cambiando la transición de unas diapositivas.
Se rediseñan los siete planos para darles jerarquía, profundidad y actividad
interna. Se conserva el lenguaje escultórico negro/rojo, pero v4 es una
reinterpretación, no una copia 1:1 ni el mismo personaje del vídeo de referencia.

No hay notas automáticas ni un «9/10» deducido del build. La aprobación artística
queda separada de que la web funcione o el MP4 sea técnicamente válido.

## Cambios examinados por plano

| Plano | Debilidad anterior | Trabajo v4 |
|---|---|---|
| 1. Hook | Tres líneas de la misma cursiva pesada y un objeto inmóvil | Contraste grotesca/serif, mensaje temprano, cámara, material con luz viajera y fondo cromático |
| 2. Estrategia | Ajedrez quieto y una espera sin actividad | Piezas independientes, caída de reina, curva/punto, sombras y variación de luz |
| 3. Hope / plan | Texto diminuto en un vacío negro | Tipografía de gran formato, bloom vino, dibujo de crecimiento y ritmo orbital |
| 4. Propósito | Pantalla de cámara vacía y texto sobre un PNG | Dispositivo original con contenido, enfoque, barrido, timecode y objetivos que aparecen por fases |
| 5. Conversión | Otra diapositiva negra | Cambio de escala, arrow draw, línea de atención a acción y contraste tipográfico |
| 6. Consistencia | Busto fingiendo usar un portátil | Escena original de editor con métricas vivas, clips, playhead y profundidad de piezas |
| 7. Cierre | Retrato equivocado como avatar y poco cierre | Marca vectorial propia en movimiento, CTA y cierre editorial coherente |

## Comprobaciones reproducibles

- `scripts/brand-v4-motion.test.mjs`: duración, siete capítulos, continuidad de
  composición y parámetros de cámara/luz.
- `scripts/brand-v4-review.mjs`: siete capturas, tipografía cargada, bounds de
  titulares y cambio de al menos dos capas de primer plano dentro de cada toma.
- `scripts/native-brand-browser.test.mjs`: inspección de siete tiempos del MP4
  nativo, dimensiones, duración y ausencia de frames vacíos/de carga.
- Pruebas de recuperación y carga visual: la animación espera a los masters y
  las fuentes, y un fallo opcional no vacía el workspace.

Salidas de revisión en `.production/brand-v4-review/` y
`.production/qa/native-brand/`. La v3 está preservada en archivos históricos.

## Aspectos de dirección de arte a vigilar

- La serif debe aportar carácter sin perder lectura en un móvil de 360 px.
- Los degradados deben dar luz y profundidad, no tapar contenido.
- La iluminación de los masters no debe parecer una franja pintada.
- Las órbitas y trazados deben apoyar estrategia, crecimiento y conversión,
  sin convertirse en decoración gratuita.
- El visor y el escritorio tienen que estar vivos después de su entrada.
- Las captions opcionales ocupan la banda inferior: el mensaje principal y los
  elementos esenciales se sitúan por encima.

Los renders originales y los vectores no son imágenes de un servicio generativo
de IA. El busto CC0 se atribuye y no se presenta como un modelo humano propio.
No se modifica ni se factura voz al regenerar este diseño.

## Revisión posterior al feedback 8/10

### Analizar y buscar soluciones

Dos problemas separados: mobiliario de presentación redundante y movimiento
predominantemente ambiental. Se opta por cámara dirigida y paralaje por objeto,
no por sumar transiciones, ruido o animaciones dependientes del ratón.

### Aplicar

| Plano | Ajuste |
|---|---|
| 1 | Aproximación dirigida y mayor profundidad del busto |
| 2 | Cámara lateral y acercamientos independientes del rey y la reina |
| 3 | Aproximación tipográfica con salida amortiguada |
| 4 | Relevo «attract / new eyes» → «build / trust», giro del dispositivo y zoom del contenido dentro del visor |
| 5 | Aproximación al mensaje y retirada suave, manteniendo flecha y trazo |
| 6 | Aproximación oblicua del editor con cambio de perspectiva |
| 7 | Acercamiento del cierre sin contador, etiquetas o barra de progreso |

Retirados de todos los planos: cabecera BRAND STRATEGY, nombres de capítulo
y enumeración de escenas. Se conservan los siete cortes, el ID y los datos de
capítulos, las pistas privadas y los tiempos de captions.

### Revisar y confirmar

18 pruebas de movimiento, persistencia y recuperación/subida de audio pasan.
La revisión de navegador pasa en siete encuadres: fuentes editoriales locales,
zonas seguras, ausencia de rótulos de capítulo y capas interiores cambiantes.
El nuevo MP4 queda generado a 1080×1920/60 fps con 1.050 frames y verificado en
siete tiempos mediante reproducción nativa. La prueba de arranque del workspace
y su contención de errores también pasa.
El build de producción pasa; avisa de chunks grandes. El navegador registra
un certificado no válido al cargar fuentes Google del workspace, no las fuentes
editoriales locales verificadas en esta composición.

**Nota artística: pendiente, no se declara 10/10.** La última nota del usuario
es 8/10 y no se eleva por pruebas técnicas. Las capturas se generan, pero el
lector de imágenes de esta sesión no ha podido mostrarlas; no se afirma una
inspección visual completa del movimiento ni una comparación estética certificada.
Persisten límites de los masters 2D y los planos tipográficos; más amplitud de
cámara por sí sola tampoco garantiza el «factor vídeo».

### Incidencia Supabase: alcance real

El mensaje original es compartido por Storage, no específico de BRAND.
Ocultaba la operación y el estado, por lo que no permite determinar por sí solo
la causa remota. Se añaden diagnósticos seguros, reintentos acotados de la subida
de bytes ya generados y distinción entre bloqueo existente y fallo al crear el
bloqueo. Nunca se reintenta automáticamente una llamada facturable ni se elimina
un bloqueo de resultado incierto.

Las pruebas de Storage usan dobles controlados; no se ha verificado una
generación pagada ni se ha desplegado la Edge Function en Supabase desde esta
sesión. El fallo remoto no se considera confirmado como resuelto hasta desplegar
y comprobar la operación real. No recomendar regenerar una voz cuyo resultado
pueda estar ya facturado.
Durante el smoke test, el navegador también rechaza el certificado HTTPS del
endpoint de salud de Supabase (`ERR_CERT_AUTHORITY_INVALID`); este bloqueo del
entorno no prueba que sea la causa del error de Storage reportado por el usuario.
