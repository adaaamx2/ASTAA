import { createRoot } from "react-dom/client"
import Export4kButton from "../src/media/Export4kButton"
import type { DownloadFile } from "../src/media/files"

export function mountExport4kFixture(source: DownloadFile, projectId: string) {
  const element = document.createElement("div")
  document.body.appendChild(element)
  const root = createRoot(element)
  root.render(<Export4kButton source={source} projectId={projectId} />)
  return {
    element,
    unmount() {
      root.unmount()
      element.remove()
    },
  }
}
