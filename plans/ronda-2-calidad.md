# Ronda 2 — menos funciones, voz real y calidad verificable

> Actualización de ejecución: la última instrucción del usuario aplaza
> ElevenLabs y autoriza continuar sin más preguntas. Se puede avanzar con
> animatics sin voz, pero no presentarlos como entregas finales con audio,
> sincronía verificada o aprobación de calidad. El estado y la evidencia de
> esta ejecución se documentan por separado en `ronda-2-estado.md`.

## Objetivo y contrato de ejecución

Corregir Finn Lab y el Video 1, no ampliar la plataforma indiscriminadamente. La prioridad es una voz real de ElevenLabs, un vídeo vivo y revisado, cuatro variantes exportables y, únicamente después, generación mediante chat.

Este documento es un plan, no un informe de funcionalidades implementadas. No se han realizado llamadas de pago, renders ni cambios en la aplicación durante su preparación.

Orden obligatorio:

1. Voz de ElevenLabs y eliminación de música/SFX — **PARADA 1**.
2. Limpieza de textos.
3. Dirección de arte, animación y QA del Video 1.
4. Cuatro variantes completas y descargables — **PARADA 2**.
5. Chat de generación — **PARADA 3**.

No iniciar la etapa siguiente antes de cumplir la anterior y obtener la aprobación de su PARADA cuando corresponda. No pedir decisiones que puedan resolverse con el repositorio o criterios de este plan. Un impedimento real de credenciales, permisos o infraestructura se comunica con diagnóstico concreto y alternativa, no con reintentos de tarjetas sin evidencia.

La aprobación del plan autoriza su implementación, no cargos ilimitados. Cada acción de pago tendrá una estimación previa y autorización acotada; los botones de generación son el mecanismo normal de autorización, no nuevas consultas por chat.

## 0. Estado real encontrado y decisiones cerradas

### Hechos del repositorio

- React/Vite/Tailwind; `src/production/Workspace.tsx` concentra la interfaz.
- `src/production/data.ts` contiene siete escenas, la narración original, biblia y seis packs: Pop, Karaoke, Kinetic, Terminal, Cómic y Neon.
- `src/production/Frames.tsx` dibuja tres momentos conceptuales; no contiene el motor completo del Video 1.
- `src/remotion/Root.tsx` solo registra Discord y Figma. No hay composición ni MP4 final de Finn en este repositorio.
- Los datos editados se guardan en localStorage; no existe backend de producción ni sincronización cloud.
- `scripts/elevenlabs.mjs` es una herramienta local, no una integración web funcional. Su comprobación guardada devuelve HTTP 520. No conserva el cuerpo del error del proveedor.
- El script utiliza `with-timestamps`, pero no agrupa alineación por caracteres en palabras ni genera el timeline por escenas.
- Existe una variable local de servidor en un archivo ignorado por Git; no se leerá ni mostrará su valor en el plan, cliente o logs. No es un secreto cloud.

### Decisiones

- Mantener Finn y usar **cómic vectorial 2.5D** como dirección base: fidelidad al modelo, actuación legible y render procedural nativo. No iniciar un proyecto 3D paralelo.
- Mantener exactamente **Pop, Karaoke, Kinetic y Cómic**. Terminal y Neon se retiran de la UI y del flujo activo; las versiones históricas se conservan como archivo.
- No añadir nuevos canales de ejemplo, estilos, importadores, servicios de música, SFX, gestores de referencias ni otras funciones.
- Preservar Discord/Figma y sus archivos. La revisión se aplica al Video 1 y a futuras producciones del canal, sin modificar los vídeos anteriores.
- Reducir la navegación de producción a **Voz**, **Vídeo** y **Exportaciones**. Biblia y reglas estarán en ajustes del canal; guion, vida y QA serán secciones del vídeo, no ocho pantallas parcialmente implementadas.
- Los estados serán reales: pendiente, ejecutando, fallido, necesita revisión, aprobado y listo. No usar descargas ficticias ni porcentajes basados en temporizadores.

