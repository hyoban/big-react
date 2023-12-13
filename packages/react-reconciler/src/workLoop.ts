import { scheduleMicroTask } from "hostConfig"
import { beginWork } from "./beginWork"
import {
  commitHookEffectListCreate,
  commitHookEffectListDestroy,
  commitHookEffectListUnmount,
  commitMutationEffects,
} from "./commitWork"
import { completeWork } from "./completeWork"
import type { FiberNode, FiberRootNode, PendingPassiveEffects } from "./fiber"
import { createWorkInProgress } from "./fiber"
import { MutationMask, NoFlags, PassiveMask } from "./fiberFlags"
import {
  Lane,
  NoLane,
  SyncLane,
  getHighestPriorityLane,
  lanesToSchedulerPriority,
  markRootFinished,
  mergeLanes,
} from "./fiberLanes"
import { flushSyncCallbacks, scheduleSyncCallback } from "./syncTaskQueue"
import { HostRoot } from "./workTags"
import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalPriority,
  unstable_shouldYield,
  unstable_cancelCallback,
} from "scheduler"
import { HookHasEffect, Passive } from "./hookEffectTags"

/**
 * 正在工作的 fiberNode
 */
let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
/**
 * 防止多次 commitRoot effect 多次执行
 */
let rootDoesHasPassiveEffects: boolean = false

type RootExitStatus = typeof RootIncomplete | typeof RootCompleted
const RootIncomplete = 1
const RootCompleted = 2
// TODO: 执行过程中出错

/**
 * 初始化，让 wip 指向需要遍历的第一个 fiberNode
 * @param root
 */
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  root.finishedLane = NoLane
  root.finishedWork = null
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
  const existingCallback = root.callbackNode

  if (updateLane === NoLane) {
    if (existingCallback !== null) {
      unstable_cancelCallback(existingCallback)
    }
    root.callbackNode = null
    root.callbackPriority = NoLane
    return
  }

  const curPriority = updateLane
  const prevPriority = root.callbackPriority

  if (curPriority === prevPriority) {
    // 同优先级不产生新的调度
    return
  }

  if (existingCallback !== null) {
    unstable_cancelCallback(existingCallback)
  }

  let newCallbackNode = null

  if (updateLane === SyncLane) {
    // 同步优先级，用微任务调度
    if (__DEV__) {
      console.warn(
        "(ensureRootIsScheduled)",
        "在微任务中调度，优先级：",
        updateLane,
      )
      scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
      scheduleMicroTask(flushSyncCallbacks)
    }
  } else {
    // 其它优先级，用宏任务调度
    // 与 vue，svelte 等框架不同的地方

    const schedulerPriority = lanesToSchedulerPriority(updateLane)

    newCallbackNode = scheduleCallback(
      schedulerPriority,
      performConcurrentWorkOnRoot.bind(null, root),
    )
  }

  root.callbackNode = newCallbackNode
  root.callbackPriority = curPriority
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

function performConcurrentWorkOnRoot(
  root: FiberRootNode,
  didTimeout: boolean,
): any {
  // 确保 useEffect 回调都执行，因为 useEffect 中可能会触发更新，需要比较优先级
  const curCallback = root.callbackNode
  const didFlushPassiveEffects = flushPassiveEffects(root.pendingPassiveEffects)
  if (didFlushPassiveEffects) {
    if (root.callbackNode !== curCallback) {
      // useEffect 中触发了更新，且优先级更高，当前调度不该继续执行
      return null
    }
  }

  const lane = getHighestPriorityLane(root.pendingLanes)
  const curCallbackNode = root.callbackNode
  if (lane === NoLane) {
    return null
  }

  const needSync = lane === SyncLane || didTimeout
  const existStatus = renderRoot(root, lane, !needSync)

  ensureRootIsScheduled(root)

  if (existStatus === RootIncomplete) {
    // 中断

    if (curCallbackNode !== root.callbackNode) {
      // 出现更高优先级
      return null
    }

    // 继续调度当前回调函数
    return performConcurrentWorkOnRoot.bind(null, root)
  }

  if (existStatus === RootCompleted) {
    // 递归过程结束，alternate 中已经完整的 fiber 树
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    root.finishedLane = lane
    wipRootRenderLane = NoLane

    // 根据 flag 提交更新，执行 DOM 操作
    commitRoot(root)
  } else if (__DEV__) {
    console.warn("(performConcurrentWorkOnRoot)", "还未实现的并发更新状态")
  }
}

