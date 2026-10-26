import type { CSSProperties } from "react"

const limit = (v: number) => Math.max(0, Math.min(1, v))
const ease = (v: number) => 1 - Math.pow(1 - limit(v), 4)
const spring = (v: number) => v <= 0 ? 0 : v >= 1 ? 1 : 1 - Math.exp(-7 * v) * Math.cos(10 * v)
const logo = "M104.4 8.2A105 105 0 0 0 79 0l-3.2 6.6a94 94 0 0 0-23.6 0L49 0a105 105 0 0 0-25.4 8.2C7.5 32 3.1 55.2 5.3 78a104 104 0 0 0 31.2 15.8l6.4-10.4a66 66 0 0 1-10-4.8l2.4-1.8c19.3 8.8 40 8.8 59.3 0l2.5 1.8a66 66 0 0 1-10 4.8l6.4 10.4A104 104 0 0 0 124.7 78c2.7-26.4-4.5-49.4-20.3-69.8ZM44.5 64.2c-6 0-10.8-5.6-10.8-12.5s4.7-12.5 10.8-12.5 10.9 5.7 10.8 12.5c0 6.9-4.8 12.5-10.8 12.5Zm39 0c-6 0-10.8-5.6-10.8-12.5s4.7-12.5 10.8-12.5 10.9 5.7 10.8 12.5c0 6.9-4.7 12.5-10.8 12.5Z"

function Type({ text, y, size = 120, t, delay = 0, color = "#f6efff", spacing = -6 }: {
  text: string; y: number; size?: number; t: number; delay?: number; color?: string; spacing?: number
}) {
  return <g aria-label={text}>
    {Array.from(text).map((letter, i) => {
      const p = spring((t - delay - i * .028) / .55)
      const width = size * .61 + spacing
      return <text key={i} x={540 + (i - (text.length - 1) / 2) * width} y={y}
        textAnchor="middle" fontSize={size} fontWeight="800" fill={color}
        opacity={limit(p * 4)} transform={`translate(0 ${(1 - p) * 190}) rotate(${(1 - p) * -18} ${540 + (i - (text.length - 1) / 2) * width} ${y})`}
      >{letter}</text>
    })}
  </g>
}