## Arquitectura mínima compartida

### Datos y memoria

Introducir esquema versionado y migración explícita desde `schema: 1`; nunca sustituir datos del usuario silenciosamente por los valores iniciales cuando algo no valide.

Entidades:

- `ChannelBible`: personaje, paleta, tipografías, voz estructurada, pronunciaciones, reglas permanentes, reglas aprendidas y política visual.
- `VoiceSettings`: proveedor, `voiceId`, modelo verificado, idioma `es`, estabilidad, similitud, estilo, velocidad y demás parámetros realmente admitidos por ese modelo.
- `Scene`: narración original, texto enviado a voz, acciones, ficha de vida, titulares autorizados, referencias a audio/alineación y duración calculada.
- `WordTiming`: texto visible original, inicio y fin en segundos, escena y procedencia (`provider-character-alignment` o `estimated`).
- `RenderSpec`: escenas, acciones tipadas, cámara, capas, eventos, titulares, énfasis y ajustes de salida.
- `SubtitleVariant`: identificador estable, tipografía, color, animación, agrupación, énfasis y posición segura.
- `AssetManifest`: hashes, rutas privadas, duración, resolución, fps, códec, estado QA y relación de dependencias.
- `Job`: tipo, estado, progreso real, estimación, límite autorizado, error estructurado, checkpoints y artefactos.
- `LearnedRule`: error, regla correctora, escena/timecode de origen, evidencia, fecha y ámbito.
- `Version`: snapshot de los datos editables y referencias inmutables a assets; no duplicar audio o vídeo binario.

Quitar música/SFX/ducking de los modelos activos. Antes de migrar, crear copia recuperable del documento anterior; no destruir los archivos o snapshots originales.

Guardar el documento de producción y manifiestos en el servidor local del workspace, con escritura atómica y copias versionadas. Migrar el localStorage del usuario una vez mediante una acción visible en la app; el servidor no puede adivinar los datos de otro navegador. localStorage seguirá como caché, no como una supuesta memoria accesible automáticamente por cualquier agente.

La biblia y reglas se cargarán desde el mismo repositorio de proyectos en cada generación, edición, QA y render. Mantener también una representación textual exportable; no afirmar que el chat recuerda cambios que solo existen en otro navegador.

### Servidor y seguridad

Separar `server/production/` de `src/`; ningún módulo de proveedor se importa al cliente.

- Para la preview actual: montar la API de producción en el servidor Vite supervisado existente mediante un plugin fino que delegue en módulos Node. No iniciar otro servidor de desarrollo ni alterar los scripts de arranque innecesariamente.
- Worker Node separado para tareas largas, iniciado por la API con un único trabajo activo; estado y checkpoints en `.production/`.
- Almacenamiento privado: `.production/projects`, `audio`, `renders`, `qa` y `jobs`, ignorados por Git y fuera de `public`.
- Descargas a través de rutas que resuelvan IDs de artefactos, no rutas arbitrarias proporcionadas por el cliente.
- Autenticación de propietario: bootstrap de un solo uso, de corta duración, intercambiado por cookie de sesión HttpOnly/SameSite; guardar hashes, no tokens en claro en el historial. Proteger operaciones de pago con sesión, validación de origen y CSRF. No ofrecer una API TTS abierta a visitantes.
- Leer `ELEVENLABS_API_KEY` del entorno/archivo de servidor ya autorizado, sin pedir que el usuario vuelva a pegarla en chat. Comprobar permisos y exclusión de Git/build.
- La preview local no equivale a un backend desplegado. Si el alojamiento final es estático, declarar la limitación y utilizar el mismo worker en un servidor Node autenticado; no simular que una build Vite ejecuta código servidor.
- Persistir errores sanitizados; nunca guardar cabeceras de autorización, claves ni respuestas completas que puedan contener datos sensibles.

Interfaces principales:

