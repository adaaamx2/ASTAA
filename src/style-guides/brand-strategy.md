# BRAND STRATEGY v4 — Living editorial

## Identidad y alcance

- ID estable: `brand-strategy`; composición `Study-BrandStrategy`.
- 1080 × 1920, 60 fps, 17.5 segundos. Siete capítulos; mismos cortes y proyecto.
- Motor: `BrandSequence.tsx`; movimiento: `brand-motion-v4.ts`; registro: `brand-spec.ts`.
- La referencia original permanece en `public/references/brand-strategy-original.mp4`.
- **V4 es un rediseño editorial solicitado para mejorar tipografía, degradados,
  diseño y vida dentro del plano. No es una copia 1:1 de la referencia.**
- V3 queda preservada en `BrandSequenceV3.tsx` y `brand-strategy-v3.md`.

Petición futura: «Recrea BRAND STRATEGY v4: editorial escultórico en papel cálido,
vino y negro, grotesca de alto peso más serif caligráfica, luz que viaja sobre
objetos y dispositivos con contenido vivo; no diapositivas con objetos inmóviles».

## Tipografía

Tres papeles definidos, todos locales:

1. **Inter Tight Variable**, normal, peso 850: los mensajes contundentes.
2. **Instrument Serif**, cursiva real, peso 400: énfasis, contraste y personalidad.
3. **Inter Variable**, peso 500: etiquetas, información y contenido de interfaces.

La anchura se mide con la fuente cargada. Se reduce tamaño cuando hace falta;
no se deforman glifos mediante `textLength`. La entrada por palabras combina
desplazamiento corto, enfoque y ligerísima inclinación, con reloj de frame.
Los rótulos principales se verifican dentro de la zona horizontal 48–1032 px.
Las etiquetas diminutas de las interfaces son textura, no información esencial.

## Color, material y profundidad

Papel `#f4eee8`, tinta `#19151c`, vino `#952d46` y reflejos rosa `#ec9baf`.
Fondo de papel con focos rosados que cambian de posición; interludios de negro
violeta con bloom burdeos. No hay discos de blur duro ni degradados arbitrarios.
El color tiene función: calidez editorial, tensión nocturna y acento de marca.

Textura de grano RGBA determinista, generada por
`scripts/generate-brand-texture.mjs`, en `public/references/brand-v4/grain.png`.
La intensidad es baja y no cambia aleatoriamente entre renders.

Objetos de estudio con luz móvil dentro de su alpha, pequeños cambios de cámara,
sombras de contacto y capas con distinta profundidad. La luz se anima, no solo
la posición del PNG. Las interfaces y el cierre son geometría SVG original.

## Partitura por capítulos

| Tiempo | Mensaje | Diseño y movimiento interior |
|---|---|---|
| 0–2.35 | The branding secret / no one tells you | Hook temprano; contraste sans/serif; escultura, push de cámara, recorrido de luz, órbita y subrayado dibujado |
| 2.35–5.85 | A brand without a content strategy / just posting and hoping | Rey y reina independientes; caída de reina, luces, curva estratégica con punto móvil y etiqueta HOPE ≠ STRATEGY |
| 5.85–7.65 | Hope is not a growth plan | Campo de luz nocturno, tipografía de gran formato, línea de crecimiento y recorrido orbital |
| 7.65–11.9 | Content should attract new eyes, build trust and convert | Dispositivo vectorial propio, visor con contenido, foco móvil, barrido, timecode y objetivos escalonados |
| 11.9–13.6 | Convert attention into action | Atención y acción en escalas/fuentes distintas, flecha que se dibuja, órbita, subrayado y foco cromático |
| 13.6–16.3 | Posting randomly does none of the three consistently | Editor original con composición, métricas independientes, pistas animadas, playhead y piezas sociales en profundidad |
| 16.3–17.5 | Build with intention / follow for more branding secrets | Marca escultórica vectorial animada; cierre tipográfico y CTA legible |

