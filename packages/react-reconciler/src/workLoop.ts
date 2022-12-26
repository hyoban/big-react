import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import type { FiberNode, FiberRootNode } from './fiber'
import { createWorkInProgress } from './fiber'
import { HostRoot } from './workTags'

// 正在工作的 fiberNode
let workInProgress: FiberNode | null = null

function prepareFreshStack(root: FiberRootNode) {
  workInProgress = createWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  // TODO: 调度功能
  // 向上一直找到 fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  renderRoot(root)
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber
  let parent = node.return
  while (parent !== null) {
    node = parent
    parent = node.return
  }
  if (node.tag === HostRoot) {
    // 对于 hostRootFiber，stateNode 就是 FiberRootNode
    return node.stateNode
  }
  return null
}

function renderRoot(root: FiberRootNode) {
  // 初始化开始工作的 fiberNode
  prepareFreshStack(root)

  do {
    try {
      workLoop()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn('workLoop发生错误', e)
      }
      workInProgress = null
    }
  } while (true)

  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork

  // 根据 flag 提交更新
  commitRoot(root)
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber)
  fiber.memoizedProps = fiber.pendingProps

  if (next === null) {
    // 递归中的归阶段
    completeUnitOfWork(fiber)
  } else {
    // 按 DFS 不断向下执行，直到叶子节点
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber

  do {
    completeWork(node)
    const sibling = node.sibling

    if (sibling !== null) {
      workInProgress = sibling
      // 别着急继续返回，先开启兄弟节点的“递”阶段
      return
    }
    // 完成父节点的“归”阶段
    node = node.return
    workInProgress = node
  } while (node !== null)
}