```text
GET  /api/production/providers/elevenlabs/status
GET  /api/production/voices
POST /api/production/voice/estimate
POST /api/production/voice/test
POST /api/production/videos/:id/voice
GET  /api/production/jobs/:id
POST /api/production/jobs/:id/cancel
GET  /api/production/artifacts/:id
POST /api/production/videos/:id/export-all
POST /api/production/videos/:id/chat        # solo etapa 5
```

Las peticiones incluirán versión del documento e idempotency key. Responder con conflicto si el guion cambió durante un trabajo; no sobrescribir la versión nueva con resultados de una antigua.

## 1. ElevenLabs — solo voz

### 1.1 Retirada de audio no solicitado

Eliminar de la UI, biblia, presets, guion y timeline activos las pistas, campos, controles y textos de música, SFX y ducking. El timeline queda con voz, visuales y subtítulos. El render final solo podrá incluir el audio de voz.

Esta retirada es parte de la primera etapa, no un proyecto de rediseño aparte.

### 1.2 Diagnóstico y selección de voz

Revisar documentación vigente de ElevenLabs durante la implementación antes de fijar modelos, parámetros, endpoints o precios.

Hacer primero comprobaciones de lectura de conectividad, permisos de la clave, voces accesibles y cuota cuando el proveedor lo permita. El HTTP 520 guardado no demuestra por sí solo que la clave sea inválida.

Modelo de error visible:

```text
provider, operation, httpStatus, providerCode,
sanitizedMessage, retryable, suggestedAction, requestId
```

Si la respuesta no es JSON, conservar código y un extracto seguro de texto, indicando que podría proceder de un proxy. Si hay fallo DNS/TLS/timeout, mostrar ese fallo de transporte, no inventar un código de ElevenLabs.

No reintentar automáticamente una generación facturable cuyo resultado sea incierto. Para peticiones de lectura, máximo un reintento acotado en errores transitorios. Tratar 401/403 como configuración/permisos, 402/cuota según la respuesta real y 429 según `Retry-After`.

Seleccionar una voz de catálogo no clonada, con muestra y metadata de español de España cuando exista. No inferir el acento únicamente por el idioma `es`. Priorizar una voz accesible al plan actual; si una voz requiere otro plan, mostrarlo antes de facturar y proponer otra accesible o audio aportado manualmente. No contratar ni sustituir proveedores en silencio.

### 1.3 Prueba real y generación por escena

Botón **Probar voz** con frase fija:

> «Escribes una frase y pasa esto. Primero llegan los tokens. Después, ChatGPT conecta las piezas. ¿Lo escuchas?»

Antes de solicitar audio, mostrar caracteres facturables, caché, modelo, voz y estimación o coste no disponible. Autorizar solo esa prueba. Reproducir el resultado real y permitir descargarlo. La lectura oral de “GPU” y otros términos se verificará también antes de aprobar el diccionario del canal.

Para el Video 1:

- Conservar la narración original y sus siete escenas; no reescribir el guion para ajustar una duración prefijada.
- Mostrar total de caracteres nuevos y por escena, descontando aciertos de caché.
- Usar un presupuesto autorizado específico para este trabajo. Si el proveedor no ofrece precio exacto, mostrar caracteres/créditos conocidos y la incertidumbre; no inventar euros.
- Generar escenas secuencialmente para reducir picos de cuota, normalizar formato técnico y concatenar una única voz final.
- Añadir solo pausas documentadas necesarias entre escenas. Mantener la última frase abierta para el loop; no añadir frases ni voz al inicio/final.
- Medir audio decodificado; convertir duraciones a muestras y derivar el timeline global. La duración real prevalece sobre los 57 s objetivo.
- Exportar MP3 y WAV, conservando el archivo del proveedor. WAV será la fuente maestra de audio para renders.

Clave de caché:

```text
SHA256(
  provider + voiceId + model + effectiveText + locale +
  voiceSettings + effectivePronunciationEntries + outputFormat + schemaVersion
)
```

La escena modificada invalida su audio. Un cambio de voz o velocidad invalida todas las escenas afectadas. Editar una pronunciación que no aparece en una escena no debe invalidarla. No basta el hash del texto usado actualmente.

