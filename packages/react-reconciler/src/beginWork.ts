import type { ReactElementType } from 'shared/ReactTypes'
import { mountChildFibers, reconcileChildFibers } from './childFibers'
import type { FiberNode } from './fiber'
import { renderWithHooks } from './fiberHooks'
import type { UpdateQueue } from './updateQueue'
import { processUpdateQueue } from './updateQueue'
import { FunctionComponent, HostComponent, HostRoot, HostText } from './workTags'

// 递归中的递阶段
export const beginWork = (wip: FiberNode) => {
  // 比较，返回子fiberNode
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      return null
    case FunctionComponent:
      return updateFunctionComponent(wip)
    default:
      if (__DEV__) {
        console.warn('beginWork: 未知的 fiberNode 类型')
      }
  }
  return null
}

function updateFunctionComponent(wip: FiberNode) {
  // 执行 fc，得到 children
  const nextChildren = renderWithHooks(wip)
  reconcileChidren(wip, nextChildren)
  return wip.child
}

function updateHostRoot(wip: FiberNode) {
  // 1. 计算状态最新值
  // 2. 创建子 fiberNode

  // 首屏渲染时不存在
  const baseState = wip.memoizedState
  const updateQueue = wip.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending
  // 计算完成后 pending 就没有用了
  updateQueue.shared.pending = null
  // 最新状态，传入的 ReactElement
  const { memoizedState } = processUpdateQueue(baseState, pending)
  wip.memoizedState = memoizedState

  const nextChildren = wip.memoizedState
  reconcileChidren(wip, nextChildren)
  return wip.child
}

function updateHostComponent(wip: FiberNode) {
  // 不存在更新
  // 1. 创建子 fiberNode
  const nextProps = wip.pendingProps
  const nextChildren = nextProps.children
  reconcileChidren(wip, nextChildren)
  return wip.child
}

function reconcileChidren(wip: FiberNode, children?: ReactElementType) {
  const current = wip.alternate
  if (current === null) {
    // 首次渲染
    wip.child = mountChildFibers(wip, null, children)
  } else {
    // 更新
    wip.child = reconcileChildFibers(wip, current.child, children)
  }
}
