import type { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import internals from 'shared/internals'
import type { Action } from 'shared/ReactTypes'
import type { FiberNode } from './fiber'
import type { UpdateQueue } from './updateQueue'
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue } from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null

const { currentDispatcher } = internals

interface Hook {
  /**
   * 保存 hook 自身的状态
   */
  memoizedState: any
  updateQueue: unknown
  /**
   * 指向下一个 hook
   */
  next: Hook | null
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
}

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook()

  // 计算新 state 的逻辑
  const queue = hook.updateQueue as UpdateQueue<State>
  const pending = queue.shared.pending

  if (pending !== null) {
    const { memoizedState } = processUpdateQueue(hook.memoizedState, pending)
    hook.memoizedState = memoizedState
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function updateWorkInProgressHook(): Hook {
  // TODO: render 过程中触发的更新
  let nextCurrentHook: Hook | null
  if (currentHook === null) {
    const current = currentlyRenderingFiber?.alternate
    if (current && current !== null) {
      nextCurrentHook = current.memoizedState
    } else {
      nextCurrentHook = null
    }
  } else {
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    throw new Error(`组件 ${currentlyRenderingFiber?.type} 本次执行和上次相比 hooks 数量不一致`)
  }

  currentHook = nextCurrentHook
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
  }
  if (workInProgressHook === null) {
    // mount 时第一个 hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件中调用 hooks')
    } else {
      workInProgressHook = newHook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount 时以后的 hook
    workInProgressHook = workInProgressHook.next = newHook
  }
  return workInProgressHook
}

export function renderWithHooks(wip: FiberNode) {
  currentlyRenderingFiber = wip
  // 重置，存储当前 fiber 的 hooks
  wip.memoizedState = null

  const current = wip.alternate
  if (current !== null) {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount
  }

  const Component = wip.type
  const props = wip.pendingProps
  const children = Component(props)

  currentlyRenderingFiber = null
  return children
}

function mountState<State>(
  initialState: State | (() => State),
): [State, Dispatch<State>] {
  const hook = mountWorkInProgressHook()

  let memoizedState
  if (initialState instanceof Function) {
    memoizedState = initialState()
  } else {
    memoizedState = initialState
  }

  hook.memoizedState = memoizedState

  const queue = createUpdateQueue<State>()
  hook.updateQueue = queue

  // @ts-expect-error TODO: fix this
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue)
  queue.dispatch = dispatch

  return [memoizedState, dispatch]
}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>,
) {
  const update = createUpdate(action)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber)
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
  }

  if (workInProgressHook === null) {
    // mount 时第一个 hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件中调用 hooks')
    } else {
      workInProgressHook = hook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount 时以后的 hook
    workInProgressHook = workInProgressHook.next = hook
  }
  return workInProgressHook
}
