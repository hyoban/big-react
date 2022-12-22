import type { Container } from 'hostConfig'
import type { ReactElementType } from 'shared/ReactTypes'
import { FiberNode, FiberRootNode } from './fiber'
import type { UpdateQueue } from './updateQueue'
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
} from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'
import { HostRoot } from './workTags'

// createRoot
export function createContainer(container: Container) {
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)
  // 连接更新机制
  hostRootFiber.updateQueue = createUpdateQueue()
  return root
}

// render
export function updateContainer(
  element: ReactElementType | null,
  root: FiberRootNode,
) {
  const hostRootFiber = root.current
  const update = createUpdate<ReactElementType | null>(element)
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
    update,
  )
  // 连接 container 和 renderRoot
  scheduleUpdateOnFiber(hostRootFiber)
  return element
}
