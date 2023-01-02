import { beginWork } from './beginWork'
import { commitMutationEffects } from './commitWork'
import { completeWork } from './completeWork'
import type { FiberNode, FiberRootNode } from './fiber'
import { createWorkInProgress } from './fiber'
import { MutationMask, NoFlags } from './fiberFlags'
import { HostRoot } from './workTags'

/**
 * 正在工作的 fiberNode
 */
let workInProgress: FiberNode | null = null

/**
 * 初始化，让 wip 指向需要遍历的第一个 fiberNode
 * @param root
 */
function prepareFreshStack(root: FiberRootNode) {
  // FiberRootNode 不能作为 wip 工作单元
  workInProgress = createWorkInProgress(root.current, {})
}

/**
 * 连接 renderRoot 的更新流程
 * @param fiber
 */
export function scheduleUpdateOnFiber(fiber: FiberNode) {
  // TODO: 调度功能
  // 触发更新未必从根节点，所以向上一直找到 fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  renderRoot(root)
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber
  let parent = node.return
  // 正常的 fiberNode 都有 return 但是 hostRootFiber 没有 return
  while (parent !== null) {
    node = parent
    parent = node.return
  }
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}

function renderRoot(root: FiberRootNode) {
  prepareFreshStack(root)

  do {
    try {
      workLoop()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn('(renderRoot)', 'workLoop 发生错误', e)
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
  // 可能是子 fiberNode，或者是 null
  const next = beginWork(fiber)
  // 工作完成，props 已经确定
  fiber.memoizedProps = fiber.pendingProps

  if (next === null) {
    // 递归中的归阶段，此时没有子节点，先遍历兄弟节点
    completeUnitOfWork(fiber)
  } else {
    // 按 DFS 不断向下执行，直到叶子节点
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber

  do {
    // 完成当前节点的“归”阶段
    completeWork(node)

    const sibling = node.sibling
    if (sibling !== null) {
      workInProgress = sibling
      // 别着急 complete，先返回，开启兄弟节点的“递”阶段
      return
    }

    // 完成父节点的“归”阶段
    node = node.return
    workInProgress = node
  } while (node !== null)
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork
  if (finishedWork === null) {
    return
  }

  if (__DEV__) {
    console.warn('commitRoot', finishedWork)
  }

  root.finishedWork = null

  // 判断是否存在三个子阶段需要执行的操作
  const subtreeHasEffects = (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags

  if (subtreeHasEffects || rootHasEffects) {
    // before mutation
    // mutation
    commitMutationEffects(finishedWork)
    root.current = finishedWork
    // layout
  } else {
    root.current = finishedWork
  }
}
