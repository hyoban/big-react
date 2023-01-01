import type { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

export const createInstance = (type: string, props: any): Instance => {
  // TODO: 处理 props
  return document.createElement(type)
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
