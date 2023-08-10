import type { Container } from "hostConfig"
import {
  unstable_ImmediatePriority,
  unstable_NormalPriority,
  unstable_UserBlockingPriority,
  unstable_runWithPriority,
} from "scheduler"
import type { Props } from "shared/ReactTypes"

/**
 * 将 fiber 的 props 保存在 dom 上的 key
 */
export const elementPropsKey = "__props"

export interface DOMElement extends Element {
  [elementPropsKey]: Props
}

const validEventTypeList = ["click"]

type EventCallback = (e: Event) => void

interface Paths {
  capture: EventCallback[]
  bubble: EventCallback[]
}

interface SyntheticEvent extends Event {
  __stopPropagation: boolean
}

/**
 * 将 props 保存到 dom 上
 * @param node
 * @param props
 */
export function updateFiberProps(node: DOMElement, props: Props) {
  node[elementPropsKey] = props
}

export function initEvent(container: Container, eventType: string) {
  if (!validEventTypeList.includes(eventType)) {
    console.warn("initEvent", "当前不支持", eventType, "事件")
    return
  }
  // 在 container 上绑定事件
  container.addEventListener(eventType, (e) => {
    dispatchEvent(container, eventType, e)
  })
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
  const targetElement = e.target

  if (targetElement === null) {
    console.warn("事件不存在 target", e)
    return
  }

  const { bubble, capture } = collectPaths(
    targetElement as DOMElement,
    container,
    eventType,
  )

  const se = createSyntheticEvent(e)

  // 遍历 capture
  triggerEventFlow(capture, se)

  if (!se.__stopPropagation) {
    // 遍历 bubble
    triggerEventFlow(bubble, se)
  }
}

/**
 * 收集沿途的事件
 * @param targetElement
 * @param container
 * @param eventType
 * @returns
 */
function collectPaths(
  targetElement: DOMElement,
  container: Container,
  eventType: string,
) {
  const paths: Paths = {
    capture: [],
    bubble: [],
  }

  while (targetElement && targetElement !== container) {
    const elementProps = targetElement[elementPropsKey]
    if (elementProps) {
      const callbackNameList = getEventCallbackNameFromEventType(eventType)
      if (callbackNameList) {
        callbackNameList.forEach((callbackName, i) => {
          const eventCallback = elementProps[callbackName]
          if (eventCallback) {
            if (i === 0) {
              // 根据 capture 和 bubble 的调用顺序，这里需要反向插入
              paths.capture.unshift(eventCallback)
            } else {
              paths.bubble.push(eventCallback)
            }
          }
        })
      }
    }
    // 向上收集
    targetElement = targetElement.parentNode as DOMElement
  }
  return paths
}

/**
 * click -> onClickCapture onClick
 * @param eventType
 * @returns
 */
function getEventCallbackNameFromEventType(
  eventType: string,
): string[] | undefined {
  return {
    click: ["onClickCapture", "onClick"],
  }[eventType]
}

/**
 * 构造合成事件。
 * 因为冒泡就是模拟实现的，所以为了实现停止冒泡需要构造合成事件
 * @param e
 * @returns
 */
function createSyntheticEvent(e: Event) {
  const syntheticEvent = e as SyntheticEvent
  syntheticEvent.__stopPropagation = false
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originStopPropagation = e.stopPropagation

  syntheticEvent.stopPropagation = () => {
    syntheticEvent.__stopPropagation = true
    if (originStopPropagation) {
      originStopPropagation()
    }
  }
  return syntheticEvent
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
  for (let i = 0; i < paths.length; i++) {
    const callback = paths[i]
    unstable_runWithPriority(eventTypeToSchedulerPriority(se.type), () => {
      callback.call(null, se)
    })

    if (se.__stopPropagation) {
      break
    }
  }
}

function eventTypeToSchedulerPriority(eventType: string) {
  switch (eventType) {
    case "click":
    case "keydown":
    case "keyup":
      return unstable_ImmediatePriority
    case "scroll":
      return unstable_UserBlockingPriority
    default:
      return unstable_NormalPriority
  }
}