export default function MotionSequence({ time }: { time: number }) {
  const scene = Math.min(3, Math.floor(time / 2.5))
  const t = time - scene * 2.5
  const out = ease((t - 2.12) / .38)
  const enter = ease(t / .48)
  const flash = Math.max(0, 1 - t / .075) * (scene > 0 ? .65 : 0)
  const scale = 1 + t * .026 + out * (scene === 0 ? 2.8 : .22)
  const camera = `translate(540 960) scale(${scale}) rotate(${out * (scene % 2 ? -12 : 12)}) translate(-540 -960)`
  return <svg className="motion-sequence" viewBox="0 0 1080 1920" role="img" aria-label="Animación de diez segundos sobre Discord">
    <defs>
      <radialGradient id="motion-bg"><stop stopColor={scene === 1 ? "#955bff" : "#713fe1"} /><stop offset="1" stopColor="#100b23" /></radialGradient>
      <linearGradient id="motion-metal" x2="0" y2="1"><stop stopColor="#fff" /><stop offset=".5" stopColor="#ecd7ff" /><stop offset="1" stopColor="#9b68ef" /></linearGradient>
      <filter id="motion-glow"><feGaussianBlur stdDeviation="5" /></filter>
    </defs>
    <rect width="1080" height="1920" fill="url(#motion-bg)" />
    <g opacity=".2" transform={`translate(540 960) rotate(${time * 14})`}>
      {[0, 1, 2, 3].map(i => <ellipse key={i} rx={240 + i * 170} ry={470 + i * 180} fill="none" stroke="#ba8cff" strokeWidth="1.5" transform={`rotate(${i * 35})`} />)}
    </g>
    <g transform={camera} opacity={1 - out * .7}>
      {scene === 0 && <>
        {/* The logo dives into the lens; type follows on separate beats. */}
        <g transform={`translate(540 ${510 + Math.sin(t * 3) * 22}) rotate(${-22 + enter * 13 + t * 5}) scale(${spring(t / .7) * 3.8})`}>
          <path d={logo} transform="translate(-64 -47)" fill="#8e55c5" />
          <path d={logo} transform="translate(-64 -55)" fill="url(#motion-metal)" />
        </g>
        <g transform={`translate(${-ease((t - 1.15) / .35) * 1050} 0)`} opacity={1 - ease((t - 1.2) / .25)}>
          <Type text="NO ES" y={935} size={155} t={t} delay={.12} />
          <Type text="UN CHAT." y={1115} size={150} t={t} delay={.34} />
          <path d={`M210 1055h${ease((t - .8) / .18) * 660}`} stroke="#d8ff9b" strokeWidth="18" />
        </g>
        <g opacity={limit((t - 1.12) * 8)}>
          <Type text="ES TU" y={935} size={158} t={t} delay={1.17} />
          <Type text="LUGAR." y={1140} size={192} t={t} delay={1.32} color="#d9baff" />
        </g>
        <text x="540" y="1320" textAnchor="middle" fill="#e6d6ff" fontSize="25" letterSpacing="7" opacity={ease((t - 1.65) / .25)}>MÁS CERCA. DE VERDAD.</text>
        {[0, 1, 2].map(i => <circle key={i} cx="540" cy="530" r={180 + ((t * 180 + i * 130) % 400)} fill="none" stroke="#dfbaff" opacity={.3 * (1 - ((t * 180 + i * 130) % 400) / 400)} />)}
      </>}
      {scene === 1 && <>
        <g transform={`translate(${(1 - enter) * 1000} 0)`}>
          <text x="540" y="510" textAnchor="middle" fill="#d8ff9b" fontSize="29" letterSpacing="8">EL MUNDO ESTÁ AQUÍ.</text>
          <g transform={`translate(540 850) scale(${spring(t / .65) * (1 + Math.sin(t * 5) * .015)}) translate(-540 -850)`}>
            <text x="505" y="930" textAnchor="middle" fontSize="340" fontWeight="800" letterSpacing="-28" fill="url(#motion-metal)">{Math.round(200 * ease(t / .85))}</text>
            <text x="865" y="720" fontSize="100" fill="#d8ff9b">+</text>
            <text x="540" y="1065" textAnchor="middle" fontSize="92" fontWeight="750" letterSpacing="13" fill="#f8f0ff">MILLONES</text>
          </g>
        </g>
        <Type text="CONECTADOS." y={1220} size={81} spacing={-3} t={t} delay={.65} />
        {Array.from({ length: 32 }, (_, i) => {
          const p = spring((t - .3 - i * .017) / .65)
          return <rect key={i} x={95 + i * 28} y={1550 - (60 + i * 7) * p} width="15" height={(60 + i * 7) * Math.max(0, p)} rx="7" fill={i > 24 ? "#d8ff9b" : "#b78afa"} opacity={.45 + i / 64} />
        })}
        <text x="540" y="1650" textAnchor="middle" fontSize="21" fill="#c6aedc">USUARIOS ACTIVOS MENSUALES · DISCORD, 2024</text>
        <g transform={`translate(${-t * 180} 0)`} opacity=".09"><text x="0" y="320" fontSize="160" fontWeight="800" fill="white">200M+ 200M+ 200M+</text></g>
      </>}
      {scene === 2 && <>
        <Type text="TU GENTE." y={500} size={132} t={t} />
        <Type text="SIN LÍMITES." y={650} size={100} t={t} delay={.15} color="#d8ff9b" />
        {["# ese-plan-improvisado", "↗ una-partida-más", "# hasta-las-tantas"].map((text, i) => {
          const p = spring((t - .3 - i * .17) / .7)
          return <g key={text} transform={`translate(${540 + (1 - p) * (i % 2 ? -1300 : 1300)} ${830 + i * 185 + Math.sin(t * 3 + i) * 13}) rotate(${(i - 1) * -6 + (1 - p) * 20}) scale(${.9 + p * .1})`}>
            <rect x="-440" y="-70" width="880" height="145" rx="28" fill={i === 1 ? "#e8d5ff" : "#281943"} stroke="#d6afff" strokeOpacity=".35" />
            <text x="-380" y="20" fontSize="42" fontWeight="600" fill={i === 1 ? "#3b2154" : "#f0e2ff"}>{text}</text>
            <circle cx="370" cy="0" r="12" fill="#b5efaa" />
          </g>
        })}
        <g transform={`translate(0 ${(1 - ease((t - .95) / .45)) * 500})`} opacity={ease((t - .95) / .3)}>
          <text x="540" y="1510" textAnchor="middle" fontSize="36" fill="#eedfff">Voz. Vídeo. Y todo lo que os une.</text>
          {Array.from({ length: 38 }, (_, i) => {
            const h = 8 + Math.abs(Math.sin(t * 11 + i * .7)) * 90
            return <rect key={i} x={260 + i * 15} y={1620 - h / 2} width="7" height={h} rx="3" fill={i % 4 ? "#c29af7" : "#d8ff9b"} />
          })}
        </g>
      </>}
      {scene === 3 && <>
        {Array.from({ length: 16 }, (_, i) => {
          const angle = i * Math.PI / 8 + t * .18
          const radius = 680 - ease(t / .9) * 420 + Math.sin(t * 3) * 20
          return <g key={i} transform={`translate(${540 + Math.cos(angle) * radius} ${650 + Math.sin(angle) * radius}) rotate(${i * 22.5 + t * 35})`} opacity={.12 + .4 * (1 - ease((t - 1) / .6))}><path d={logo} transform="scale(.55) translate(-64 -50)" fill="#d5b6ff" /></g>
        })}
        <g transform={`translate(540 590) rotate(${Math.sin(t * 3) * 8}) scale(${spring((t - .1) / .65) * 2.2})`}><path d={logo} transform="translate(-64 -50)" fill="url(#motion-metal)" /></g>
        <Type text="AQUÍ" y={1000} size={216} t={t} delay={.25} />
        <Type text="ENCAJAS." y={1200} size={153} t={t} delay={.43} color="#d8ff9b" />
        <g opacity={ease((t - 1.1) / .35)} transform={`translate(0 ${(1 - ease((t - 1.1) / .4)) * 80})`}>
          <text x="540" y="1370" textAnchor="middle" fill="#e4d3fa" fontSize="35">No es estar online. Es estar juntos.</text>
          <rect x="335" y="1480" width="410" height="100" rx="50" fill="#eee3ff" />
          <text x="540" y="1548" textAnchor="middle" fill="#352048" fontSize="48" fontWeight="800">discord ↗</text>
        </g>
      </>}
    </g>
    {/* A travelling diagonal shutter masks the camera cut, rather than a slide fade. */}
    <g transform={`translate(${t < .22 && scene > 0 ? -ease(t / .22) * 1600 : 1600 - ease((t - 2.23) / .27) * 1600} 0) skewX(-12)`}>
      <rect x="0" y="-100" width="1700" height="2200" fill="#c7a3ff" />
      <rect x="1100" y="-100" width="150" height="2200" fill="#d8ff9b" />
    </g>
    <rect width="1080" height="1920" fill="#fff" opacity={flash} pointerEvents="none" />
    <g fill="#e6d5ff" opacity=".65" style={{ fontFamily: "monospace" } as CSSProperties}>
      <text x="86" y="1810" fontSize="18" letterSpacing="3">ESTAR JUNTOS LO CAMBIA TODO.</text>
      <text x="900" y="1810" fontSize="20">0{scene + 1}/04</text>
    </g>
  </svg>
}