### 1.4 Alineación y pronunciación

Usar `with-timestamps` si sigue disponible y compatible con la voz elegida. No prometer “endpoint por palabra” si devuelve caracteres: agrupar su alineación en palabras conservando tildes, ñ, signos, espacios y puntuación.

Guardar narración original y texto efectivo separado. Aplicar el diccionario mediante funciones admitidas por el modelo o un preprocesado con mapa de correspondencias; los subtítulos conservarán «ChatGPT», «GPU» y el texto original, no sus grafías fonéticas.

Si falta alineación, marcarla como estimada **en la app y en el informe**, nunca como texto del vídeo. Usar tiempos de escena reales y distribución estimada revisable; no darla por precisión por palabra. Revisión auditiva y de sincronía obligatoria antes de aceptar la voz.

### PARADA 1 — evidencia obligatoria

Entregar:

1. Prueba reproducible, descargable y escuchada/revisada.
2. Siete audios cacheados y voz completa MP3/WAV del Video 1.
3. Voz y parámetros guardados; duración real y timeline derivados del audio.
4. Procedencia de timestamps, caracteres utilizados y resumen de coste conocido.
5. Diagnóstico exacto si algo impide obtener el audio.

No avanzar a limpieza/animación si esta etapa no funciona. Si hace falta una acción del usuario, concretar plataforma, permiso/plan y acción, sin repetir el flujo fallido de tarjetas.

## 2. Limpieza editorial

Solo después de aprobar la voz:

- Eliminar notas ilustrativas, pies, marcas de estudio, contadores de escena, nombres de canal y disclaimers del canvas del Video 1.
- Eliminar también esas instrucciones del guion visual activo y de futuras plantillas del canal.
- Separar completamente UI de revisión, overlays QA y canvas exportado.
- Lista de texto admitido: subtítulos de la narración y titulares de 1–3 palabras: por defecto «TOKENS», «NÚMEROS», «ATENCIÓN», «SIGUIENTE PIEZA», «REPETIR» y «SÍGUEME».
- La frase escrita por Finn, etiquetas semánticas como «perro/gato/coche» y valores de las barras solo se permiten cuando forman parte explícita del visual solicitado en el guion; no introducir otros textos de interfaz decorativos.
- Validar el registro de textos de cada escena antes del render. No usar OCR como único mecanismo: el motor conocerá todo texto que dibuja.
- Las notas técnicas, derechos o avisos de alineación se quedan en la herramienta/informe, no en el vídeo.

## 3. Vida, fidelidad de Finn y QA

### 3.1 Biblia y fichas editables

Guardar las reglas permanentes de esta ronda como datos estructurados y texto legible dentro de la biblia, no solo en un README.

Cada escena tendrá una `LifeSheet` editable:

```text
characterAction, expressionBeats, gazeTarget, anticipation,
overlapDelays, idleProfile, cameraPath, backgroundLayers,
focusTarget, wowBeat, microEvents, shotCuts, transition
```

Usar la ficha automáticamente sin pedir otra aprobación de arte. Propuesta cerrada:

| Escena | Actuación | Cámara y capas | Momento wow |
|---|---|---|---|
| Hook | Teclea, anticipa Enter y reacciona | Push-in; Finn, escritorio y pantalla/fondo separados | Atravesar la pantalla al pulsar Enter |
| Tokens | Corta y sigue las piezas con la mirada | Arco lateral y fichas a distintas profundidades | Una palabra se divide físicamente en dos |
| Números | Señala y cambia de sorpresa a comprensión | Órbita de proyección espacial, rejilla, puntos y personaje | Números se convierten en el mapa de significado |
| Atención | Busca con lupa y resalta conexiones | Acercamiento al vínculo, apertura a las capas | Revelación de múltiples capas apiladas |
| Secreto | Duda, compara y confirma una elección | Recorrido por barras y respuesta en formación | La pieza ganadora salta y encaja en la respuesta |
| Repetir | Sigue el proceso acelerado y reacciona | Match cuts y retroceso a filas de chips | La escala de un token a un centro de datos |
| CTA/loop | Gesto cómplice y vuelta al teclado | Retorno controlado a la composición inicial | Enlace de última frase y primer plano |

