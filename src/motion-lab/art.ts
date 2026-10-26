import type { StudyId } from "./studies"

type Point = [number, number]
const TAU = Math.PI * 2
const seed = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v))
  return t * t * (3 - 2 * t)
}

function path(
  c: CanvasRenderingContext2D,
  points: Point[],
  fill: string,
  stroke?: string,
  width = 1,
) {
  c.beginPath()
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
  c.fillStyle = fill
  c.fill()
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = width
    c.stroke()
  }
}
function line(
  c: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number,
) {
  c.beginPath()
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.strokeStyle = color
  c.lineWidth = width
  c.lineCap = "round"
  c.lineJoin = "round"
  c.stroke()
}
function glow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 1,
) {
  c.save()
  c.globalAlpha = alpha
  const g = c.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, color)
  g.addColorStop(1, color.slice(0, 7) + "00")
  c.fillStyle = g
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  c.restore()
}
function ellipse(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  stroke?: string,
  rotation = 0,
) {
  c.beginPath()
  c.ellipse(x, y, rx, ry, rotation, 0, TAU)
  c.fillStyle = color
  c.fill()
  if (stroke) {
    c.strokeStyle = stroke
    c.stroke()
  }
}
function joint(
  a: Point,
  target: Point,
  upper: number,
  lower: number,
  bend: number,
): Point {
  const dx = target[0] - a[0],
    dy = target[1] - a[1]
  const distance = Math.max(
    1,
    Math.min(Math.hypot(dx, dy), upper + lower - 0.1),
  )
  const direction = Math.atan2(dy, dx)
  const offset = Math.acos(
    Math.max(
      -1,
      Math.min(
        1,
        (upper * upper + distance * distance - lower * lower) /
          (2 * upper * distance),
      ),
    ),
  )
  return [
    a[0] + Math.cos(direction + offset * bend) * upper,
    a[1] + Math.sin(direction + offset * bend) * upper,
  ]
}

