import * as T from "three"
import { getRemotionEnvironment, staticFile } from "remotion"
import { publicAssetUrl } from "../../media/files"

type V = [number, number, number]
const stone = new T.MeshStandardMaterial({
  color: "#24272b",
  roughness: 0.36,
  metalness: 0.2,
})
const black = new T.MeshStandardMaterial({
  color: "#13151a",
  roughness: 0.24,
  metalness: 0.55,
})
const silver = new T.MeshStandardMaterial({
  color: "#b8b9bc",
  roughness: 0.22,
  metalness: 0.93,
})
const ivory = new T.MeshStandardMaterial({
  color: "#e8e4dd",
  roughness: 0.28,
  metalness: 0.15,
})
const blue = new T.MeshStandardMaterial({
  color: "#2769e8",
  roughness: 0.26,
  metalness: 0.4,
})
const darkEye = new T.MeshStandardMaterial({
  color: "#07090b",
  roughness: 0.16,
  metalness: 0.3,
})
let sculptureGeometry: T.BufferGeometry | null = null
let sculptureMaterial: T.MeshStandardMaterial | null = null
let sculptureLoading: Promise<void> | null = null
/** Geometry-only CC0 master; materials, lights and animation are authored here.
 * See assets/editorial-models/ATTRIBUTION.md. No source-video pixels are loaded. */
export function preloadEditorialModels() {
  if (!sculptureLoading)
    sculptureLoading = (async () => {
      const url = (file: string) =>
        getRemotionEnvironment().isRendering
          ? staticFile(`references/editorial-geometry/${file}`)
          : publicAssetUrl(`/references/editorial-geometry/${file}`)
      const [metadataResponse, bufferResponse] = await Promise.all([
        fetch(url("marble_bust_01.gltf")),
        fetch(url("marble_bust_01.bin")),
      ])
      if (!metadataResponse.ok || !bufferResponse.ok)
        throw new Error("No se pudo cargar la geometría escultórica local.")
      const metadata = await metadataResponse.json(),
        buffer = await bufferResponse.arrayBuffer()
      const geometry = new T.BufferGeometry()
      for (const [name, index] of Object.entries(
        metadata.meshes[0].primitives[0].attributes,
      )) {
        if (name !== "POSITION" && name !== "NORMAL" && name !== "TEXCOORD_0")
          continue
        const accessor = metadata.accessors[(index as number)],
          view = metadata.bufferViews[accessor.bufferView]
        const size = name === "TEXCOORD_0" ? 2 : 3
        geometry.setAttribute(
          name === "POSITION"
            ? "position"
            : name === "NORMAL"
              ? "normal"
              : "uv",
          new T.BufferAttribute(
            new Float32Array(
              buffer,
              (view.byteOffset || 0) + (accessor.byteOffset || 0),
              accessor.count * size,
            ),
            size,
          ),
        )
      }
      const index =
          metadata.accessors[metadata.meshes[0].primitives[0].indices],
        view = metadata.bufferViews[index.bufferView]
      geometry.setIndex(
        new T.BufferAttribute(
          new Uint16Array(
            buffer,
            (view.byteOffset || 0) + (index.byteOffset || 0),
            index.count,
          ),
          1,
        ),
      )
      geometry.center()
      const normal = await new T.TextureLoader().loadAsync(
        url("marble_bust_01_nor_gl_2k.jpg"),
      )
      normal.flipY = false
      sculptureMaterial = new T.MeshStandardMaterial({
        color: "#202328",
        roughness: 0.57,
        metalness: 0.12,
        normalMap: normal,
        normalScale: new T.Vector2(0.8, 0.8),
      })
      sculptureGeometry = geometry
    })()
  return sculptureLoading
}