### 3.2 Motor visual

Crear composición real de Finn en Remotion, independiente de los frames conceptuales y con preview/export compartiendo el mismo reloj.

- Rig vectorial con articulaciones, expresiones, ojos/párpados, boca y manos; conservar gorro, proporciones, mochila y colores de la referencia.
- Recuperar el adjunto original si está disponible mediante su identificador y la ruta que devuelva la herramienta; nunca ejecutar un supuesto `.exe`.
- Idle continuo pero no mecánico: respiración, parpadeo no uniforme, deriva de cabeza y mirada dirigida al evento.
- Boca gobernada por envolvente RMS del audio, con suavizado y cierre en pausas. No presentarlo como lip-sync fonético.
- Acciones con anticipación, overshoot/asentamiento, arcos, desfase de partes y squash/stretch limitado para no deformar la identidad.
- Cámara viva con al menos tres planos de parallax. Usar trayectorias con easing, deriva y push-in; no movimientos lineales rígidos.
- Microeventos aproximadamente cada segundo y cortes cada 2–4 s, ajustados al habla. No generar ruido visual para cumplir un contador.
- Un foco por plano; atenuar elementos secundarios. Fondos vivos subordinados a acción y voz.
- Titulares con entrada/salida animada, layout medido, márgenes seguros y sin solapes.
- Fuentes locales y carga bloqueante antes de renderizar; no depender de peticiones de Google Fonts durante el render.

### 3.3 QA automático y revisión visual

Generar un manifiesto de muestras después de cada animatic/render:

- Primer, medio y último frame válido de cada escena.
- Transiciones: frame previo, centro y posterior; incluir los extremos reales de las ventanas de transición.
- Cada evento de texto: primer frame visible y frame asentado; muestra adicional si cambia el layout.
- Deduplicar frames idénticos por número, pero no omitir las comprobaciones asociadas.
- Para movimiento, analizar muestras a 10 fps, no solo los keyframes.

Comprobaciones automáticas:

- Bounding boxes de texto y personaje frente a zonas seguras parametrizadas en coordenadas normalizadas.
- Registro de solapes, texto no autorizado, glifos faltantes, tamaño mínimo y contraste.
- Duración/fps/audio, cue timings ordenados, palabras fuera del audio, errores de fuente y frames ausentes.
- Para el detector de escenas muertas, comparar ventanas móviles de 1,5 s en regiones de acción/personaje. Excluir grano, subtítulos y partículas de fondo para que no maquillen una escena estática.
- Umbrales iniciales a calibrar contra una escena intencionalmente congelada y una con actuación mínima: SSIM > 0,995 y flujo mediano < 0,3 px por muestra a 540 px de ancho son candidatos a fallo, no una garantía estética.
- Revisar además congelaciones largas, saltos de frame y continuidad de cámara.

Revisión con visión de cada imagen muestreada, no solo una contact sheet: texto cortado, superposiciones, ilegibilidad móvil, bajo contraste, fuera de cuadro, Finn inconsistente/deformado y escenas vacías. Escuchar además el vídeo y comprobar sincronía; unas imágenes no validan el audio ni todos los parpadeos.

Hasta disponer de un revisor multimodal integrado, esta revisión la hará el agente con las herramientas de visión disponibles y quedará registrada. Si no puede inspeccionar realmente una imagen, marcarla como no revisada y bloquear el “listo”; no simular visión automatizada.

Máximo tres iteraciones de corrección por escena. Mantener historial de intentos. Tras tres fallos, informar qué persiste y no publicar el resultado como aprobado.

Cada corrección genera una regla de canal `error → regla`, con referencia a la evidencia. El feedback `mm:ss — qué veo — qué quiero` se vincula a escena/evento, actualiza versión, invalida únicamente dependencias afectadas y deja regla persistente.

