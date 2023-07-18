import type { Props } from "shared/ReactTypes"
import type { DOMElement } from "./SyntheticEvent"
import { updateFiberProps } from "./SyntheticEvent"

export type Container = Element
export type Instance = Element
export type TextInstance = Text

export const createInstance = (type: string, props: Props): Instance => {
  const element = document.createElement(type) as unknown
  updateFiberProps(element as DOMElement, props)
  return element as DOMElement
}

export const appendInitialChild = (
  parent: Instance  ,
  child: Instance,
) => {
  parent.appendChild(child)
}

export const createTextInstance = (content: string) => {
  return document.createTextNode(content)
}

export const appendChildToContainer = appendInitialChild

export function commitTextUpdate(textInstance: TextInstance, content: string) {
  textInstance.textContent = content
}

export function removeChild(
  container: Container,
  child: Instance | TextInstance,
) {
  container.removeChild(child)
}

export function insertChildToContainer(
  child: Instance,
  container: Container,
  before: Instance,
) {
  container.insertBefore(child, before)
}
