# EDITING / BRAND STRATEGY — revisión de acabado

## Alcance y significado de las notas

Motor activo: **v3, geometría WebGL en vivo y SVG**, salida 1080 × 1920 / 60 fps.
Se mantienen los IDs, los tiempos de las escenas y las referencias originales.
No se han cambiado ENBU, BLUE HOUR, Finn, Discord ni Figma.

Las notas siguientes son **autoevaluación de dirección de arte**, no una
medición externa, garantía de gusto ni porcentaje de igualdad con el original.
El umbral solicitado es 9/10 de acabado por escena. No se ha confundido
«compila» con «está bien diseñado», ni se ha declarado fidelidad 1:1.

Rúbrica usada:
1. Composición y jerarquía legibles en vertical.
2. Tipografía local real, peso/cursiva correctos y ausencia de glifos deformados.
3. Calidad de geometría/ilustración, bordes, materiales y luz.
4. Trayectoria, continuidad, ritmo y enlace con los planos vecinos.
5. Acabado del archivo final y coherencia dentro de su familia.

## Proceso aplicado

**Analizar:** referencias muestreadas a intervalos de 0.6 s; identificación del
vocabulario de objetos, jerarquía de texto, blancos, negros y pausas.

**Buscar soluciones:** se descartaron la ampliación de recortes del MP4, la
viñeta gris de página, Arial como sustitución y una entrada genérica para todos
los planos. Se eligió geometría procedural + luz de estudio, fuentes locales
Inter / Inter Tight y seis familias de enlace con reloj común.

**Aplicar:** mallas y materiales en `editorial/models.ts`; cámara, iluminación y
clipping en `Stage3D.tsx`; montaje y texto en `EditorialSequence.tsx`;
ilustración anatómica original en `AnatomicalEngraving.tsx`.

**Revisar e iterar:** dos pasadas visuales de los 18 planos y muestras de los
16 enlaces. Se rechazaron y corrigieron:
- Iris ocultos dentro de las esferas; ahora siguen la curvatura del ojo.
- Retrato esquemático; sustituido por composición escultórica enmarcada.
- Flores de pétalo plano; ahora dos capas curvas, estambres y tallos.
- Falta de detalle en pelo/piedra; normal map local y material menos plástico.
- Encuadre demasiado ancho del ajedrez.
- Iconos del portátil que no se reconocían como Instagram.
- Iris de transición aplicado solo a texto; ahora afecta también a geometría.
- Salida del último plano que cortaba el título; ahora se mantiene hasta el final.

**Confirmar:** separar comprobaciones técnicas reproducibles de esta valoración
artística; volver a revisar los fotogramas finales del MP4 nativo.

## EDITING — once escenas

| # | Escena | Nota de acabado | Revisión concreta |
|---|---|---:|---|
| 1 | Multitud | 9.0 | Siluetas extruidas con hombros y cuello, profundidad por filas y material mate; descartadas las figuras de óvalos brillantes. |
| 2 | EDITING / is a skill | 9.2 | Cuatro interfaces originales nítidas, perspectiva y espacio central reservado al título; sin capturas ampliadas. |
| 3 | Diana / a skill | 9.1 | Discos torneados azules y claros, flecha metálica, giro 3D contenido y enlace de cámara. |
| 4 | Right graphics | 9.0 | Aluminio deformado, labios, cámara y manos construidos por código; escala consistente y separación entre objetos. |
| 5 | Motion graphics | 9.0 | Panel de composición y timeline generados a alta resolución, relieve de pantalla y entrada de profundidad. |
| 6 | Knowledge / design | 9.0 | Pétalos curvos en dos capas, variación tonal, estambres y composición botánica enmarcada. |
| 7 | Human psychology | 9.2 | Grabado lateral original con suturas, dientes y hachurado; se descartó el primer cráneo 3D esquemático. |
| 8 | Hours of work | 9.1 | Caja torneada, corona, números romanos, subesferas y agujas; corregida la máscara circular de la esfera. |
| 9 | Combine / to create | 9.0 | Pausa tipográfica deliberada: dos niveles de peso/color y desplazamiento continuo, sin objeto de relleno. |
| 10 | Masterpiece | 9.0 | Retrato escultórico, marco volumétrico y banda azul; reinterpretación explícita, no falsa Mona Lisa pixel-perfect. |
| 11 | Human eye | 9.3 | Iris de fibras radiales sobre superficie curva, pupilas y reflejos; enlace iris y cierre mantenido. |

## BRAND STRATEGY — siete escenas

| # | Escena | Nota de acabado | Revisión concreta |
|---|---|---:|---|
| 1 | No one tells you | 9.2 | Inter Tight 900 italic real, escultura negra detallada, solape de silueta y texto, movimiento de cámara contenido. |
| 2 | Posting and hoping | 9.0 | Rey y reina como mallas torneadas, negro/porcelana, mejor encuadre, detalle de corona y código de barras. |
| 3 | Hope / growth plane | 9.0 | Pausa negra, jerarquía blanco/rojo, forma orgánica desenfocada y entrada circular coordinada. |
| 4 | Attract new eyes | 9.2 | Teléfono y rig separados, pantalla generada, botones y piezas con volumen; anotación secundaria fuera del protagonista. |
| 5 | Attention into action | 9.0 | Pausa de lectura con contraste y ritmo; disolución de foco como recurso distinto del iris. |
| 6 | None of the three | 9.0 | Portátil, escultura y cuatro iconos volumétricos reconocibles; entrada vertical por capas, no una imagen pegada. |
| 7 | Follow for more | 9.0 | Medallón escultórico y CTA limpio; se elimina la salida anticipada para conservar el texto entero en el último frame. |

## Revisión de enlaces y pruebas

Se han inspeccionado las diez transiciones de EDITING y las seis de BRAND:
profundidad, paneo, zoom, desplazamiento vertical, disolución de foco e iris.
Las hojas de enlace muestrean -0.28, -0.14, 0, +0.14 y +0.28 s.
Los iris conservan negro/blanco puros mediante clipping SVG + fragment shader;
las disoluciones de foco sí tienen mezcla tonal transitoria deliberada.

Herramientas reproducibles:
- `PORT=3000 node scripts/editorial-reference-analysis.mjs`
- `PORT=3000 node scripts/editorial-visual-review.mjs --frames`
- `node --experimental-strip-types --test scripts/editorial-motion.test.mjs`
- `PORT=3000 node --experimental-strip-types scripts/render-editorial.mjs`

Evidencia: `.production/editorial-review/v2/`, con 18 fotogramas completos,
hojas de contacto, 16 tiras de transición y `technical-review.json`.
La revisión técnica exige tres caras locales cargadas, cero recortes SVG
`image`, canvas preparado y geometría visible cuando el plano la necesita.
Las escenas puramente tipográficas o SVG no se puntúan por número de polígonos.

## Procedencia y límites

No se cargan fotogramas de los MP4 en el motor activo. Geometría de dispositivos,
ajedrez, diana, ojos, flores, aluminio e interfaces: código del proyecto.
El grabado es vectorial original. **Excepción:** busto y normal map de
Marble Bust 01, Rico Cilliers / Poly Haven, CC0. No se atribuye ese escaneado como
modelado propio; material, luz, cámara y movimiento son nuevos.
Detalles legales en `assets/editorial-models/ATTRIBUTION.md`.

La reconstrucción es una interpretación de los estilos, con objetos nuevos:
la escultura no es la misma pose del vídeo y el cuadro no es la Mona Lisa.
Un 9 de acabado en esta autoevaluación no significa un 90 % de coincidencia
con los píxeles originales ni sustituye la valoración del usuario.