Se corrige expresamente «growth plane» a **growth plan** en los rótulos de esta
reinterpretación. No se modifica el guion privado ni el audio del usuario.
El escritorio ya no finge que un busto sin brazos está escribiendo. El avatar
ajeno se sustituye por una marca original, no por otra identidad humana.

## Sistema de movimiento

Todo deriva de `time`, nunca de CSS animations ni del reloj del sistema.
Cada capítulo tiene actividad después de su entrada:

- desplazamiento de cámara lento;
- barridos de iluminación sobre los objetos;
- trazados, puntos y órbitas;
- foco y lectura de cámara;
- UI con métricas, clips y cabezal de reproducción;
- marca de cierre.

### Revisión: cámara dirigida y eliminación de rótulos

No mostrar la cabecera «BRAND STRATEGY», nombres técnicos («THE SECRET»,
«THE OUTCOME», etc.), contador 01/07 ni barra de progreso en la composición.
Son mobiliario de presentación, no parte del mensaje. Los nombres internos
de capítulos se conservan como datos, pero no se dibujan.

`shotCamera` define aproximación, desplazamiento lateral y salida amortiguada
por plano. Los objetos tienen una segunda profundidad independiente: acercamiento
del busto, escalas distintas del rey/reina, giro y perspectiva del dispositivo,
dolly del contenido dentro del visor y aproximación oblicua del editor.
En el plano de propósito, «attract / new eyes.» cede a «build / trust.» desde
9.4 s, sin añadir un corte ni alterar captions, duración o audio.
No añadir hovers dependientes del puntero: el MP4 debe reproducir exactamente
el mismo movimiento determinista que la vista previa.

Las curvas quintic suavizan entradas y los enlaces. El fondo persiste y evoluciona
entre capítulos; no se usa el mismo slide de página en los seis cambios.
Los giros y derivas son contenidos: la vida no equivale a sacudir todo.

## Assets y procedencia

Masters de escultura, rey y reina: `public/references/editorial-generated-v2/`.
Son renders locales. La escultura deriva de **Marble Bust 01 / Rico Cilliers /
Poly Haven, CC0**; no se declara como modelado propio. Atribución completa:
`assets/editorial-models/ATTRIBUTION.md`.

El móvil, estabilizador, visor, contenido editorial, gráficas, piezas sociales,
marca y texturas son originales por código. No son screenshots del vídeo ni
fotografías generadas por un servicio de IA.

## Audio, captions y versiones

Se conservan los IDs, referencias a voz/SFX/música, ajustes privados y tiempos
reales de captions. Los títulos editoriales no son la alineación del proveedor.
El MP4 base contiene el diseño; el exportador mezcla las pistas activas y graba
las captions seleccionadas mediante el componente común. Se mantienen 60 fps.
El render sigue identificado como revisión hasta aprobación creativa.

No generar voz ni gastar créditos al cambiar la tipografía o el diseño.
La subida del audio generado admite tres intentos como máximo ante fallos
transitorios, reutilizando los mismos bytes y ruta, sin repetir ElevenLabs.
Permisos y errores no transitorios no se reintentan; los bloqueos de generación
incierta se conservan. Los errores incluyen operación y estado HTTP seguros.
EDITING permanece retirado. No borrar versiones privadas de otros estilos.

## Revisión

```sh
node --experimental-strip-types --test scripts/brand-v4-motion.test.mjs
PORT=3000 node scripts/brand-v4-review.mjs
PORT=3000 node --experimental-strip-types scripts/render-editorial.mjs brand-strategy
PORT=3000 node scripts/native-brand-browser.test.mjs
```

La revisión comprueba siete encuadres, tipografía local, zonas seguras y al menos
dos capas de primer plano que cambian dentro de cada capítulo. Esas pruebas
detectan inmovilidad y defectos técnicos; **no conceden una nota artística 9/10**.
Hay que revisar también ritmo, jerarquía y el MP4 reproducido, no solo el storyboard.