const poses = [
  [0, 25, -18, -1.5, 43, 0],
  [-0.3, 100, -67, -0.12, 85, 18],
  [0.13, 22, -145, -1.85, 48, -9],
  [0.44, 58, 3, -2.85, 88, 37],
  [-0.2, 72, -117, -0.92, 70, 10],
  [-0.33, 108, -68, -0.1, 88, 24],
  [0.08, 12, -133, -2.1, 55, -7],
  [0, 25, -18, -1.5, 43, 0],
]
const phaseNames = [
  "STILLNESS",
  "THE DRAW",
  "RISING CUT",
  "FLAME GUARD",
  "STORM OF CUTS",
  "AFTERIMAGE",
  "THE RETURN",
]
function poseAt(time: number) {
  const cycle = ((time % 18) + 18) % 18
  const phase = Math.min(6, Math.floor(cycle / (18 / 7)))
  const progress = cycle / (18 / 7) - phase
  const e = smooth((progress - 0.12) / 0.62)
  const p = poses[phase].map((value, i) => mix(value, poses[phase + 1][i], e))
  const angle = p[3] + (phase === 4 ? Math.sin(e * Math.PI * 4) * 0.62 : 0)
  const root: Point = [480 + Math.sin((time * TAU) / 18) * 11, 417 + p[5]]
  const transform = ([x, y]: Point): Point => [
    root[0] + x * Math.cos(p[0]) - y * Math.sin(p[0]),
    root[1] + x * Math.sin(p[0]) + y * Math.cos(p[0]),
  ]
  const hand = transform([p[1], p[2]])
  const tip: Point = [
    hand[0] + Math.cos(angle) * 145,
    hand[1] + Math.sin(angle) * 145,
  ]
  return { p, phase, progress, root, transform, hand, tip, angle }
}
export function swordEnergy(time: number) {
  const a = poseAt(time),
    b = poseAt(time - 0.025)
  return Math.min(1, Math.hypot(a.tip[0] - b.tip[0], a.tip[1] - b.tip[1]) / 25)
}
function flame(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
  offset: number,
) {
  const wave = Math.sin(((time * TAU) / 18) * 12 + offset) * size * 0.2
  glow(c, x, y - size * 0.5, size * 1.6, "#ff380b", 0.24)
  c.save()
  c.globalCompositeOperation = "screen"
  for (let layer = 0; layer < 3; layer++) {
    const s = size * (1 - layer * 0.24)
    c.filter =
      layer === 0 ? "blur(2.8px)" : layer === 1 ? "blur(1.1px)" : "blur(.4px)"
    c.beginPath()
    c.moveTo(x - s * 0.28, y)
    c.bezierCurveTo(
      x - s * 0.7,
      y - s * 0.5,
      x + wave + s * 0.4,
      y - s * 0.8,
      x + wave,
      y - s * 1.55,
    )
    c.bezierCurveTo(
      x + wave + s * 0.8,
      y - s,
      x + s * 0.4,
      y - s * 0.35,
      x + s * 0.25,
      y,
    )
    const g = c.createLinearGradient(x, y, x, y - s * 1.5)
    g.addColorStop(0, layer ? "#fff5ac" : "#ff4d07")
    g.addColorStop(0.6, layer ? "#ffda4a" : "#ffb12a")
    g.addColorStop(1, "#ff7b1000")
    c.fillStyle = g
    c.fill()
  }
  c.filter = "none"
  glow(c, x + wave * 0.3, y - size * 0.4, size * 0.66, "#ffd36a", 0.45)
  c.restore()
}
function armorLimb(
  c: CanvasRenderingContext2D,
  points: Point[],
  width: number,
  orange: string,
) {
  line(c, points, "#080707", width + 3)
  line(c, points, orange, width + 1)
  line(c, points, "#100c0c", width - 1)
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1]
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      length = Math.hypot(dx, dy)
    for (let j = 0.2; j < 0.9; j += 0.21) {
      const x = mix(a[0], b[0], j),
        y = mix(a[1], b[1], j)
      line(
        c,
        [
          [x - (dy / length) * width * 0.42, y + (dx / length) * width * 0.42],
          [x + (dy / length) * width * 0.42, y - (dx / length) * width * 0.42],
        ],
        "#b8452399",
        0.8,
      )
    }
  }
}
function fireScene(c: CanvasRenderingContext2D, time: number) {
  const w = 960,
    h = 646,
    t = time % 18
  const sky = c.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, "#080303")
  sky.addColorStop(0.55, "#280706")
  sky.addColorStop(1, "#070405")
  c.fillStyle = sky
  c.fillRect(0, 0, w, h)
  const drift = Math.sin((t * TAU) / 18)
  const sun = c.createRadialGradient(492, 155, 5, 486, 245, 245)
  sun.addColorStop(0, "#fff5a2")
  sun.addColorStop(0.19, "#ffb42b")
  sun.addColorStop(0.47, "#f53908")
  sun.addColorStop(0.83, "#c60906")
  sun.addColorStop(1, "#600402")
  c.fillStyle = sun
  c.beginPath()
  c.arc(486 + drift * 2, 245, 232, 0, TAU)
  c.fill()
  glow(c, 490, 220, 340, "#ff2d0b", 0.14)
  for (let layer = 0; layer < 3; layer++) {
    const points: Point[] = [[0, 500]]
    for (let x = 0; x <= 1000; x += 24)
      points.push([
        x,
        383 +
          layer * 44 -
          Math.sin(x * 0.006 + layer * 1.7) * 47 -
          seed(Math.floor(x / 24) + layer * 100) * 24,
      ])
    points.push([1000, 575], [0, 575])
    c.beginPath()
    c.moveTo(points[0][0], points[0][1])
    for (let j = 1; j < points.length - 1; j++)
      c.quadraticCurveTo(
        points[j][0],
        points[j][1],
        (points[j][0] + points[j + 1][0]) / 2,
        (points[j][1] + points[j + 1][1]) / 2,
      )
    c.lineTo(1000, 575)
    c.lineTo(0, 575)
    c.closePath()
    c.fillStyle = ["#260706", "#160708", "#0d0708"][layer]
    c.fill()
  }
  for (let i = 0; i < 8; i++) {
    const y = 143 + i * 31 + Math.sin(i) * 8
    const g = c.createLinearGradient(0, y, w, y)
    g.addColorStop(0, "#08020300")
    g.addColorStop(0.3, "#130302a8")
    g.addColorStop(0.7, "#080202bb")
    g.addColorStop(1, "#00000000")
    c.fillStyle = g
    c.fillRect(Math.sin((t * TAU) / 18 + i) * 18, y, w, i % 3 === 0 ? 17 : 5)
  }
  const floor = c.createLinearGradient(0, 510, 0, h)
  floor.addColorStop(0, "#2b0b08")
  floor.addColorStop(1, "#070506")
  c.fillStyle = floor
  c.fillRect(0, 523, w, h - 523)
  for (let i = 0; i < 27; i++)
    line(
      c,
      [
        [0, 536 + i * 5],
        [w, 536 + i * 5],
      ],
      `rgba(241,91,30,${0.055 * (1 - i / 27)})`,
      0.6,
    )
  glow(c, 480, 550, 250, "#ff400a", 0.18)
  ellipse(c, 480, 548, 185, 19, "#090506", "#7e261e")
  const pose = poseAt(t)
  c.save()
  c.globalCompositeOperation = "screen"
  for (let i = 0; i < 3; i++) {
    c.beginPath()
    c.ellipse(
      480,
      544,
      180 + Math.sin(t * 2 + i) * 6,
      26 + i * 3,
      -0.025,
      0,
      TAU,
    )
    c.strokeStyle = `rgba(255,${86 + i * 35},22,${0.12 + Math.sin(((t * TAU) / 18) * 4 + i) ** 2 * 0.25})`
    c.lineWidth = i ? 0.7 : 2
    c.stroke()
  }
  c.restore()
  for (let i = 0; i < 23; i++) {
    const a = seed(i + 12) * TAU
    const x = 480 + Math.cos(a) * (160 + seed(i) * 35)
    const y = 530 + Math.sin(a) * 26
    const s = 8 + seed(i + 80) * 31
    flame(
      c,
      x,
      y,
      s * (0.7 + Math.sin(((t * TAU) / 18) * 8 + i) ** 2 * 0.45),
      t,
      i,
    )
  }
  for (const x of [102, 858]) {
    line(
      c,
      [
        [x - 16, 405],
        [x - 38, 551],
      ],
      "#030405",
      7,
    )
    line(
      c,
      [
        [x + 16, 405],
        [x + 38, 551],
      ],
      "#030405",
      7,
    )
    line(
      c,
      [
        [x - 28, 502],
        [x + 28, 502],
      ],
      "#060506",
      4,
    )
    path(
      c,
      [
        [x - 47, 399],
        [x + 47, 399],
        [x + 26, 429],
        [x - 26, 429],
      ],
      "#050505",
    )
    line(
      c,
      [
        [x - 46, 399],
        [x + 46, 399],
      ],
      "#ffc76a",
      1.3,
    )
    flame(c, x - 4, 396, 58, t, x)
  }
  // A real articulated silhouette: knees and elbows solve toward authored targets.
  const hipL = pose.transform([-17, 39]),
    hipR = pose.transform([17, 39])
  const footL: Point = [pose.root[0] - pose.p[4], 540],
    footR: Point = [pose.root[0] + pose.p[4] * 0.65, 540]
  armorLimb(c, [hipL, joint(hipL, footL, 60, 64, 1), footL], 22, "#bb7140")
  armorLimb(c, [hipR, joint(hipR, footR, 60, 64, -1), footR], 23, "#d39b51")
  for (const f of [footL, footR])
    path(
      c,
      [
        [f[0] - 14, f[1] - 6],
        [f[0] + 13, f[1] - 5],
        [f[0] + 23, f[1] + 4],
        [f[0] - 17, f[1] + 5],
      ],
      "#0b0a0a",
      "#ba9352",
      1,
    )
  const shoulderL = pose.transform([-25, -65]),
    shoulderR = pose.transform([24, -62])
  const secondHand: Point = [
    pose.hand[0] - Math.cos(pose.angle) * 13,
    pose.hand[1] - Math.sin(pose.angle) * 13,
  ]
  armorLimb(
    c,
    [shoulderL, joint(shoulderL, secondHand, 55, 48, -1), secondHand],
    18,
    "#b35830",
  )
  path(
    c,
    [
      [-29, -77],
      [30, -75],
      [39, -3],
      [30, 46],
      [-35, 43],
      [-38, -8],
    ].map((p) => pose.transform(p as Point)),
    "#120c0c",
    "#e07837",
    1.2,
  )
  for (let i = 0; i < 9; i++)
    line(
      c,
      [pose.transform([-28, -63 + i * 12]), pose.transform([30, -62 + i * 12])],
      i % 3 ? "#a32b1e" : "#dd7d39",
      1.3,
    )
  for (const x of [-23, 0, 23])
    path(
      c,
      [
        [x - 12, 22],
        [x + 11, 23],
        [x + 17, 65],
        [x - 17, 65],
      ].map((p) => pose.transform(p as Point)),
      "#160e0e",
      "#a63e24",
      1,
    )
  const head = pose.transform([9, -103])
  c.save()
  c.translate(head[0], head[1])
  c.rotate(pose.p[0] - 0.1)
  ellipse(c, 0, 0, 23, 28, "#08090a", "#bb6e36")
  path(
    c,
    [
      [-27, -8],
      [-20, -24],
      [-4, -34],
      [18, -27],
      [30, -8],
      [17, -10],
      [13, 8],
      [-17, 5],
    ],
    "#100e0e",
    "#f29b43",
    1.1,
  )
  c.beginPath()
  c.moveTo(-17, -20)
  c.quadraticCurveTo(-38, -32, -30, -61)
  c.quadraticCurveTo(-29, -35, -9, -24)
  c.closePath()
  c.fillStyle = "#c89148"
  c.fill()
  c.beginPath()
  c.moveTo(17, -23)
  c.quadraticCurveTo(40, -39, 34, -69)
  c.quadraticCurveTo(32, -42, 10, -26)
  c.closePath()
  c.fillStyle = "#ffce70"
  c.fill()
  line(
    c,
    [
      [-15, 4],
      [16, 1],
    ],
    "#ffb45b",
    1,
  )
  line(
    c,
    [
      [-17, 12],
      [5, 16],
      [18, 11],
    ],
    "#a94429",
    2,
  )
  for (let ribbon = 0; ribbon < 2; ribbon++) {
    c.beginPath()
    c.moveTo(-20, -15 + ribbon * 6)
    c.bezierCurveTo(
      -55,
      -18,
      -54 - Math.sin(((t * TAU) / 18) * 5) * 15,
      23,
      -89,
      22 + Math.sin(((t * TAU) / 18) * 6 + ribbon) * 13,
    )
    c.strokeStyle = ribbon ? "#d73b23" : "#f04c27"
    c.lineWidth = 2.4
    c.stroke()
  }
  c.restore()
  armorLimb(
    c,
    [shoulderR, joint(shoulderR, pose.hand, 56, 49, 1), pose.hand],
    20,
    "#f5a34e",
  )
  // Flame trails are past blade positions, not an unrelated looping decoration.
  c.save()
  c.globalCompositeOperation = "screen"
  const speed = Math.hypot(
    pose.tip[0] - poseAt(t - 0.06).tip[0],
    pose.tip[1] - poseAt(t - 0.06).tip[1],
  )
  glow(c, pose.tip[0], pose.tip[1], 28 + Math.min(speed, 25), "#ff9c27", 0.35)
  if (speed > 1.2)
    for (let i = 20; i > 0; i--) {
      const past = poseAt(t - i * 0.014)
      line(
        c,
        [past.hand, past.tip],
        `rgba(255,${55 + (20 - i) * 6},10,${(1 - i / 21) * 0.15})`,
        3 + i * 0.65,
      )
    }
  c.shadowColor = "#ff5f09"
  c.shadowBlur = 20
  line(c, [pose.hand, pose.tip], "#ff7118", 7)
  c.shadowBlur = 7
  line(c, [pose.hand, pose.tip], "#fff9cc", 2)
  c.restore()
  const grip: Point = [
    pose.hand[0] - Math.cos(pose.angle) * 25,
    pose.hand[1] - Math.sin(pose.angle) * 25,
  ]
  line(c, [grip, pose.hand], "#160c08", 7)
  line(c, [grip, pose.hand], "#b78b4b", 1)
  const guard: Point[] = [
    [
      pose.hand[0] + Math.sin(pose.angle) * 10,
      pose.hand[1] - Math.cos(pose.angle) * 10,
    ],
    [
      pose.hand[0] - Math.sin(pose.angle) * 10,
      pose.hand[1] + Math.cos(pose.angle) * 10,
    ],
  ]
  line(c, guard, "#f5c776", 3)
  for (let i = 0; i < 155; i++) {
    const age = ((t / 18) * (2 + (i % 3)) + seed(i + 300)) % 1
    const x = 480 + (seed(i + 20) - 0.5) * 650 + Math.sin(age * 8 + i) * 24
    const y = 555 - age * (150 + seed(i + 500) * 280)
    const a = Math.sin(age * Math.PI) * (0.2 + seed(i + 700) * 0.7)
    c.save()
    c.globalAlpha = a
    c.globalCompositeOperation = "screen"
    if (i % 8 === 0) glow(c, x, y, 10, "#ff6b1a", 0.7)
    line(
      c,
      [
        [x, y],
        [x - 1 - speed * 0.02, y + 2 + seed(i) * 5],
      ],
      i % 3 ? "#ff8e38" : "#ffe89c",
      0.5 + seed(i) * 1.5,
    )
    c.restore()
  }
  const vignette = c.createRadialGradient(480, 320, 180, 480, 320, 570)
  vignette.addColorStop(0, "#00000000")
  vignette.addColorStop(1, "#000000d9")
  c.fillStyle = vignette
  c.fillRect(0, 0, w, h)
  c.fillStyle = "#edc48e"
  c.font = '600 15px "Manrope Variable", sans-serif'
  c.fillText("E N B U", 28, 37)
  c.font = '500 6px "Manrope Variable", sans-serif'
  c.fillStyle = "#a17b60"
  c.fillText("T H E  F L A M E  D A N C E", 29, 51)
  c.textAlign = "right"
  c.fillStyle = "#e8b078"
  c.font = '500 12px "Manrope Variable", sans-serif'
  c.fillText(String(pose.phase + 1).padStart(2, "0"), 925, 90)
  line(
    c,
    [
      [914, 110],
      [914, 160],
    ],
    "#7d4e32",
    0.7,
  )
  c.font = '500 6px "Manrope Variable", sans-serif'
  c.fillText(phaseNames[pose.phase], 925, 184)
  c.textAlign = "left"
  c.font = '500 6px "Manrope Variable", sans-serif'
  c.fillStyle = "#80624d"
  c.fillText("A STUDY IN LIGHT, WEIGHT & AFTERIMAGE", 29, 619)
}

