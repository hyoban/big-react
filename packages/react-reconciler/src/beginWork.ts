import { mountChildFibers, reconcileChildFibers } from "./childFibers"
import { Ref } from "./fiberFlags"
import { renderWithHooks } from "./fiberHooks"
import { Lane } from "./fiberLanes"
import { processUpdateQueue } from "./updateQueue"
import {
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags"

import type { FiberNode } from "./fiber"
import type { UpdateQueue } from "./updateQueue"
import type { ReactElementType } from "shared/ReactTypes"

/**
 * 递归中的递阶段，react element 和 fiber node 的比较，返回子 fiberNode
 * @param wip
 * @returns
 */
export function beginWork(wip: FiberNode, renderLane: Lane) {
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip, renderLane)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      // 文本节点没有子节点，因此‘递’到底了
      return null
    case FunctionComponent:
      return updateFunctionComponent(wip, renderLane)
    case Fragment:
      return updateFragment(wip)
    default:
      if (__DEV__) {
        console.warn("(beginWork)", "未实现的类型", wip)
      }
  }
  return null
}

function updateFragment(wip: FiberNode) {
  const nextChildren = wip.pendingProps
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
  // 执行 fc，得到 children
  const nextChildren = renderWithHooks(wip, renderLane)
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
  // 对于 HostRoot
  // 1. 计算状态最新值
  // 2. 创建子 fiberNode

  // 首屏渲染时不存在
  const baseState = wip.memoizedState
  const updateQueue = wip.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending
  // 已经开始计算了，计算完成后 pending 就没有用了
  updateQueue.shared.pending = null
  const { memoizedState } = processUpdateQueue(baseState, pending, renderLane)
  // 最新状态，也就是传入的 ReactElement
  wip.memoizedState = memoizedState

  const nextChildren = wip.memoizedState
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function updateHostComponent(workInProgress: FiberNode) {
  // 对于 HostComponent，不会触发更新
  // 1. 创建子 fiberNode

  // children 从 react element 的 props 中取
  const nextProps = workInProgress.pendingProps
  const nextChildren = nextProps.children
  markRef(workInProgress.alternate, workInProgress)
  reconcileChildren(workInProgress, nextChildren)
  return workInProgress.child
}

function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
  // 获取父节点的 current fiberNode 来对比，返回 wip 的子 fiberNode
  const current = wip.alternate
  if (current === null) {
    // 首次渲染
    wip.child = mountChildFibers(wip, null, children)
  } else {
    // 首次渲染过程中，只有 HostRoot 会走到这里
    // 因为在 renderRoot 时，通过创建 wip，使得它是唯一的存在 wip 和 current 的 fiberNode

    // 更新
    wip.child = reconcileChildFibers(wip, current.child, children)
  }
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
  const ref = workInProgress.ref

  // 标记Ref需要满足：
  if (
    // mount时：存在ref
    (current === null && ref !== null) ||
    // update时：ref引用变化
    (current !== null && current.ref !== ref)
  ) {
    workInProgress.flags |= Ref
  }
}
