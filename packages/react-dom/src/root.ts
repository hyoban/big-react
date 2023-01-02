import { createContainer, updateContainer } from 'react-reconciler/src/fiberReconciler'
import type { ReactElementType } from 'shared/ReactTypes'
import type { Container } from './hostConfig'
import { initEvent } from './SyntheticEvent'

// ReactDOM.createRoot(root).render(element)

export function createRoot(
  container: Container,
) {
  const root = createContainer(container)
  return {
    render(element: ReactElementType) {
      initEvent(container, 'click')
      return updateContainer(element, root)
    },
  }
}
