import { laboralPlan } from "./laboral-plan"

const p = laboralPlan.palette
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3)
export interface LaboralAssets {
  logo: HTMLImageElement
}
function headline(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxWidth: number, alpha: number, color = p.white) {
  c.save()
  c.font = `800 ${size}px "Inter Tight Variable"`
  const width = c.measureText(text).width
  if (width > maxWidth) size *= maxWidth / width
  c.font = `800 ${size}px "Inter Tight Variable"`
  c.globalAlpha = clamp(alpha)
  c.fillStyle = color
  c.fillText(text, x, y + (1 - ease(alpha)) * 14)
  c.restore()
}
/** Minimal commercial graphics; the picture comes from real moving footage. */
export function drawLaboralOverlay(c: CanvasRenderingContext2D, time: number, width: number, height: number, assets: LaboralAssets) {
  const t = Math.max(0, Math.min(18, time))
  c.clearRect(0, 0, width, height)
  c.save(); c.scale(width / 1920, height / 1080)
  if (t < 14.6) {
    const top = c.createLinearGradient(0, 0, 0, 330)
    top.addColorStop(0, "rgba(7,13,47,0.62)")
    top.addColorStop(1, "rgba(7,13,47,0)")
    c.fillStyle = top; c.fillRect(0, 0, 1920, 330)
    const shade = c.createLinearGradient(0, 650, 0, 1080)
    shade.addColorStop(0, "rgba(7,13,47,0)")
    shade.addColorStop(1, "rgba(7,13,47,0.7)")
    c.fillStyle = shade; c.fillRect(0, 650, 1920, 430)
    const ratio = assets.logo.naturalHeight / assets.logo.naturalWidth
    c.drawImage(assets.logo, 80, 44, 142, 142 * ratio)
    if (t < 2.4) {
      const alpha = ease((t - 0.12) / 0.34) * (1 - ease((t - 2.05) / 0.28))
      headline(c, "TU TRABAJO IMPORTA.", 88, 920, 96, 1700, alpha)
      c.save(); c.globalAlpha = alpha; c.fillStyle = p.cyan
      c.fillRect(91, 954, 124, 5); c.restore()
    }
    if (t >= 9.4 && t < 12.2) {
      const alpha = ease((t - 9.48) / 0.32) * (1 - ease((t - 11.85) / 0.28))
      headline(c, "ROPA DE TRABAJO.", 88, 920, 90, 1650, alpha)
      c.save(); c.globalAlpha = alpha; c.fillStyle = p.cyan
      c.fillRect(91, 954, 124, 5); c.restore()
    }
    // Two restrained edit accents, not slide transitions or title cards.
    for (const cut of [4, 9.4]) {
      const u = (t - cut) / 0.16
      if (u >= 0 && u < 1) {
        c.save(); c.globalAlpha = Math.sin(u * Math.PI) * 0.16
        c.fillStyle = p.cyan; c.translate(u * 2300 - 300, 0); c.transform(1, 0, -0.3, 1, 0, 0)
        c.fillRect(0, 0, 72, 1080); c.restore()
      }
    }
  } else {
    const enter = ease((t - 14.6) / 0.4)
    c.save(); c.globalAlpha = 0.92 + enter * 0.05
    c.fillStyle = p.navy; c.fillRect(0, 0, 1920, 1080); c.restore()
    const logoHeight = 660
    const logoWidth = logoHeight * assets.logo.naturalWidth / assets.logo.naturalHeight
    const scale = 0.96 + enter * 0.04
    c.save(); c.globalAlpha = enter; c.translate(960, 455); c.scale(scale, scale)
    c.drawImage(assets.logo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight)
    c.restore()
    c.save(); c.globalAlpha = enter
    c.strokeStyle = p.cyan; c.lineWidth = 3
    c.beginPath(); c.moveTo(750, 838); c.lineTo(750 + 420 * enter, 838); c.stroke()
    c.font = '700 56px "Inter Variable"'; c.textAlign = "center"; c.fillStyle = p.white
    c.fillText("EQUIPA TU JORNADA.", 960, 934)
    c.restore()
  }
  c.restore()
}