function island(c: CanvasRenderingContext2D) {
  c.beginPath()
  c.moveTo(-30, 615)
  c.bezierCurveTo(150, 598, 225, 630, 345, 682)
  c.bezierCurveTo(470, 714, 500, 756, 410, 792)
  c.bezierCurveTo(280, 853, 85, 868, -35, 824)
  c.closePath()
}
function branch(c: CanvasRenderingContext2D, points: Point[], width: number) {
  const sides: Point[][] = [[], []]
  points.forEach((point, i) => {
    const before = points[Math.max(0, i - 1)],
      after = points[Math.min(points.length - 1, i + 1)]
    const angle =
      Math.atan2(after[1] - before[1], after[0] - before[0]) + Math.PI / 2
    const radius = width * 0.55 * (1 - (i / points.length) * 0.95)
    sides[0].push([
      point[0] + Math.cos(angle) * radius,
      point[1] + Math.sin(angle) * radius,
    ])
    sides[1].push([
      point[0] - Math.cos(angle) * radius,
      point[1] - Math.sin(angle) * radius,
    ])
  })
  path(c, [...sides[0], ...sides[1].reverse()], "#284259", "#0b1a27", 2)
  line(
    c,
    points.map(([x, y]) => [x - 2, y + 1]),
    "#49627a",
    0.65,
  )
}
function blueScene(c: CanvasRenderingContext2D, time: number) {
  const t = time % 18,
    phase = (t * TAU) / 18
  const sky = c.createLinearGradient(0, 0, 540, 900)
  sky.addColorStop(0, "#111e31")
  sky.addColorStop(0.55, "#243e5d")
  sky.addColorStop(1, "#152a43")
  c.fillStyle = sky
  c.fillRect(0, 0, 540, 960)
  for (let i = 0; i < 54; i++) {
    const x = seed(i + 230) * 540,
      y = seed(i + 123) * 480
    c.globalAlpha = 0.12 + Math.sin(phase * 2 + i) ** 2 * 0.35
    ellipse(c, x, y, i % 5 ? 0.5 : 1, i % 5 ? 0.5 : 1, "#d8eafa")
  }
  c.globalAlpha = 1
  glow(c, 436, 416, 65, "#92b9e5", 0.17)
  glow(c, 436, 416, 24, "#e1efff", 0.32)
  ellipse(c, 436, 416, 14, 14, "#d1e5f2")
  ellipse(c, 441, 411, 12, 12, "#2b4664")
  ellipse(c, 432, 419, 3, 2, "#b4ccd9")
  const water = c.createLinearGradient(0, 504, 0, 960)
  water.addColorStop(0, "#263f5b")
  water.addColorStop(1, "#122d45")
  c.fillStyle = water
  c.fillRect(0, 504, 540, 456)
  line(
    c,
    [
      [0, 505],
      [540, 505],
    ],
    "#667d92",
    0.8,
  )
  for (let i = 0; i < 380; i++) {
    const y = 510 + seed(i + 88) * 455
    const x =
      ((seed(i + 89) * 650 + Math.sin(phase * (1 + (i % 2)) + i) * 8 + 650) %
        650) -
      55
    const length = 3 + seed(i + 180) * (8 + (y - 500) * 0.1)
    const reflection = Math.abs(x - 433) < 20 + (y - 500) * 0.23
    line(
      c,
      [
        [x, y],
        [x + length * 0.5, y - 0.6],
        [x + length, y],
      ],
      reflection ? "#c8e1edbb" : "#96b3ca66",
      reflection ? 1.35 : 0.7,
    )
  }
  // Receding, breathing shoreline follows the island contour.
  for (let i = 3; i > 0; i--) {
    c.save()
    c.translate(0, i * 5 + Math.sin(phase * 3 + i) * 2)
    island(c)
    c.strokeStyle = i === 1 ? "#cbdde2c0" : "#9dbccc44"
    c.lineWidth = i === 1 ? 6 : 2
    c.stroke()
    c.restore()
  }
  island(c)
  const grass = c.createLinearGradient(0, 600, 350, 870)
  grass.addColorStop(0, "#1c3445")
  grass.addColorStop(0.6, "#294b5d")
  grass.addColorStop(1, "#1c3e4e")
  c.fillStyle = grass
  c.fill()
  c.strokeStyle = "#0c202d"
  c.lineWidth = 2
  c.stroke()
  c.save()
  island(c)
  c.clip()
  for (let i = 0; i < 370; i++) {
    const x = seed(i + 2000) * 530,
      y = 610 + seed(i + 1800) * 270
    const bend = Math.sin(phase * 2 + i * 0.1) * 2
    line(
      c,
      [
        [x - 2, y],
        [x - 3 + bend, y - 6 - seed(i) * 5],
        [x, y - 2],
        [x + 3 + bend, y - 8],
      ],
      i % 3 ? "#0f2c3b" : "#4b6b79",
      0.9,
    )
  }
  c.beginPath()
  c.moveTo(438, 416)
  c.lineTo(-30, 943)
  c.lineTo(309, 848)
  c.closePath()
  c.fillStyle = "#e3eeff09"
  c.fill()
  c.restore()
  // Tree trunk is a silhouette with carved, moon-facing edges.
  c.save()
  c.translate(Math.sin(phase) * 0.8, 0)
  c.beginPath()
  c.moveTo(47, -20)
  c.bezierCurveTo(77, 142, 86, 357, 72, 557)
  c.bezierCurveTo(65, 637, 43, 683, 7, 721)
  c.bezierCurveTo(67, 715, 74, 687, 89, 668)
  c.bezierCurveTo(82, 715, 69, 744, 48, 757)
  c.bezierCurveTo(117, 741, 131, 725, 135, 693)
  c.bezierCurveTo(148, 720, 177, 731, 202, 725)
  c.bezierCurveTo(169, 685, 160, 620, 155, 543)
  c.bezierCurveTo(143, 338, 161, 161, 180, -20)
  c.closePath()
  const trunk = c.createLinearGradient(40, 0, 190, 0)
  trunk.addColorStop(0, "#172e40")
  trunk.addColorStop(0.6, "#233c52")
  trunk.addColorStop(1, "#385770")
  c.fillStyle = trunk
  c.fill()
  c.strokeStyle = "#091d2b"
  c.lineWidth = 3
  c.stroke()
  branch(
    c,
    [
      [126, 306],
      [225, 257],
      [340, 248],
      [443, 274],
      [540, 258],
    ],
    14,
  )
  branch(
    c,
    [
      [290, 251],
      [362, 202],
      [428, 178],
    ],
    7,
  )
  branch(
    c,
    [
      [164, 244],
      [233, 147],
      [302, 122],
    ],
    13,
  )
  branch(
    c,
    [
      [238, 148],
      [230, 86],
    ],
    5,
  )
  branch(
    c,
    [
      [100, 226],
      [35, 163],
      [-20, 150],
    ],
    15,
  )
  branch(
    c,
    [
      [128, 412],
      [219, 370],
      [252, 333],
    ],
    8,
  )
  for (let i = 0; i < 22; i++) {
    const x = 72 + seed(i + 30) * 78,
      y = 52 + seed(i + 60) * 620
    c.beginPath()
    c.moveTo(x, y)
    c.quadraticCurveTo(
      x + Math.sin(i) * 13,
      y + 30,
      x - 3,
      y + 45 + seed(i) * 30,
    )
    c.strokeStyle = i % 3 ? "#0d2434" : "#57738c"
    c.lineWidth = i % 3 ? 2 : 1
    c.stroke()
  }
  // Hand-drawn canopy and individually moving leaves.
  c.beginPath()
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * TAU
    const r = 1 + Math.sin(i * 2.3) * 0.025
    const x = 195 + Math.cos(a) * 292 * r
    const y = 28 + Math.sin(a) * 119 * r + Math.sin(phase + i * 0.2) * 2
    i ? c.lineTo(x, y) : c.moveTo(x, y)
  }
  c.closePath()
  c.fillStyle = "#182e3c"
  c.fill()
  c.strokeStyle = "#10222f"
  c.lineWidth = 2
  c.stroke()
  const leafPoints: Point[] = [
    [209, 276],
    [240, 252],
    [266, 254],
    [317, 250],
    [354, 227],
    [389, 202],
    [424, 180],
    [454, 274],
    [488, 265],
    [516, 254],
    [240, 171],
    [276, 134],
    [296, 120],
    [223, 101],
    [198, 376],
    [227, 357],
    [253, 333],
    [46, 172],
    [23, 151],
  ]
  for (const [i, [x, y]] of leafPoints.entries()) {
    c.save()
    c.translate(x, y)
    c.rotate(Math.sin(i) + Math.sin(phase * 2 + i) * 0.1)
    c.beginPath()
    c.moveTo(-13, 0)
    c.quadraticCurveTo(-1, -16, 14, 0)
    c.quadraticCurveTo(1, 9, -13, 0)
    c.fillStyle = "#2a4351"
    c.fill()
    c.strokeStyle = "#0c2230"
    c.lineWidth = 1.7
    c.stroke()
    line(
      c,
      [
        [-10, 0],
        [11, 0],
      ],
      "#506774",
      0.6,
    )
    c.restore()
  }
  c.restore()
  const boatX = 383 + Math.sin(phase * 2) * 2,
    boatY = 644 + Math.sin(phase * 3) * 3
  for (let i = 0; i < 3; i++) {
    c.beginPath()
    c.ellipse(boatX, boatY + 27 + i * 5, 117 + i * 6, 23 + i * 5, 0.08, 0.1, 3)
    c.strokeStyle = i ? "#b6cedf44" : "#c6dce7aa"
    c.lineWidth = i ? 1 : 3
    c.stroke()
  }
  c.save()
  c.translate(boatX, boatY)
  c.rotate(0.09 + Math.sin(phase * 3) * 0.025)
  c.beginPath()
  c.moveTo(-114, -29)
  c.bezierCurveTo(-93, 18, -28, 65, 70, 40)
  c.quadraticCurveTo(110, 26, 117, -9)
  c.closePath()
  c.fillStyle = "#1c344b"
  c.fill()
  c.strokeStyle = "#0b2030"
  c.lineWidth = 3
  c.stroke()
  for (let i = 0; i < 4; i++) {
    c.beginPath()
    c.moveTo(-106 + i * 5, -12 + i * 9)
    c.quadraticCurveTo(-6, 55 + i * 3, 105 - i * 3, 10 + i * 6)
    c.strokeStyle = "#0e2638"
    c.lineWidth = 2
    c.stroke()
  }
  c.beginPath()
  c.ellipse(0, -17, 116, 27, 0.06, 0, TAU)
  c.fillStyle = "#36566d"
  c.fill()
  c.strokeStyle = "#0a1c2b"
  c.lineWidth = 4
  c.stroke()
  c.beginPath()
  c.ellipse(0, -17, 103, 18, 0.06, 0, TAU)
  c.fillStyle = "#142d42"
  c.fill()
  c.strokeStyle = "#698494"
  c.lineWidth = 1
  c.stroke()
  for (const x of [-53, 8, 61])
    path(
      c,
      [
        [x - 8, -36],
        [x + 9, -34],
        [x + 22, -1],
        [x + 6, 1],
      ],
      "#3d5e73",
      "#0c2131",
      1.4,
    )
  c.restore()
  c.beginPath()
  c.moveTo(276 + Math.sin(phase * 2) * 2, boatY - 36)
  c.quadraticCurveTo(255, 709, 213, 696)
  c.strokeStyle = "#0d2435"
  c.lineWidth = 3
  c.stroke()
  ellipse(c, 213, 696, 12, 7, "#314d5c", "#0c2130")
  const wake = smooth((t - 7.2) / 0.65) * (1 - smooth((t - 15.2) / 0.7))
  const breath = Math.sin(phase * 3) * 1.5
  c.save()
  c.translate(159, 687 + breath)
  c.rotate(Math.sin(phase) * 0.015)
  // Our sleepy duck, drawn from separate body, head, wings and headphones.
  c.beginPath()
  c.moveTo(-26, -39)
  c.bezierCurveTo(-29, -12, -44, 3, -39, 16)
  c.bezierCurveTo(-32, 34, 15, 33, 33, 17)
  c.quadraticCurveTo(17, 1, 16, -39)
  c.closePath()
  c.fillStyle = "#c3d5d7"
  c.fill()
  c.strokeStyle = "#0b2533"
  c.lineWidth = 2.6
  c.stroke()
  const headY = -50 - wake * 9
  ellipse(c, -5, headY, 26, 31, "#d6e0dc", "#102432")
  c.beginPath()
  c.arc(-5, headY - 4, 30, Math.PI, TAU)
  c.strokeStyle = "#091b29"
  c.lineWidth = 7
  c.stroke()
  c.beginPath()
  c.arc(-5, headY - 4, 31, Math.PI + 0.1, TAU - 0.1)
  c.strokeStyle = "#5d7c90"
  c.lineWidth = 2
  c.stroke()
  ellipse(c, -31, headY + 1, 8, 16, "#284d65", "#0b2031", 0.03)
  ellipse(c, 21, headY - 1, 7, 15, "#203c52", "#0b2031", -0.1)
  ellipse(c, 12, headY + 10, 17, 8, "#d89e30", "#192b31", 0.08)
  if (wake > 0.7 && !(Math.sin(phase * 7) > 0.985)) {
    ellipse(c, -6, headY - 2, 2, 3.3, "#152b34")
    ellipse(c, 8, headY - 3, 1.8, 3.1, "#152b34")
  } else {
    c.beginPath()
    c.arc(-8, headY - 5, 5, 0.3, 2.6)
    c.strokeStyle = "#19313a"
    c.lineWidth = 1.8
    c.stroke()
  }
  c.beginPath()
  c.moveTo(-28, -7)
  c.quadraticCurveTo(-21, 8, -4, 1)
  c.quadraticCurveTo(8, -6, 18, 3)
  c.strokeStyle = "#183341"
  c.lineWidth = 2
  c.stroke()
  ellipse(c, -15, 27, 12, 19, "#dbaa3e", "#19303b", -0.23)
  ellipse(c, 11, 28, 11, 18, "#e6af38", "#19303b", 0.31)
  c.restore()
  const fall = Math.max(0, Math.min(1, (t - 3) / 8))
  if (t > 3 && t < 17.6) {
    const leafX = mix(238, 157, fall) + Math.sin(fall * Math.PI * 3) * 27
    const leafY = mix(260, 592 + breath, smooth(fall))
    c.save()
    c.globalAlpha = 1 - smooth((t - 16) / 1.6)
    c.translate(leafX, leafY)
    c.rotate(fall * Math.PI * 3.1)
    c.beginPath()
    c.moveTo(-17, 0)
    c.quadraticCurveTo(-1, -24, 18, 0)
    c.quadraticCurveTo(-1, 17, -17, 0)
    c.fillStyle = "#385263"
    c.fill()
    c.strokeStyle = "#112c3a"
    c.lineWidth = 2
    c.stroke()
    line(
      c,
      [
        [-14, 0],
        [15, 0],
      ],
      "#76909b",
      1,
    )
    for (const x of [-8, -1, 6])
      line(
        c,
        [
          [x, 0],
          [x + 3, -6],
        ],
        "#78909a",
        0.6,
      )
    c.restore()
  }
  for (let i = 0; i < 13; i++) {
    const x = 230 + seed(i + 77) * 270 + Math.sin(phase + i) * 12
    const y = 280 + seed(i + 78) * 380 + Math.cos(phase * 2 + i) * 8
    const alpha = Math.max(0, Math.sin(phase * 2 + i)) ** 5 * 0.45
    glow(c, x, y, 5, "#c7eaff", alpha)
    ellipse(c, x, y, 1, 1, `rgba(210,235,255,${alpha})`)
  }
  for (let i = 0; i < 54; i++) {
    const fall = ((t / 18) * 4 + seed(i)) % 1
    const x = seed(i + 808) * 620 - 40 - fall * 30,
      y = fall * 1040 - 40
    line(
      c,
      [
        [x, y],
        [x - 2, y + 9],
      ],
      "#bdd4e013",
      0.7,
    )
  }
  for (let i = 0; i < 1600; i++) {
    c.fillStyle = i % 2 ? "#e3eeff04" : "#010c1809"
    c.fillRect(seed(i + 900) * 540, seed(i + 901) * 960, 0.7, 0.7)
  }
  const edge = c.createRadialGradient(290, 500, 130, 270, 480, 650)
  edge.addColorStop(0, "#00000000")
  edge.addColorStop(1, "#020d2370")
  c.fillStyle = edge
  c.fillRect(0, 0, 540, 960)
}

/** Deterministic Canvas2D art. The preview and native Remotion export call this exact function. */
export function drawStudy(
  c: CanvasRenderingContext2D,
  id: StudyId,
  time: number,
  width: number,
  height: number,
) {
  c.save()
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, width, height)
  c.scale(
    width / (id === "enbu" ? 960 : 540),
    height / (id === "enbu" ? 646 : 960),
  )
  c.lineCap = "round"
  c.lineJoin = "round"
  c.lineWidth = 1
  if (id === "enbu") fireScene(c, time)
  else blueScene(c, time)
  c.restore()
}