function performSyncWorkOnRoot(root: FiberRootNode) {
  const nextLane = getHighestPriorityLane(root.pendingLanes)

  if (nextLane !== SyncLane) {
    // 其它比 SyncLane 低的优先级
    // 目前只有 NoLane
    ensureRootIsScheduled(root)
    return
  }

  const existStatus = renderRoot(root, nextLane, false)
  if (existStatus === RootCompleted) {
    // 递归过程结束，alternate 中已经完整的 fiber 树
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    root.finishedLane = nextLane
    wipRootRenderLane = NoLane

    // 根据 flag 提交更新，执行 DOM 操作
    commitRoot(root)
  } else if (__DEV__) {
    console.warn("(performSyncWorkOnRoot)", "还未实现的同步更新状态")
  }
}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
  if (__DEV__) {
    console.warn("(renderRoot)", `开始${shouldTimeSlice ? "并发" : "同步"}更新`)
  }

  if (wipRootRenderLane !== lane) {
    // 初始化
    // 只在首次更新初始化，中断再恢复不需要
    prepareFreshStack(root, lane)
  }

  do {
    try {
      shouldTimeSlice ? workLoopConcurrent() : workLoopSync()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn("(performSyncWorkOnRoot)", "workLoop 发生错误", e)
      }
      workInProgress = null
    }
    // eslint-disable-next-line no-constant-condition
  } while (true)

  // 中断执行
  if (shouldTimeSlice && workInProgress !== null) {
    return RootIncomplete
  }
  if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
    console.warn("(renderRoot)", "render 阶段结束 wip 应该就是 null")
  }
  // render 阶段执行完
  // TODO: 执行过程中出错
  return RootCompleted
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function workLoopConcurrent() {
  while (workInProgress !== null && !unstable_shouldYield()) {
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

  if (
    (finishedWork.flags & PassiveMask) !== NoFlags ||
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags
  ) {
    if (!rootDoesHasPassiveEffects) {
      rootDoesHasPassiveEffects = true

      // 调度副作用
      scheduleCallback(NormalPriority, () => {
        // 执行副作用
        flushPassiveEffects(root.pendingPassiveEffects)
        return
      })
    }
  }

  // 判断是否存在三个子阶段需要执行的操作
  const subtreeHasEffects =
    ((finishedWork.subtreeFlags & MutationMask) | PassiveMask) !== NoFlags
  const rootHasEffect =
    ((finishedWork.flags & MutationMask) | PassiveMask) !== NoFlags

  if (subtreeHasEffects || rootHasEffect) {
    // before mutation
    // mutation
    commitMutationEffects(finishedWork, root)
    // fiber 树切换
    root.current = finishedWork
    // layout
  } else {
    // fiber 树切换
    root.current = finishedWork
  }

  rootDoesHasPassiveEffects = false
  ensureRootIsScheduled(root)
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
  let didFlushPassiveEffects = false

  // 首先触发所有unmount effect，且对于某个fiber，如果触发了unmount destroy，本次更新不会再触发update create
  pendingPassiveEffects.unmount.forEach((effect) => {
    didFlushPassiveEffects = true
    commitHookEffectListUnmount(Passive, effect)
  })
  pendingPassiveEffects.unmount = []

  // 触发所有上次更新的destroy
  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffects = true
    commitHookEffectListDestroy(Passive | HookHasEffect, effect)
  })
  // 触发所有这次更新的create
  pendingPassiveEffects.update.forEach((effect) => {
    didFlushPassiveEffects = true
    commitHookEffectListCreate(Passive | HookHasEffect, effect)
  })
  pendingPassiveEffects.update = []

  // useEffect 中触发的更新，确保没有遗留的 effect 需要被执行
  flushSyncCallbacks()

  return didFlushPassiveEffects
}
