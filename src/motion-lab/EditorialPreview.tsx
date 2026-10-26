import { useLayoutEffect, useRef, useState, type ComponentType } from "react"
import {
  cancelRender,
  continueRender,
  delayRender,
  getRemotionEnvironment,
} from "remotion"
import type { EditorialId } from "./editorial-timeline"
import { brandSpec } from "./brand-spec"

interface Props {
  id: EditorialId
  time: number
  onReady?: () => void
}
let loading: Promise<typeof import("./EditorialSequence")> | null = null
let loadingVersion = 0
function load() {
  if (loadingVersion !== brandSpec.version) {
    loading = null
    loadingVersion = brandSpec.version
  }
  loading ??= import("./EditorialSequence")
    .then(async (module) => {
      await Promise.all([
        module.loadEditorialFonts(),
        ...module.editorialAssetUrls().map(async (url) => {
          const image = new Image()
          image.src = url
          await image.decode()
        }),
      ])
      return module
    })
    .catch((error) => {
      loading = null
      throw error
    })
  return loading
}
/** Import only when needed; commit the loaded frame before releasing Remotion. */
export default function EditorialPreview(props: Props) {
  const [Renderer, setRenderer] = useState<ComponentType<Props> | null>(null)
  const [failure, setFailure] = useState<Error | null>(null)
  const handle = useRef<number | null>(null)
  useLayoutEffect(() => {
    let live = true
    const native = getRemotionEnvironment().isRendering
    if (native)
      handle.current = delayRender("Loading isolated editorial preview")
    void load()
      .then((module) => {
        if (live) setRenderer(() => module.default)
      })
      .catch((error) => {
        if (!live) return
        if (native) cancelRender(error)
        else
          setFailure(
            error instanceof Error
              ? error
              : new Error("Editorial preview unavailable"),
          )
      })
    return () => {
      live = false
      if (handle.current !== null) {
        continueRender(handle.current)
        handle.current = null
      }
    }
  }, [])
  useLayoutEffect(() => {
    if (Renderer) {
      if (handle.current !== null) {
        continueRender(handle.current)
        handle.current = null
      }
      props.onReady?.()
    }
  }, [Renderer, props.onReady])
  if (failure) throw failure
  return Renderer ? (
    <Renderer {...props} />
  ) : (
    <span className="ml-footnote" role="status">
      Cargando animación…
    </span>
  )
}
