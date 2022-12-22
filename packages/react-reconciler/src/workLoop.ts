import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import type { FiberNode } from './fiber'

// 正在工作的 fiberNode
let workInProgress: FiberNode | null = null

function prepareFreshStack(fiber: FiberNode) {
  workInProgress = fiber
}

function renderRoot(root: FiberNode) {
  // 初始化开始工作的 fiberNode
  prepareFreshStack(root)

  do {
    try {
      workLoop()
      break
    } catch (e) {
      console.warn('workLoop发生错误', e)
      workInProgress = null
    }
  } while (true)
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
