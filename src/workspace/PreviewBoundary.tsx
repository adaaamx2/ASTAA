import { Component, type ReactNode } from "react"
import { cancelRender, getRemotionEnvironment } from "remotion"

interface Props {
  children: ReactNode
  label: string
}
/** A broken optional preview/document must not unmount the entire workspace. */
export default class PreviewBoundary extends Component<Props, {
  failed: boolean
}> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    if (getRemotionEnvironment().isRendering) cancelRender(error)
  }
  render() {
    if (this.state.failed)
      return (
        <span className="ml-error" role="alert">
          {this.props.label} no se pudo cargar. Puedes seguir usando los demás
          vídeos. Recarga la página para reintentar; tus archivos guardados no
          se eliminan.
        </span>
      )
    return this.props.children
  }
}
