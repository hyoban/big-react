import type { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'
import type { Props } from 'shared/ReactTypes'
import type { DOMElement } from './SyntheticEvent'
import { updateFiberProps } from './SyntheticEvent'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

export const createInstance = (type: string, props: Props): Instance => {
  const element = document.createElement(type) as unknown
  updateFiberProps(element as DOMElement, props)
  return element as DOMElement
}

export const appendInitialChild = (
  parent: Instance | Container,
  child: Instance,
) => {
  parent.appendChild(child)
}

export const createTextInstance = (
  content: string,
) => {
  return document.createTextNode(content)
}

export const appendChildToContainer = appendInitialChild

export const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText: {
      const text = fiber.memoizedProps.content
      return commitTextUpdate(fiber.stateNode, text)
    }
    default: {
      if (__DEV__) {
        console.warn('commitUpdate: 未实现的 update 类型', fiber)
      }
      break
    }
  }
}

export function commitTextUpdate(textInstance: TextInstance, content: string) {
  textInstance.textContent = content
}

export function removeChild(
  child: Instance | TextInstance,
  container: Container,
) {
  container.removeChild(child)
}