function add(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  material: T.Material,
  p: V = [0, 0, 0],
  scale: V = [1, 1, 1],
) {
  const mesh = new T.Mesh(geometry, material)
  mesh.position.set(...p)
  mesh.scale.set(...scale)
  parent.add(mesh)
  return mesh
}
function oval(
  parent: T.Object3D,
  p: V,
  scale: V,
  material: T.Material = stone,
) {
  return add(parent, new T.SphereGeometry(1, 32, 24), material, p, scale)
}
function tube(
  parent: T.Object3D,
  points: V[],
  radius: number,
  material: T.Material = stone,
) {
  return add(
    parent,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      36,
      radius,
      10,
      false,
    ),
    material,
  )
}
function ring(
  parent: T.Object3D,
  radius: number,
  thickness: number,
  material: T.Material,
  p: V = [0, 0, 0],
) {
  return add(
    parent,
    new T.TorusGeometry(radius, thickness, 12, 72),
    material,
    p,
  )
}
function rounded(
  parent: T.Object3D,
  w: number,
  h: number,
  d: number,
  radius: number,
  material: T.Material,
  p: V = [0, 0, 0],
) {
  const s = new T.Shape(),
    x = -w / 2,
    y = -h / 2,
    r = radius
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const g = new T.ExtrudeGeometry(s, {
    depth: d,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: Math.min(r * 0.25, 0.035),
    bevelThickness: 0.025,
    curveSegments: 10,
  })
  return add(parent, g, material, p)
}
function texture(
  width: number,
  height: number,
  draw: (c: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const c = canvas.getContext("2d")!
  draw(c)
  const map = new T.CanvasTexture(canvas)
  map.colorSpace = T.SRGBColorSpace
  map.anisotropy = 4
  return map
}
function texturedPlane(
  parent: T.Object3D,
  width: number,
  height: number,
  map: T.Texture,
  p: V,
) {
  return add(
    parent,
    new T.PlaneGeometry(width, height),
    new T.MeshBasicMaterial({ map }),
    p,
  )
}
function lathe(
  parent: T.Object3D,
  profile: number[][],
  material: T.Material,
  p: V = [0, 0, 0],
) {
  return add(
    parent,
    new T.LatheGeometry(
      profile.map(([r, y]) => new T.Vector2(r, y)),
      72,
    ),
    material,
    p,
  )
}
const rand = (n: number) => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

/** Parametric sculpt: continuous facial surface, not an imported mesh or image. */
function head(skull = false) {
  const group = new T.Group()
  const material = skull ? ivory : stone
  const geometry = new T.SphereGeometry(1, 80, 64)
  const a = geometry.attributes.position
  const gaussian = (
    x: number,
    y: number,
    cx: number,
    cy: number,
    sx: number,
    sy: number,
  ) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2)
  for (let i = 0; i < a.count; i++) {
    const x = a.getX(i),
      y = a.getY(i),
      z = a.getZ(i)
    const jaw = 0.9 - 0.18 * Math.exp(-(((y + 0.7) / 0.35) ** 2))
    let depth = z * 0.77
    if (z > 0) {
      depth += 0.28 * gaussian(x, y, 0, 0.02, 0.13, 0.5) // nasal bridge
      depth += 0.25 * gaussian(x, y, 0, -0.17, 0.17, 0.14)
      depth -=
        (skull ? 0.55 : 0.18) *
        (gaussian(x, y, -0.36, 0.18, 0.2, 0.17) +
          gaussian(x, y, 0.36, 0.18, 0.2, 0.17))
      depth +=
        0.1 *
        (gaussian(x, y, -0.43, -0.14, 0.27, 0.22) +
          gaussian(x, y, 0.43, -0.14, 0.27, 0.22))
      depth += 0.07 * gaussian(x, y, 0, -0.46, 0.32, 0.15)
      depth += 0.13 * gaussian(x, y, 0, -0.79, 0.35, 0.2)
    }
    a.setXYZ(i, x * jaw, y * 1.17, depth)
  }
  geometry.computeVertexNormals()
  add(group, geometry, material)
  for (const sign of [-1, 1]) {
    if (skull) {
      oval(group, [sign * 0.34, 0.23, 0.49], [0.23, 0.22, 0.09], darkEye)
      oval(group, [sign * 0.075, -0.2, 0.91], [0.055, 0.11, 0.045], darkEye)
    } else {
      oval(group, [sign * 0.355, 0.19, 0.65], [0.15, 0.078, 0.065], stone)
      tube(
        group,
        [
          [sign * 0.18, 0.18, 0.7],
          [sign * 0.34, 0.28, 0.74],
          [sign * 0.51, 0.19, 0.61],
        ],
        0.036,
      )
      tube(
        group,
        [
          [sign * 0.18, 0.12, 0.67],
          [sign * 0.35, 0.1, 0.72],
          [sign * 0.51, 0.19, 0.61],
        ],
        0.022,
      )
      tube(
        group,
        [
          [sign * 0.16, 0.38, 0.68],
          [sign * 0.34, 0.43, 0.72],
          [sign * 0.56, 0.32, 0.59],
        ],
        0.055,
      )
      oval(group, [sign * 0.88, -0.04, 0], [0.12, 0.26, 0.16])
      ring(group, 0.14, 0.035, stone, [sign * 0.87, -0.04, 0.13]).scale.set(
        0.55,
        1.35,
        0.6,
      )
      oval(group, [sign * 0.14, -0.26, 0.92], [0.12, 0.085, 0.14])
      oval(group, [sign * 0.115, -0.3, 1.015], [0.045, 0.025, 0.025], darkEye)
    }
  }
  if (skull) {
    oval(group, [0, -0.66, 0.55], [0.5, 0.19, 0.2], darkEye)
    for (let i = 0; i < 12; i++) {
      const x = (i - 5.5) * 0.073,
        z = 0.83 - x * x * 0.8
      rounded(group, 0.066, 0.15, 0.08, 0.019, ivory, [x, -0.64, z])
      rounded(group, 0.065, 0.12, 0.07, 0.018, ivory, [x, -0.81, z - 0.03])
    }
    tube(
      group,
      [
        [-0.65, -0.3, 0.1],
        [-0.62, -0.85, 0.5],
        [0, -1.03, 0.63],
        [0.62, -0.85, 0.5],
        [0.65, -0.3, 0.1],
      ],
      0.09,
      ivory,
    )
    for (let i = 0; i < 11; i++)
      tube(
        group,
        [
          [-0.6 + i * 0.08, 0.75, 0.45],
          [-0.55 + i * 0.08, 0.85, 0.39],
          [-0.58 + i * 0.09, 0.96, 0.31],
        ],
        0.004,
        stone,
      )
  } else {
    tube(
      group,
      [
        [-0.28, -0.48, 0.79],
        [-0.12, -0.44, 0.88],
        [0, -0.47, 0.89],
        [0.12, -0.44, 0.88],
        [0.28, -0.48, 0.79],
      ],
      0.041,
    )
    tube(
      group,
      [
        [-0.26, -0.51, 0.8],
        [0, -0.55, 0.9],
        [0.26, -0.51, 0.8],
      ],
      0.042,
    )
    // Hand-carved curls follow the scalp and beard; deterministic in every frame.
    for (let i = 0; i < 155; i++) {
      const az = i * 2.399963,
        elevation = 0.25 + rand(i) * 0.72
      const r = Math.sqrt(1 - elevation * elevation)
      const curl = ring(group, 0.075 + rand(i + 3) * 0.04, 0.033, stone, [
        Math.cos(az) * r * 0.98,
        elevation * 1.26,
        Math.sin(az) * r * 0.86,
      ])
      curl.rotation.set(rand(i) * 2.2, az, rand(i + 1) * 3)
    }
    for (let i = 0; i < 85; i++) {
      const x = (rand(i + 200) - 0.5) * 1.25,
        y = -0.46 - rand(i + 600) * 0.72
      if (Math.abs(x) < 0.32 && y > -0.65) continue
      const curl = ring(group, 0.038 + rand(i) * 0.025, 0.021, stone, [
        x,
        y,
        0.73 - x * x * 0.35 - (y + 0.6) ** 2 * 0.6,
      ])
      curl.rotation.z = rand(i) * 4
    }
  }
  return group
}

