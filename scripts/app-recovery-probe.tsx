import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import PreviewBoundary from "../src/workspace/PreviewBoundary"

function BrokenPreview(): never {
  throw new Error("Intentional isolated preview probe")
}
export function probeBoundary() {
  const element = document.createElement("div")
  element.id = "app-recovery-probe"
  document.body.appendChild(element)
  const root = createRoot(element)
  flushSync(() =>
    root.render(
      <PreviewBoundary label="La prueba aislada">
        <BrokenPreview />
      </PreviewBoundary>,
    ),
  )
  return () => {
    root.unmount()
    element.remove()
  }
}
