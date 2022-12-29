import type { ReactElementType } from 'shared/ReactTypes'
// @ts-expect-error - palceholder
import { createRoot } from 'react-dom'

export function renderIntoDocument(element: ReactElementType) {
  const div = document.createElement('div')
  // element
  return createRoot(div).render(element)
}
