const base = "/references/laboral-clothing/workwear"
export const laboralPrevious = {
  narration: "Tu día tiene su propio ritmo. Tu estilo, también. Descubre Laboral Clothing: una forma de vestir que empieza en ti. Cada día, a tu manera. Laboral Clothing. Viste lo que eres.",
  music: "Instrumental editorial de moda, 18 segundos, house minimalista elegante a 110 BPM, bajo limpio, percusión seca y ligera, textura cálida. Entrada inmediata, cambios suaves a 3.4, 6.6 y 10.5 segundos, resolución de marca a 14.7 y final limpio. Sin voces ni letras; dejar espacio para una locución española.",
}
export const laboralPlan = {
  id: "laboral-clothing",
  version: 2,
  renderUrl: "/exports/study-laboral-clothing-v2.mp4",
  duration: 18,
  width: 1920,
  height: 1080,
  fps: 60,
  identityStatus: "logo-provided",
  productFootageStatus: "licensed-context-not-verified-catalog",
  palette: { navy: "#0b114f", cyan: "#199bd4", white: "#ffffff", ink: "#070d2f" },
  logo: `${base}/logo-transparent.png`,
  originalLogo: `${base}/logo-original.png`,
  slogan: "Equipa tu jornada.",
  narration: "Lo que haces cada día importa. Cada medida. Cada ajuste. Cada paso. Laboral Clothing. Ropa de trabajo para quienes hacen que las cosas pasen. Equipa tu jornada.",
  sfx: "Spot de ropa de trabajo, 18 s: 0 s roce de chaqueta; 2.4 s cinta métrica breve; 4 s taladro corto; 5.6 s textura de taller discreta; 7.8 s papel de planos; 9.4 s transición de aire suave; 14.6 s impacto de marca sobrio y cola limpia. Sin voces ni música.",
  music: "Instrumental para comercial de ropa de trabajo, 18 segundos, 105 BPM. Pulso firme, percusión seca orgánica, bajo cálido y guitarra textural mínima. Crecimiento de 0 a 12 s, apoyo de marca desde 14.6 s y final limpio. Profesional, humano, decidido; no épica exagerada, sin voces ni letras. Dejar espacio a la locución española.",
  clips: {
    workers: `${base}/workers.mp4`,
    plans: `${base}/plans.mp4`,
    measure: `${base}/measure.mp4`,
    drill: `${base}/drill.mp4`,
    workshop: `${base}/workshop.mp4`,
  },
  scenes: [
    { start: 0, end: 2.4, clip: "workers", sourceStart: 0, title: "Tu trabajo importa", voice: "Lo que haces cada día importa.", visual: "Plano de trabajadores en acción, a pantalla completa. Hook breve y marca discreta." },
    { start: 2.4, end: 4, clip: "measure", sourceStart: 0, title: "Medir", voice: "Cada medida.", visual: "Detalle real de una cinta métrica. Corte sobre el gesto; sin rótulo." },
    { start: 4, end: 5.6, clip: "drill", sourceStart: 0, title: "Ajustar", voice: "Cada ajuste.", visual: "Detalle real de herramienta en funcionamiento. Match cut de las manos." },
    { start: 5.6, end: 7.8, clip: "workshop", sourceStart: 0, title: "Hacer", voice: "Cada paso.", visual: "Trabajador en su taller. Movimiento de cámara propio del metraje." },
    { start: 7.8, end: 9.4, clip: "plans", sourceStart: 0, title: "Equipo", voice: "Laboral Clothing.", visual: "Manos señalando un plano; continuidad humana y material." },
    { start: 9.4, end: 12.2, clip: "workers", sourceStart: 2.8, title: "Ropa de trabajo", voice: "Ropa de trabajo", visual: "Ropa de trabajo en contexto. Solo aparece el rótulo de categoría." },
    { start: 12.2, end: 14.6, clip: "workshop", sourceStart: 2.5, title: "Quienes hacen", voice: "para quienes hacen que las cosas pasen.", visual: "Trabajador concentrado; el oficio protagoniza la imagen, sin tarjetas." },
    { start: 14.6, end: 18, clip: "workers", sourceStart: 4.4, title: "Laboral Clothing", voice: "Equipa tu jornada.", visual: "Cierre con el logo proporcionado, azul marino/cian y eslogan sobre fondo de trabajo muy atenuado." },
  ],
}
export type LaboralClip = keyof typeof laboralPlan.clips
export function laboralShot(time: number) {
  const t = Math.max(0, Math.min(laboralPlan.duration - 0.0001, time))
  const index = laboralPlan.scenes.findIndex(scene => t >= scene.start && t < scene.end)
  const shot = laboralPlan.scenes[Math.max(0, index)]
  return { ...shot, index: Math.max(0, index), clip: shot.clip as LaboralClip, sourceTime: shot.sourceStart + t - shot.start }
}
