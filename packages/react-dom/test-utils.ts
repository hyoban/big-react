// @ts-expect-error - palceholder
import { createRoot } from "react-dom"

import type { ReactElementType } from "shared/ReactTypes"

export function renderIntoDocument(element: ReactElementType) {
  const div = document.createElement("div")
  // element
  return createRoot(div).render(element)
}
