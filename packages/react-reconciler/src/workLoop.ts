import { scheduleMicrotask } from "hostConfig"
import { beginWork } from "./beginWork"
import { commitMutationEffects } from "./commitWork"
import { completeWork } from "./completeWork"
import type { FiberNode, FiberRootNode } from "./fiber"
import { createWorkInProgress } from "./fiber"
import { MutationMask, NoFlags } from "./fiberFlags"
import {
  Lane,
  NoLane,
  SyncLane,
  getHighestPriorityLane,
  markRootFinished,
  mergeLanes,
} from "./fiberLanes"
import { flushSyncCallbacks, scheduleSyncCallback } from "./syncTaskQueue"
import { HostRoot } from "./workTags"

/**
 * 正在工作的 fiberNode
 */
let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane

/**
 * 初始化，让 wip 指向需要遍历的第一个 fiberNode
 * @param root
 */
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  // FiberRootNode 不能作为 wip 工作单元
  workInProgress = createWorkInProgress(root.current, {})
  wipRootRenderLane = lane
}

/**
 * 连接 renderRoot 的更新流程
 * @param fiber
 */
export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  // 触发更新未必从根节点，所以向上一直找到 fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  markRootUpdated(root, lane)
  // 调度功能，不直接执行 renderRoot，而是由调度流程去执行
  ensureRootIsScheduled(root)
}

/**
 * 调度阶段入口
 */
function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes)
  if (updateLane === NoLane) {
    return
  }
  if (updateLane === SyncLane) {
    // 同步优先级，用微任务调度
    if (__DEV__) {
      console.log(
        "(ensureRootIsScheduled)",
        "在微任务中调度，优先级：",
        updateLane,
      )
      scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
      scheduleMicrotask(flushSyncCallbacks)
    }
  } else {
    // 其它优先级，用宏任务调度
    // 与 vue，svelte 等框架不同的地方
  }
}

/**
 * 将本次更新的优先级记录到 fiberRootNode 上
 */
function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane)
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

// 从 render root 改名，后面还有并发更新的入口
function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
  const nextLanes = getHighestPriorityLane(root.pendingLanes)

  if (nextLanes !== SyncLane) {
    // 其它比 SyncLane 低的优先级
    // 目前只有 NoLane
    ensureRootIsScheduled(root)
    return
  }

  if (__DEV__) {
    console.warn("(performSyncWorkOnRoot)", "render阶段开始")
  }

  // 初始化
  prepareFreshStack(root, lane)

  do {
    try {
      workLoop()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn("(performSyncWorkOnRoot)", "workLoop 发生错误", e)
      }
      workInProgress = null
    }
    // eslint-disable-next-line no-constant-condition
  } while (true)

  // 递归过程结束，alternate 中已经完整的 fiber 树
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork
  root.finishedLane = lane
  wipRootRenderLane = NoLane

  // 根据 flag 提交更新，执行 DOM 操作
  commitRoot(root)
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  // 可能是子 fiberNode，或者是 null
  const next = beginWork(fiber, wipRootRenderLane)
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
    console.warn("(commitRoot)", "commit 阶段开始", finishedWork)
  }
  const lane = root.finishedLane
  if (lane === NoLane && __DEV__) {
    console.error("(commitRoot)", "commit阶段finishedLane不应该是NoLane")
  }

  // 已经被记录下来，重置
  root.finishedWork = null
  root.finishedLane = NoLane
  markRootFinished(root, lane)

  // 判断是否存在三个子阶段需要执行的操作
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags

  if (subtreeHasEffects || rootHasEffects) {
    // before mutation
    // mutation
    commitMutationEffects(finishedWork)
    // fiber 树切换
    root.current = finishedWork
    // layout
  } else {
    // fiber 树切换
    root.current = finishedWork
  }
}