Entregar informe corto con miniaturas, reproducción del animatic y estado por escena. No abrir una nueva PARADA formal aquí: continuar corrigiendo y preparar las variantes si los controles pasan.

## 4. Cuatro variantes completas, no demos

### Subtítulos independientes

Implementar Pop, Karaoke, Kinetic y Cómic en el motor por fotogramas; retirar las demos CSS como fuente de exportación. Preview y render usarán el mismo componente y `WordTiming`.

- Pop: una palabra por vez, rebote con asentamiento.
- Karaoke: grupos de 2–3 palabras, progreso ligado al audio.
- Kinetic: clave animada y resto discreto; posición por escena.
- Cómic: globo/etiqueta con cola, squash/stretch y layout seguro.

Panel mínimo por variante: fuente local, tamaño, color, animación compatible, énfasis y posición. Guardar cambios sin prompts. Cambiar una variante solo invalida sus overlays y MP4 compuestos.

### Trabajo de exportación

Botón único **Exportar las 4 variantes**:

1. Preflight: voz y visuales aprobados, espacio, worker, fuentes, presupuesto, resolución, duración y estimación de tiempo.
2. Renderizar una sola vez el máster visual sin subtítulos a **2160×3840/60**, con todos los pases vectoriales/raster a resolución nativa.
3. Reutilizar la voz WAV y ese máster para las cuatro variantes. No volver a generar escenas ni TTS.
4. Renderizar las capas de subtítulos de cada variante en coordenadas nativas y componer cuatro MP4 4K60.
5. Obtener cuatro MP4 1080p60 de esa cadena, reduciendo desde el máster 4K; no anunciar un upscale como 4K nativo.
6. Generar SRT/VTT por variante usando sus agrupaciones y tiempos. Aclarar en la app que esos formatos no preservan animaciones.
7. Overlay transparente: WebM con alfa cuando la herramienta lo soporte y lo valide; si no, secuencia PNG RGBA comprimida como alternativa explícita. H.264 no tiene alfa.

No conservar una secuencia RGBA 4K completa innecesariamente: estimar almacenamiento antes, procesar por segmentos y limpiar temporales solo después de verificar integridad. Mantener los artefactos aprobados.

Preflight 4K con un fragmento representativo corto y completo —personaje, fondo y subtítulos— para estimar velocidad, RAM y disco. No inferir viabilidad solo porque 1080p funcionó. Si el entorno impone un límite, conservar los resultados y ejecutar el mismo worker en un equipo Node adecuado; registrar la limitación y no ofrecer un archivo falsamente 4K.

Progreso a partir de frames procesados, etapas de codificación y artefactos verificados; estimación inicial de un benchmark y actualización con rendimiento observado. Cancelación segura, reanudación y deduplicación de trabajo por hash.

Verificar con herramientas multimedia las ocho salidas: dimensiones, 60 fps constante, duración, pista única de voz, sincronía, decodificación y frame final. Probar realmente cada enlace y descargar archivos no vacíos; validar overlays sobre fondos claro y oscuro.

### PARADA 2 — entregables

- Cuatro reproductores de vídeo completo.
- Ocho MP4: cuatro 4K60 y cuatro 1080p60, si el preflight y render real lo permiten.
- Botones visibles por variante: MP4 4K, MP4 1080, SRT, VTT y overlay disponible.
- Descarga independiente de voz.
- Informe QA con miniaturas, limitaciones reales y fallos pendientes.
- No anunciar esta etapa como terminada si una variante solo se puede previsualizar o un archivo no existe.

## 5. Chat de generación, solo después

No implementar el chat antes de aprobar las variantes.

### Proveedor y modelo

Leer `ANTHROPIC_API_KEY` únicamente en servidor. Verificar la lista oficial de modelos disponibles para esa cuenta antes de usar **`claude-opus-5-5`**: ese identificador no está confirmado por el repositorio ni por una respuesta de API.