function statue() {
  const group = new T.Group()
  if (sculptureGeometry) {
    const mesh = add(group, sculptureGeometry.clone(), sculptureMaterial!)
    mesh.rotation.y = -0.3
    return group
  }
  const face = head()
  face.position.set(0, 1.95, 0)
  face.rotation.set(-0.08, -0.26, -0.12)
  group.add(face)
  oval(group, [0, 0.72, -0.05], [0.43, 0.65, 0.4])
  oval(group, [0, -0.4, -0.1], [1.16, 1.15, 0.52])
  for (const s of [-1, 1]) {
    oval(group, [s * 0.68, 0.05, 0.3], [0.63, 0.39, 0.26])
    oval(group, [s * 1.04, -0.02, -0.06], [0.4, 0.47, 0.42])
    tube(
      group,
      [
        [s * 0.1, 0.47, 0.39],
        [s * 0.44, 0.48, 0.37],
        [s * 0.8, 0.33, 0.33],
      ],
      0.055,
    )
    for (let i = 0; i < 3; i++)
      oval(group, [s * 0.28, -0.55 - i * 0.28, 0.43], [0.28, 0.18, 0.12])
  }
  // Bent forearm / contemplative hand, with individually articulated fingers.
  tube(
    group,
    [
      [-1.06, 0, 0],
      [-1.34, -0.66, 0.2],
      [-0.96, -0.84, 0.67],
      [-0.4, 0.69, 0.99],
    ],
    0.22,
  )
  oval(group, [-0.37, 0.8, 1], [0.19, 0.3, 0.12])
  for (let i = 0; i < 4; i++)
    tube(
      group,
      [
        [-0.5 + i * 0.09, 0.86, 1.08],
        [-0.4 + i * 0.07, 1.12 + (i === 1 ? 0.23 : 0), 1.11],
        [-0.34 + i * 0.07, 1.2 + (i === 1 ? 0.25 : 0), 1.01],
      ],
      0.048,
    )
  tube(
    group,
    [
      [1.12, 0.06, -0.04],
      [1.42, -0.8, 0.04],
      [0.64, -1.35, 0.74],
      [-0.02, -1.14, 0.88],
    ],
    0.26,
  )
  oval(group, [0.04, -1.14, 0.86], [0.3, 0.14, 0.13])
  for (let i = 0; i < 4; i++)
    tube(
      group,
      [
        [0.12, -1.08 - i * 0.07, 0.96],
        [-0.16, -1.09 - i * 0.07, 1],
        [-0.31, -1.13 - i * 0.07, 0.88],
      ],
      0.043,
    )
  // A continuous pleated sheet, not separate disconnected cylinders.
  const cloth = new T.PlaneGeometry(2.7, 2.7, 70, 65)
  const p = cloth.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      u = (x + 1.35) / 2.7
    p.setXYZ(
      i,
      x,
      y - 1.35 + Math.sin(u * Math.PI) * 0.22,
      0.31 +
        Math.sin(u * 42 + y * 2.7) * (0.065 + (1.35 - y) * 0.023) +
        Math.cos(u * Math.PI) * 0.14,
    )
  }
  cloth.computeVertexNormals()
  add(
    group,
    cloth,
    new T.MeshStandardMaterial({
      color: "#282b2e",
      roughness: 0.54,
      metalness: 0.12,
      side: T.DoubleSide,
    }),
  )
  for (let i = 0; i < 8; i++)
    tube(
      group,
      [
        [0.98, 0.39 - i * 0.1, 0.21],
        [0.2, 0.18 - i * 0.11, 0.55],
        [-0.8, -0.1 - i * 0.15, 0.36],
      ],
      0.055,
    )
  lathe(
    group,
    [
      [0, -2.92],
      [0.96, -2.92],
      [0.98, -2.85],
      [0.85, -2.76],
      [0.83, -2.65],
      [0, -2.65],
    ],
    black,
  )
  return group
}

