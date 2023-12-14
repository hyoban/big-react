import {
  createContainer,
  updateContainer,
} from "react-reconciler/src/fiberReconciler"

import { initEvent } from "./SyntheticEvent"

import type { Container } from "./hostConfig"
import type { ReactElementType } from "shared/ReactTypes"

// ReactDOM.createRoot(root).render(element)

export function createRoot(container: Container) {
  const root = createContainer(container)
  return {
    render(element: ReactElementType) {
      initEvent(container, "click")
      return updateContainer(element, root)
    },
  }
}