No fingir que existe ni cambiarlo silenciosamente por otro modelo. Si no está disponible, esta es una dependencia bloqueante concreta que se presenta en la PARADA de chat, con los identificadores reales y alternativa. Nunca solicitar de nuevo una clave por mensajes de chat.

### Especificación, no ejecución arbitraria

El modelo producirá únicamente `RenderSpec` JSON validado con un esquema estricto (por ejemplo Zod), no código ejecutable. Esto resuelve el “JSON y/o código” a favor de la opción más segura y mantenible.

- Validar IDs, tiempos, acciones soportadas, coordenadas seguras, textos permitidos, número de escenas y límites de duración.
- Un reintento como máximo para corregir JSON inválido. Si vuelve a fallar, mostrar el error y no renderizar.
- Cargar automáticamente biblia, preset elegido, referencias textuales/archivadas, reglas aprendidas y versión base.
- Respetar el script pegado; no reescribir la voz salvo instrucción explícita.
- Convertir la especificación a las primitivas del motor propio; no ejecutar shell, importar módulos ni acceder a archivos desde contenido generado.

Ediciones como «haz la escena 3 más rápida» producirán un patch tipado de esa escena. Si cambia solo la acción/cámara, reutilizar voz. Si exige acelerar el habla, regenerar únicamente el audio afectado con ajuste explícito y rehacer los offsets posteriores; no mover subtítulos al margen de la voz.

### Costes y memoria

- Estimar tokens/coste antes de cada petición con precios verificados y modelo real.
- Tope mensual persistente, reserva de presupuesto antes de enviar, reconciliación con usage real y registro por vídeo.
- Si el tope no está configurado, impedir llamadas hasta establecerlo en ajustes; una vez fijado, no preguntar en cada generación si cabe en él.
- No superar un tope sin autorización; informar también si una estimación no es posible.
- Historial por vídeo, versión base, resultado validado, patch aplicado, gastos y artefactos.
- Un vídeo no se muestra como listo hasta pasar el mismo QA. El chat no tendrá un camino rápido que se salte voz, textos o revisión.

La revisión visual automática futura solo se anunciará como disponible si se verifica soporte real de imágenes en el modelo seleccionado y se integra con presupuesto. El QA geométrico y temporal no se venderá como equivalente a visión.

### PARADA 3

Demostrar un prompt completo que genera un vídeo sencillo pero pulido, una edición de escena con reutilización de caché, restauración de versión, consumo registrado y QA. Mostrar bloqueo real de un JSON inválido y de un presupuesto insuficiente.

## Verificación y criterio de cierre

Usar `pnpm run build`, `pnpm exec tsc --noEmit` y el formateador prescrito `pnpm run format` sobre los archivos cambiados; corregir fallos, no declarar éxito con comandos fallidos. No iniciar otro servidor Vite; utilizar el proceso supervisado.

Agregar pruebas dirigidas de:

- Migraciones, persistencia, importación de versiones y conservación de la narración.
- Proveedores: éxito real y errores simulados 401/403, cuota, 429, 520, timeout, cuerpo no JSON y respuesta sin alineación.
- Pronunciaciones, puntuación española, agrupación de caracteres en palabras, offsets, caché e invalidación por escena.
- Trabajo cancelado, solicitud duplicada, reanudación y edición mientras se procesa.
- Ausencia de claves en Git, cliente, logs, URLs y respuestas.
- Ausencia de pistas no vocales y textos no autorizados.
- QA: fixtures con texto cortado, deformación, escena congelada y actividad falsa solo de fondo.
- Igualdad temporal entre preview/export, subtítulos y voz.
- Descargas reales de todas las variantes/resoluciones y soporte alfa comprobado.
- Navegador de escritorio y móvil: teclado, mensajes de error, estado de trabajo, recarga y reproducción.

**Terminado** significa evidencia reproducible: voz natural real, Video 1 limpio y vivo con revisión registrada, cuatro variantes completas descargables en ambas resoluciones y, al final, chat que produce y edita mediante especificaciones válidas. No significa tener sus pestañas dibujadas.
