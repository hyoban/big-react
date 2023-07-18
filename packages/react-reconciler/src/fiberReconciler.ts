import type { Container } from "hostConfig"
import type { ReactElementType } from "shared/ReactTypes"
import { FiberNode, FiberRootNode } from "./fiber"
import type { UpdateQueue } from "./updateQueue"
import { createUpdate, createUpdateQueue, enqueueUpdate } from "./updateQueue"
import { scheduleUpdateOnFiber } from "./workLoop"
import { HostRoot } from "./workTags"
import { requestUpdateLane } from "./fiberLanes"

// mount 时调用的 API
// ReactDOM.createRoot(container).render(reactElement)

/**
 * 执行 createRoot 后，方法内部会调用 createContainer
 * @param container
 * @returns
 */
export function createContainer(container: Container) {
  // 创建两者，并关连
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)
  // 连接更新机制
  hostRootFiber.updateQueue = createUpdateQueue()
  return root
}

/**
 * 执行 render 后，方法内部会调用 updateContainer
 * @param element
 * @param root
 * @returns
 */
export function updateContainer(
  element: ReactElementType | null,
  root: FiberRootNode,
) {
  const hostRootFiber = root.current

  // 首屏渲染，触发更新，在 beginWork 和 completeWork 中处理更新
  const lane = requestUpdateLane()
  const update = createUpdate<ReactElementType | null>(element, lane)
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
    update,
  )

  // 调度更新，连接 container 和 renderRoot 的更新流程
  scheduleUpdateOnFiber(hostRootFiber, lane)

  return element
}