function chessPiece(queen: boolean, material: T.Material) {
  const group = new T.Group()
  lathe(
    group,
    [
      [0, 0],
      [0.65, 0],
      [0.69, 0.08],
      [0.66, 0.19],
      [0.53, 0.24],
      [0.49, 0.34],
      [0.53, 0.41],
      [0.37, 0.5],
      [0.26, 0.7],
      [0.19, 1.1],
      [0.28, 1.39],
      [0.4, 1.48],
      [0.38, 1.59],
      [0.3, 1.67],
      [0.43, 1.9],
      [0.38, 2.05],
      [0, 2.05],
    ],
    material,
  )
  if (queen) {
    for (let i = 0; i < 9; i++)
      oval(
        group,
        [
          Math.cos((i * Math.PI * 2) / 9) * 0.36,
          2.08,
          Math.sin((i * Math.PI * 2) / 9) * 0.36,
        ],
        [0.075, 0.12, 0.075],
        material,
      )
    oval(group, [0, 2.16, 0], [0.14, 0.14, 0.14], material)
  } else {
    rounded(group, 0.15, 0.56, 0.13, 0.03, material, [0, 2.3, -0.07])
    rounded(group, 0.48, 0.15, 0.13, 0.03, material, [0, 2.37, -0.07])
  }
  return group
}
function chess() {
  const group = new T.Group(),
    king = chessPiece(false, black),
    queen = chessPiece(true, ivory)
  king.position.set(-0.6, -1.25, 0)
  king.rotation.set(0, -0.3, -0.08)
  queen.position.set(0.8, -0.77, 0.5)
  queen.rotation.set(0.2, 0.5, -1.27)
  group.add(king, queen)
  return group
}
function target() {
  const group = new T.Group()
  for (let i = 5; i >= 0; i--) {
    const r = 0.3 + i * 0.25
    add(group, new T.CylinderGeometry(r, r, 0.07, 96), i % 2 ? blue : ivory, [
      0,
      0,
      (5 - i) * 0.04,
    ]).rotation.x = Math.PI / 2
  }
  const dart = new T.Group()
  tube(
    dart,
    [
      [0, 0, 0.3],
      [0.4, 0.45, 1.2],
      [0.8, 0.9, 2],
    ],
    0.035,
    silver,
  )
  const tip = add(
    dart,
    new T.ConeGeometry(0.1, 0.38, 24),
    silver,
    [0.025, 0.025, 0.4],
  )
  tip.rotation.set(-0.8, 0, 0.55)
  for (let i = 0; i < 3; i++) {
    const fin = rounded(dart, 0.35, 0.65, 0.035, 0.04, blue, [0.77, 0.85, 1.83])
    fin.rotation.set(0.4, (i * Math.PI) / 3, -0.55)
  }
  group.add(dart)
  group.rotation.set(-0.13, -0.32, -0.08)
  return group
}
function editingScreen(variant = 0) {
  const group = new T.Group()
  const map = texture(1200, 740, (c) => {
    c.fillStyle = "#18191d"
    c.fillRect(0, 0, 1200, 740)
    c.fillStyle = "#303137"
    c.fillRect(0, 0, 1200, 32)
    c.fillStyle = "#aaaeb9"
    c.font = '14px "Inter Variable"'
    c.fillText(
      "File    Edit    Composition    Layer    Effect    Animation    View",
      18,
      22,
    )
    c.strokeStyle = "#454750"
    c.lineWidth = 1
    for (const x of [210, 940]) {
      c.beginPath()
      c.moveTo(x, 32)
      c.lineTo(x, 480)
      c.stroke()
    }
    for (const y of [80, 480, 525]) {
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(1200, y)
      c.stroke()
    }
    c.fillStyle = "#101115"
    c.fillRect(230, 95, 690, 365)
    c.fillStyle = variant % 2 ? "#6b4caa" : "#cb663c"
    c.fillRect(420, 165, 320, 210)
    c.fillStyle = "#efeee8"
    c.font = '900 76px "Inter Variable"'
    c.fillText(variant % 2 ? "CREATE." : "EDITING", 440, 290)
    c.font = '12px "Inter Variable"'
    c.fillStyle = "#b3b5be"
    for (let i = 0; i < 13; i++) {
      c.fillText(
        ["Transform", "Position", "Scale", "Rotation", "Opacity"][i % 5],
        24,
        100 + i * 25,
      )
      c.fillRect(965, 100 + i * 22, 140, 4)
    }
    for (let row = 0; row < 7; row++) {
      c.fillStyle = "#292a30"
      c.fillRect(0, 535 + row * 27, 1200, 25)
      c.fillStyle = "#aaaeb8"
      c.fillText(
        `${row + 1}    ${["Title", "Camera", "Artwork", "Mask", "Sound", "Adjustment", "Background"][row]}`,
        18,
        552 + row * 27,
      )
      for (let i = 0; i < 5; i++) {
        c.fillStyle = ["#587baa", "#977fbb", "#a7a75c", "#b77d85"][row % 4]
        c.fillRect(
          290 + i * 165 + rand(row * 6 + i) * 30,
          538 + row * 27,
          80 + rand(i + row) * 80,
          18,
        )
      }
    }
    c.fillStyle = "#6d91ed"
    c.fillRect(610 + variant * 30, 490, 2, 250)
  })
  rounded(group, 4, 2.47, 0.07, 0.05, black)
  texturedPlane(group, 3.94, 2.43, map, [0, 0, 0.106])
  return group
}
function camera() {
  const group = new T.Group()
  rounded(group, 1.9, 1.12, 0.6, 0.17, black)
  rounded(group, 0.8, 0.3, 0.3, 0.08, black, [-0.2, 0.65, 0.15])
  for (let i = 0; i < 6; i++)
    ring(group, 0.46 + i * 0.008, 0.045, i % 2 ? silver : black, [
      0.12,
      0,
      0.63 + i * 0.065,
    ])
  add(
    group,
    new T.CircleGeometry(0.43, 64),
    new T.MeshPhysicalMaterial({
      color: "#142a46",
      roughness: 0.08,
      metalness: 0.8,
      clearcoat: 1,
    }),
    [0.12, 0, 1],
  )
  for (let i = 0; i < 5; i++)
    ring(group, 0.12 + i * 0.06, 0.007, silver, [0.12, 0, 1.004])
  oval(group, [0.65, 0.63, 0.25], [0.16, 0.05, 0.16], silver)
  return group
}
function foil() {
  const g = new T.SphereGeometry(0.9, 48, 32),
    p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const f =
      1 +
      Math.sin(p.getX(i) * 27 + p.getY(i) * 21) * 0.06 +
      Math.sin(p.getZ(i) * 23 - p.getX(i) * 18) * 0.08
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 1.2, p.getZ(i) * f)
  }
  g.computeVertexNormals()
  return new T.Mesh(g, silver)
}
function lips() {
  const group = new T.Group(),
    mat = new T.MeshStandardMaterial({
      color: "#39363d",
      roughness: 0.28,
      metalness: 0.3,
    })
  tube(
    group,
    [
      [-0.9, 0, 0],
      [-0.45, 0.3, 0.1],
      [-0.16, 0.36, 0.13],
      [0, 0.25, 0.2],
      [0.16, 0.36, 0.13],
      [0.45, 0.3, 0.1],
      [0.9, 0, 0],
    ],
    0.15,
    mat,
  )
  tube(
    group,
    [
      [-0.9, 0, 0],
      [-0.45, -0.26, 0.1],
      [0, -0.37, 0.15],
      [0.45, -0.26, 0.1],
      [0.9, 0, 0],
    ],
    0.17,
    mat,
  )
  oval(group, [0, -0.03, -0.08], [0.8, 0.23, 0.08], darkEye)
  for (let i = 0; i < 8; i++)
    rounded(group, 0.15, 0.2, 0.06, 0.035, ivory, [(i - 3.5) * 0.175, 0.06, 0])
  group.rotation.z = -0.18
  return group
}
function handshake() {
  const group = new T.Group()
  for (const s of [-1, 1]) {
    const hand = new T.Group()
    rounded(hand, 0.9, 0.48, 0.3, 0.13, ivory, [s * 0.2, 0, 0])
    rounded(hand, 1.1, 0.6, 0.35, 0.05, black, [s * 1.1, 0, -0.04])
    for (let i = 0; i < 4; i++)
      tube(
        hand,
        [
          [s * 0.2, 0.18 - i * 0.12, 0.2],
          [-s * 0.3, 0.14 - i * 0.12, 0.28],
          [-s * 0.4, 0.09 - i * 0.12, 0.1],
        ],
        0.075,
        ivory,
      )
    tube(
      hand,
      [
        [s * 0.45, 0.15, 0.13],
        [0, 0.37, 0.16],
        [-s * 0.12, 0.22, 0.25],
      ],
      0.1,
      ivory,
    )
    hand.rotation.z = s * 0.18
    group.add(hand)
  }
  return group
}
function graphics() {
  const group = new T.Group()
  const objects = [foil(), lips(), camera(), handshake()]
  objects.forEach((object, i) => {
    object.position.set(i % 2 ? 1.2 : -1.2, i < 2 ? 1.05 : -1.1, 0)
    object.scale.setScalar(i === 2 ? 0.74 : 0.85)
    group.add(object)
  })
  return group
}
function flowerArtwork() {
  const group = new T.Group()
  rounded(group, 3.1, 3.5, 0.1, 0.02, silver)
  const background = new T.MeshStandardMaterial({
    color: "#87b8bd",
    roughness: 0.9,
  })
  rounded(group, 2.92, 3.32, 0.025, 0.01, background, [0, 0, 0.13])
  const stem = new T.MeshStandardMaterial({ color: "#306256", roughness: 0.8 })
  for (let i = 0; i < 10; i++) {
    const x = (rand(i + 20) - 0.5) * 2.25,
      y = (rand(i + 2) - 0.5) * 2.1
    tube(
      group,
      [
        [x * 0.3, -1.5, 0.25],
        [x * 0.7, y - 0.4, 0.28],
        [x, y, 0.32],
      ],
      0.014,
      stem,
    )
    const petal = new T.MeshStandardMaterial({
      color: ["#d8dcd3", "#9297bd", "#5e76a6", "#c8c2a7"][i % 4],
      roughness: 0.75,
      side: T.DoubleSide,
    })
    for (let p = 0; p < 24; p++) {
      const angle = (p * Math.PI) / 6 + (p > 11 ? 0.2 : 0)
      const geometry = new T.PlaneGeometry(1, 1, 8, 12)
      const vertices = geometry.attributes.position
      for (let n = 0; n < vertices.count; n++) {
        const u = vertices.getY(n) + 0.5,
          v = vertices.getX(n)
        vertices.setXYZ(
          n,
          v * Math.pow(Math.sin(u * Math.PI), 0.75) * 0.22,
          u * (p > 11 ? 0.23 : 0.34),
          Math.sin(u * Math.PI) * 0.1 +
            Math.sin(v * Math.PI) * 0.025 +
            u * u * 0.06,
        )
      }
      geometry.computeVertexNormals()
      const leaf = add(group, geometry, petal, [x, y, p > 11 ? 0.4 : 0.35])
      leaf.rotation.set(Math.sin(i * 2) * 0.12, Math.cos(i) * 0.17, angle)
    }
    const center = new T.MeshStandardMaterial({
      color: "#6c6747",
      roughness: 0.9,
    })
    oval(group, [x, y, 0.45], [0.047, 0.047, 0.025], center)
    for (let j = 0; j < 14; j++)
      oval(
        group,
        [x + Math.sin(j * 2.4) * 0.045, y + Math.cos(j * 2.4) * 0.045, 0.47],
        [0.009, 0.012, 0.012],
        ivory,
      )
  }
  return group
}
function clock() {
  const group = new T.Group()
  const map = texture(1024, 1024, (c) => {
    c.fillStyle = "#ece4d2"
    c.fillRect(0, 0, 1024, 1024)
    c.translate(512, 512)
    c.strokeStyle = "#302a22"
    c.fillStyle = "#302a22"
    for (let i = 0; i < 60; i++) {
      c.save()
      c.rotate((i * Math.PI) / 30)
      c.lineWidth = i % 5 ? 2 : 5
      c.beginPath()
      c.moveTo(0, -433)
      c.lineTo(0, i % 5 ? -418 : -399)
      c.stroke()
      c.restore()
    }
    c.font = "48px Georgia"
    c.textAlign = "center"
    c.textBaseline = "middle"
    const numerals = [
      "XII",
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
    ]
    numerals.forEach((n, i) =>
      c.fillText(
        n,
        Math.sin((i * Math.PI) / 6) * 357,
        -Math.cos((i * Math.PI) / 6) * 357,
      ),
    )
    c.font = "20px Georgia"
    c.fillText("CHRONOGRAPH", 0, -140)
    c.font = "13px Georgia"
    c.fillText("PRECISION · 1886", 0, -108)
    for (const x of [-180, 180]) {
      c.lineWidth = 2
      c.beginPath()
      c.arc(x, 95, 94, 0, Math.PI * 2)
      c.stroke()
      for (let i = 0; i < 12; i++) {
        c.beginPath()
        c.moveTo(
          x + Math.sin((i * Math.PI) / 6) * 85,
          95 + Math.cos((i * Math.PI) / 6) * 85,
        )
        c.lineTo(
          x + Math.sin((i * Math.PI) / 6) * 74,
          95 + Math.cos((i * Math.PI) / 6) * 74,
        )
        c.stroke()
      }
    }
  })
  const gold = new T.MeshStandardMaterial({
    color: "#bca778",
    metalness: 0.82,
    roughness: 0.28,
  })
  add(group, new T.CylinderGeometry(1.1, 1.1, 0.21, 96), gold).rotation.x =
    Math.PI / 2
  ring(group, 1.05, 0.075, gold, [0, 0, 0.13])
  add(
    group,
    new T.CircleGeometry(0.97, 96),
    new T.MeshBasicMaterial({ map }),
    [0, 0, 0.116],
  )
  for (const [length, width, angle] of [
    [0.53, 0.027, -0.8],
    [0.78, 0.018, 0.9],
    [0.8, 0.006, 3.2],
  ]) {
    const hand = rounded(group, width, length, 0.018, width / 3, black, [
      (Math.sin(angle) * length) / 2,
      (Math.cos(angle) * length) / 2,
      0.17,
    ])
    hand.rotation.z = -angle
    hand.name = length === 0.8 ? "second-hand" : ""
  }
  oval(group, [0, 0, 0.2], [0.05, 0.05, 0.03], gold)
  ring(group, 0.2, 0.052, gold, [0, 1.4, 0])
  rounded(group, 0.18, 0.2, 0.12, 0.03, gold, [0, 1.18, -0.05])
  return group
}
function eye() {
  const group = new T.Group()
  oval(group, [0, 0, 0], [1, 1, 1], ivory)
  const map = texture(512, 512, (c) => {
    c.clearRect(0, 0, 512, 512)
    c.translate(256, 256)
    const gradient = c.createRadialGradient(0, 0, 55, 0, 0, 230)
    gradient.addColorStop(0, "#181d1e")
    gradient.addColorStop(0.4, "#5c7c84")
    gradient.addColorStop(0.85, "#283d48")
    gradient.addColorStop(1, "#0b171c")
    c.fillStyle = gradient
    c.beginPath()
    c.arc(0, 0, 235, 0, Math.PI * 2)
    c.fill()
    for (let i = 0; i < 580; i++) {
      const a = (i * Math.PI * 2) / 580
      c.strokeStyle = i % 3 ? "#9ba79770" : "#0e202ab0"
      c.lineWidth = 1 + rand(i) * 2
      c.beginPath()
      c.moveTo(Math.cos(a) * 75, Math.sin(a) * 75)
      c.lineTo(
        Math.cos(a + 0.03) * (160 + rand(i) * 70),
        Math.sin(a + 0.03) * (160 + rand(i) * 70),
      )
      c.stroke()
    }
    c.fillStyle = "#050608"
    c.beginPath()
    c.arc(0, 0, 72, 0, Math.PI * 2)
    c.fill()
  })
  const iris = new T.MeshPhysicalMaterial({
    map,
    transparent: true,
    roughness: 0.1,
    metalness: 0.1,
    clearcoat: 1,
  })
  const patch = new T.PlaneGeometry(1.2, 1.2, 48, 48),
    points = patch.attributes.position
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i),
      y = points.getY(i)
    points.setZ(i, Math.sqrt(Math.max(0.05, 1 - x * x - y * y)) + 0.008)
  }
  patch.computeVertexNormals()
  add(group, patch, iris)
  oval(
    group,
    [-0.18, 0.25, 0.99],
    [0.09, 0.12, 0.014],
    new T.MeshBasicMaterial({ color: "#fff" }),
  )
  return group
}
function phone() {
  const group = new T.Group()
  const screen = texture(1200, 600, (c) => {
    const g = c.createLinearGradient(0, 0, 1200, 600)
    g.addColorStop(0, "#aab5b7")
    g.addColorStop(1, "#303b43")
    c.fillStyle = g
    c.fillRect(0, 0, 1200, 600)
    c.strokeStyle = "#ffffff55"
    c.lineWidth = 2
    for (const x of [400, 800]) {
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x, 600)
      c.stroke()
    }
    for (const y of [200, 400]) {
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(1200, y)
      c.stroke()
    }
    c.strokeStyle = "#eee"
    c.lineWidth = 4
    c.strokeRect(450, 160, 300, 280)
    c.fillStyle = "#e4434c"
    c.beginPath()
    c.arc(1110, 300, 48, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = "#fff"
    c.font = '24px "Inter Variable"'
    c.fillText("4K   60 FPS", 35, 48)
    c.fillText("00:00:08", 520, 52)
    c.font = '18px "Inter Variable"'
    c.fillText("CINEMATIC     VIDEO     PHOTO", 410, 566)
  })
  const mobile = new T.Group()
  rounded(mobile, 3.25, 1.58, 0.12, 0.22, silver)
  rounded(mobile, 3.15, 1.48, 0.13, 0.19, black, [0, 0, 0.04])
  texturedPlane(mobile, 2.97, 1.3, screen, [0.02, 0, 0.205])
  rounded(mobile, 0.07, 0.33, 0.025, 0.03, black, [-1.45, 0, 0.22])
  mobile.position.y = 1.05
  mobile.rotation.set(-0.1, -0.13, -0.06)
  group.add(mobile)
  rounded(group, 0.48, 1.1, 0.35, 0.16, black, [0.22, 0.12, -0.2])
  ring(group, 0.29, 0.1, silver, [0.16, 0.37, -0.12]).rotation.y = Math.PI / 2
  tube(
    group,
    [
      [0.25, 0, -0.2],
      [0.7, -0.35, -0.2],
      [0.26, -0.68, 0],
      [0.2, -1.1, 0],
    ],
    0.18,
    black,
  )
  rounded(group, 0.45, 1.45, 0.43, 0.18, black, [0.2, -1.32, 0])
  ring(group, 0.21, 0.025, silver, [0.2, -0.99, 0.25])
  oval(group, [0.2, -1.02, 0.26], [0.08, 0.08, 0.02], black)
  return group
}
function laptop() {
  const group = new T.Group()
  const figure = statue()
  figure.scale.setScalar(sculptureGeometry ? 4 : 0.32)
  figure.position.set(0.4, 0.48, -0.55)
  group.add(figure)
  const screen = editingScreen(1)
  screen.scale.setScalar(0.61)
  screen.position.set(-0.28, -0.35, 0.4)
  screen.rotation.set(-0.16, -0.13, 0)
  group.add(screen)
  const base = rounded(
    group,
    2.95,
    0.1,
    1.64,
    0.07,
    silver,
    [-0.35, -1.14, 0.6],
  )
  base.rotation.x = 0.1
  rounded(
    group,
    0.65,
    0.025,
    0.38,
    0.03,
    black,
    [-0.35, -1.06, 1.35],
  ).rotation.x = Math.PI / 2
  for (let i = 0; i < 4; i++) {
    const icon = new T.Group()
    rounded(icon, 0.68, 0.68, 0.1, 0.16, black)
    rounded(icon, 0.47, 0.47, 0.018, 0.12, ivory, [0, 0, 0.13])
    rounded(icon, 0.375, 0.375, 0.018, 0.09, black, [0, 0, 0.17])
    ring(icon, 0.09, 0.024, ivory, [0, 0, 0.23])
    oval(icon, [0.13, 0.13, 0.24], [0.023, 0.023, 0.01], ivory)
    icon.position.set(i % 2 ? 1.35 : -1.45, 0.4 + Math.floor(i / 2) * 0.85, 0.1)
    icon.rotation.set(0.1, (i % 2 ? -1 : 1) * 0.35, (i % 2 ? 1 : -1) * 0.12)
    group.add(icon)
  }
  return group
}
function masterpiece() {
  const group = new T.Group()
  const frame = new T.MeshStandardMaterial({
    color: "#645439",
    metalness: 0.4,
    roughness: 0.5,
  })
  rounded(group, 2.65, 3.3, 0.12, 0.025, frame)
  rounded(
    group,
    2.49,
    3.14,
    0.025,
    0.015,
    new T.MeshStandardMaterial({ color: "#7a8a7d", roughness: 0.85 }),
    [0, 0, 0.15],
  )
  const portrait = statue()
  portrait.scale.setScalar(sculptureGeometry ? 5.6 : 0.47)
  portrait.position.set(0, 0, 0.22)
  portrait.rotation.set(0, -0.06, -0.02)
  group.add(portrait)
  rounded(
    group,
    1.43,
    0.24,
    0.035,
    0.012,
    new T.MeshStandardMaterial({ color: "#5797d0", roughness: 0.6 }),
    [0, 0.62, 1.28],
  ).rotation.z = -0.06
  return group
}
function crowd() {
  const group = new T.Group()
  const silhouette = new T.MeshStandardMaterial({
    color: "#0c0e12",
    roughness: 0.8,
    metalness: 0.04,
  })
  for (let i = 0; i < 23; i++) {
    const figure = new T.Group(),
      x = (((i * 0.618033) % 1) - 0.5) * 5.3,
      depth = rand(i + 40) * 2
    oval(figure, [0, 0.84, 0.02], [0.16, 0.225, 0.14], silhouette)
    const outline = new T.Shape()
    outline.moveTo(-0.1, 0.68)
    outline.lineTo(-0.1, 0.55)
    outline.bezierCurveTo(-0.19, 0.51, -0.41, 0.48, -0.44, 0.29)
    outline.lineTo(-0.42, -0.72)
    outline.lineTo(0.42, -0.72)
    outline.lineTo(0.44, 0.29)
    outline.bezierCurveTo(0.41, 0.48, 0.19, 0.51, 0.1, 0.55)
    outline.lineTo(0.1, 0.68)
    outline.closePath()
    add(
      figure,
      new T.ExtrudeGeometry(outline, {
        depth: 0.16,
        bevelEnabled: true,
        bevelSize: 0.04,
        bevelThickness: 0.05,
        bevelSegments: 3,
        curveSegments: 12,
      }),
      silhouette,
      [0, 0, -0.1],
    )
    figure.rotation.y = (rand(i + 10) - 0.5) * 0.4
    figure.position.set(x, rand(i) * 0.5 - 1, -depth)
    figure.scale.setScalar(0.8 + depth * 0.3)
    group.add(figure)
  }
  return group
}
function screens() {
  const group = new T.Group()
  for (let i = 0; i < 4; i++) {
    const screen = editingScreen(i)
    screen.position.set(i % 2 ? 2.45 : -2.45, i < 2 ? 2.2 : -2.2, 0)
    screen.scale.setScalar(0.8)
    screen.rotation.set(
      (i < 2 ? 1 : -1) * 0.18,
      (i % 2 ? -1 : 1) * 0.25,
      (i % 2 ? 1 : -1) * 0.18,
    )
    group.add(screen)
  }
  return group
}
function eyes() {
  const group = new T.Group(),
    a = eye(),
    b = eye()
  a.position.set(-1.3, 1.6, 0)
  a.rotation.set(-0.1, 0.4, 0)
  b.position.set(1.4, -1.6, 0)
  b.rotation.set(0.1, -0.3, 0)
  group.add(a, b)
  return group
}

export function buildEditorialModel(name: string) {
  const models: Record<string, () => T.Object3D> = {
    statue,
    chess,
    target,
    graphics,
    flowers: flowerArtwork,
    clock,
    phone,
    laptop,
    masterpiece,
    crowd,
    screens,
    eyes,
    skull: () => head(true),
    screen: () => editingScreen(1),
    avatar: statue,
  }
  const object = (models[name] || statue)()
  object.updateMatrixWorld(true)
  const bounds = new T.Box3().setFromObject(object),
    size = bounds.getSize(new T.Vector3()),
    center = bounds.getCenter(new T.Vector3())
  object.position.sub(center)
  const group = new T.Group()
  group.name = name
  group.add(object)
  group.scale.setScalar(1 / size.y)
  // The wrapper's natural height is one; all composition coordinates use pixels.
  const wrapper = new T.Group()
  wrapper.add(group)
  return wrapper
}
