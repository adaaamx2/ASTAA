import { useLayoutEffect, useRef } from "react"
import {
  cancelRender,
  continueRender,
  delayRender,
  getRemotionEnvironment,
} from "remotion"
import * as T from "three"
import { buildEditorialModel, preloadEditorialModels } from "./models"

export interface ObjectShot {
  key: string
  asset: string
  x: number
  y: number
  height: number
  yaw: number
  pitch: number
  roll: number
  opacity: number
  irisMode: number
  irisProgress: number
}
function createStage(canvas: HTMLCanvasElement) {
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  })
  const width = getRemotionEnvironment().isRendering
    ? 1080
    : Math.min(
        720,
        Math.max(
          360,
          Math.round(
            (canvas.getBoundingClientRect().width *
              (window.devicePixelRatio || 1)) /
              2,
          ) * 2,
        ),
      )
  renderer.setSize(width, Math.round((width * 16) / 9), false)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.35
  const scene = new T.Scene()
  const camera = new T.OrthographicCamera(-5, 5, 80 / 9, -80 / 9, 0.1, 80)
  camera.position.set(0, 0, 22)
  camera.lookAt(0, 0, 0)
  scene.add(new T.HemisphereLight("#ffffff", "#727681", 1.7))
  const light = (
    color: string,
    power: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const l = new T.DirectionalLight(color, power)
    l.position.set(x, y, z)
    scene.add(l)
  }
  light("#fff8ef", 4.2, -5, 7, 7)
  light("#e4eaff", 1.8, 5, 1, 4)
  light("#ffffff", 4.5, 1, 5, -4)
  // A generated studio reflection map; no HDRI or texture is downloaded.
  const studio = document.createElement("canvas")
  studio.width = 1024
  studio.height = 512
  const c = studio.getContext("2d")!
  c.fillStyle = "#383c46"
  c.fillRect(0, 0, 1024, 512)
  const softbox = (x: number, y: number, width: number, height: number) => {
    const g = c.createRadialGradient(x, y, 0, x, y, width)
    g.addColorStop(0, "#ffffff")
    g.addColorStop(0.4, "#c1c7d0")
    g.addColorStop(1, "#383c46")
    c.fillStyle = g
    c.fillRect(x - width, y - height, width * 2, height * 2)
  }
  softbox(170, 175, 100, 150)
  softbox(760, 190, 55, 170)
  const texture = new T.CanvasTexture(studio)
  texture.mapping = T.EquirectangularReflectionMapping
  texture.colorSpace = T.SRGBColorSpace
  const pmrem = new T.PMREMGenerator(renderer)
  const environment = pmrem.fromEquirectangular(texture)
  scene.environment = environment.texture
  texture.dispose()
  pmrem.dispose()
  const objects = new Map<string, T.Group>()
  const render = (shots: ObjectShot[], time: number) => {
    for (const object of objects.values()) object.visible = false
    for (const shot of shots) {
      let object = objects.get(shot.key)
      if (!object) {
        object = buildEditorialModel(shot.asset)
        object.traverse((child) => {
          if (!(child instanceof T.Mesh)) return
          child.material = Array.isArray(child.material)
            ? child.material.map((m) => m.clone())
            : child.material.clone()
          for (const material of Array.isArray(child.material)
            ? child.material
            : [child.material]) {
            material.userData.baseOpacity = material.opacity
            material.userData.baseTransparent = material.transparent
            material.customProgramCacheKey = () => "editorial-screen-iris-v1"
            material.onBeforeCompile = (
              shader: Parameters<T.Material["onBeforeCompile"]>[0],
            ) => {
              const uniforms = {
                editorialIris: {
                  value: new T.Vector3(
                    renderer.domElement.width / 2,
                    renderer.domElement.height / 2,
                    0,
                  ),
                },
                editorialIrisMode: { value: 0 },
              }
              material.userData.irisUniforms = uniforms
              Object.assign(shader.uniforms, uniforms)
              shader.fragmentShader =
                `uniform vec3 editorialIris; uniform float editorialIrisMode;\n${shader.fragmentShader}`.replace(
                  "#include <clipping_planes_fragment>",
                  "#include <clipping_planes_fragment>\nif (editorialIrisMode > 0.5 && distance(gl_FragCoord.xy, editorialIris.xy) > editorialIris.z) discard;\nif (editorialIrisMode < -0.5 && distance(gl_FragCoord.xy, editorialIris.xy) < editorialIris.z) discard;",
                )
              uniforms.editorialIris.value.z = material.userData.irisRadius || 0
              uniforms.editorialIrisMode.value = material.userData.irisMode || 0
            }
          }
        })
        objects.set(shot.key, object)
        scene.add(object)
      }
      object.visible = true
      object.position.set((shot.x - 540) / 108, (960 - shot.y) / 108, 0)
      object.scale.setScalar(shot.height / 108)
      object.rotation.set(shot.pitch, shot.yaw, shot.roll)
      object.traverse((child) => {
        if (!(child instanceof T.Mesh)) return
        for (const material of Array.isArray(child.material)
          ? child.material
          : [child.material]) {
          material.opacity = shot.opacity * material.userData.baseOpacity
          material.transparent =
            material.userData.baseTransparent || shot.opacity < 0.999
          material.depthWrite = shot.opacity >= 0.999
          material.userData.irisMode = shot.irisMode
          material.userData.irisRadius =
            Math.hypot(canvas.width / 2, canvas.height / 2) *
            1.01 *
            shot.irisProgress
          const uniforms = material.userData.irisUniforms
          if (uniforms) {
            uniforms.editorialIrisMode.value = shot.irisMode
            uniforms.editorialIris.value.z = material.userData.irisRadius
          }
        }
      })
    }
    renderer.render(scene, camera)
    renderer.getContext().finish()
    canvas.dataset.models = shots.map((shot) => shot.asset).join(",")
    canvas.dataset.frameTime = time.toFixed(4)
    canvas.dataset.triangles = String(renderer.info.render.triangles)
    canvas.dataset.ready = "true"
  }
  const dispose = () => {
    scene.traverse((child) => {
      if (!(child instanceof T.Mesh)) return
      child.geometry.dispose()
      for (const material of Array.isArray(child.material)
        ? child.material
        : [child.material])
        material.dispose()
    })
    environment.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
  }
  return { render, dispose }
}
interface StageProps {
  shots: ObjectShot[]
  time: number
}
export default function Stage3D({ shots, time }: StageProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const stage = useRef<ReturnType<typeof createStage> | null>(null)
  const current = useRef({ shots, time })
  current.current = { shots, time }
  useLayoutEffect(() => {
    let live = true
    const handle = getRemotionEnvironment().isRendering
      ? delayRender("Loading local sculpture geometry")
      : null
    void preloadEditorialModels()
      .then(() => {
        if (!live) {
          if (handle !== null) continueRender(handle)
          return
        }
        stage.current = createStage(ref.current!)
        stage.current.render(current.current.shots, current.current.time)
        if (handle !== null) continueRender(handle)
      })
      .catch((error) => {
        if (handle !== null) cancelRender(error)
        else if (live) {
          ref.current!.dataset.error = String(error)
          console.error(error)
        }
      })
    return () => {
      live = false
      stage.current?.dispose()
      stage.current = null
    }
  }, [])
  useLayoutEffect(() => {
    stage.current?.render(shots, time)
  }, [shots, time])
  return (
    <foreignObject x="0" y="0" width="1080" height="1920">
      <canvas
        ref={ref}
        width={1080}
        height={1920}
        data-procedural-3d="true"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </foreignObject>
  )
}
