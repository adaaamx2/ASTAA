# FIGMA — No soy solo una herramienta

## Identidad
ID de galería `youtube-reference-002`; alias de estilo `figma`.
Composición `FigmaManifesto`, 1080 × 1920, 36 s, 60 fps.
Petición: «Recrea el estilo Figma — No soy solo una herramienta: manifiesto editorial, tipografía cinética y mundos ilustrados por código».
Fuente `src/FigmaSequence.tsx`, tabla `figmaChapters`; editor `src/FigmaStudio.tsx`.
Render: `public/exports/figma-manifesto.mp4`; comando `pnpm video:render:figma`.

## Guion por capítulos
0 s: No soy solo una herramienta / Soy Figma.
4 s: De una idea a un sistema / interfaces, componentes, auto layout.
9 s: Diseñar es conectar / prototipos y colaboración.
13.5 s: También creo imágenes / primera ilustración.
18 s: O como esta / segundo mundo de luz y profundidad.
22 s: Y hacer que todo se mueva / Blur Words.
27 s: Del diseño a lo real / Make, componentes, código.
32 s: Tu siguiente idea / cierre.
Los títulos, descripciones y textos exactos se conservan en `figmaChapters`; modificar esa tabla y las ramas visuales juntas.

## Dirección visual y capas
Tipografía Manrope Variable y composición vectorial con grandes titulares. Identidad Figma y motion editorial, escenas ilustradas creadas con geometría y luz. No sustituir las ilustraciones por stock ni mezclar la paleta del workspace en la obra.
Cada capítulo tiene su montaje en `FigmaSequence.tsx`; conservar sus colores, gradientes, formas, posiciones y constantes para recrear ese vídeo exacto.
Capas: fondo, ilustración/objetos, cámara, tipografía, elementos de sistema y transición.

## Movimiento y dependencias
Animación determinada por `time`; Remotion obtiene `frame / 60`. Las palabras se revelan con blur y desplazamiento escalonado.
La adaptación BlurWords está inspirada en React Bits; procedencia y licencia en `src/library/REACT-BITS-LICENSE.md`. Conservar la atribución. No sustituir ese efecto por fade genérico.
Usar las ecuaciones de entrada/salida del código como especificación de keyframes.

## Audio, captions y versiones
Las frases editoriales del diseño no prueban que exista narración. No presentar el MP4 base como vídeo con una voz de ElevenLabs si no se ha generado y mezclado.
Si se crea nueva voz, guardar guion, Voice ID y tiempos reales. Los subtítulos añadidos deben hornearse cuando formen parte del resultado final.
Guardar variantes antes de cambiar fuentes, textos, ritmo, audio o ilustraciones. La copia de referencia externa no debe reemplazar el vídeo creado por código.

## Revisión
Revisar los ocho capítulos y sus puntos medios, nitidez del texto, gradientes, timing de BlurWords, duración de 36 s, espacios seguros y presencia real del audio requerido en el archivo descargado.
Para recrear el vídeo existente basta reutilizar composición, guion y código; para inspirarse solo en su estilo, preservar jerarquía y movimiento pero documentar el guion nuevo.
