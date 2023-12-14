import internals from "shared/internals"

import { Flags, PassiveEffect } from "./fiberFlags"
import { Lane, NoLane, requestUpdateLane } from "./fiberLanes"
import { HookHasEffect, Passive } from "./hookEffectTags"
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
} from "./updateQueue"
import { scheduleUpdateOnFiber } from "./workLoop"

import type { FiberNode } from "./fiber"
import type { Update, UpdateQueue } from "./updateQueue"
import type { Dispatch, Dispatcher } from "react/src/currentDispatcher"
import type { Action } from "shared/ReactTypes"

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null
let renderLane: Lane = NoLane

const { currentDispatcher } = internals

interface Hook {
  /**
   * 保存 hook 自身的状态
   */
  memoizedState: any
  /**
   * useState 能够触发更新，接入更新流程
   */
  updateQueue: unknown
  /**
   * 指向下一个 hook
   */
  next: Hook | null

  baseState: any
  baseQueue: Update<any> | null
}

/**
 * effect 数据结构
 */
export interface Effect {
  tag: Flags
  create: EffectCallback | void
  destroy: EffectCallback | void
  deps: EffectDeps
  /**
   * 指向下一个 effect，便于从全部 hook 直接取到全部的 effect
   */
  next: Effect | null
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null
}

type EffectCallback = () => void
type EffectDeps = Array<any> | null

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
}

export function renderWithHooks(wip: FiberNode, lane: Lane) {
  currentlyRenderingFiber = wip
  // 重置，存储当前 fiber 的 hooks
  wip.memoizedState = null
  // 重置 effect 链表
  wip.updateQueue = null
  renderLane = lane

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
  workInProgressHook = null
  currentHook = null
  renderLane = NoLane
  return children
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  const hook = mountWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  ;(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect

  hook.memoizedState = pushEffect(
    Passive | HookHasEffect,
    create,
    undefined,
    nextDeps,
  )
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  const hook = updateWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  let destroy: EffectCallback | void

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState as Effect
    destroy = prevEffect.destroy

    if (nextDeps !== null) {
      // 浅比较依赖
      const prevDeps = prevEffect.deps
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps)
        return
      }
    }
    // 浅比较 不相等
    ;(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect
    hook.memoizedState = pushEffect(
      Passive | HookHasEffect,
      create,
      destroy,
      nextDeps,
    )
  }
}

function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
  if (prevDeps === null || nextDeps === null) {
    return false
  }
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(prevDeps[i], nextDeps[i])) {
      continue
    }
    return false
  }
  return true
}

function pushEffect(
  hookFlags: Flags,
  create: EffectCallback | void,
  destroy: EffectCallback | void,
  deps: EffectDeps,
): Effect {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destroy,
    deps,
    next: null,
  }
  const fiber = currentlyRenderingFiber as FiberNode
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (updateQueue === null) {
    const updateQueue = createFCUpdateQueue()
    fiber.updateQueue = updateQueue
    effect.next = effect
    updateQueue.lastEffect = effect
  } else {
    // 插入effect
    const lastEffect = updateQueue.lastEffect
    if (lastEffect === null) {
      effect.next = effect
      updateQueue.lastEffect = effect
    } else {
      const firstEffect = lastEffect.next
      lastEffect.next = effect
      effect.next = firstEffect
      updateQueue.lastEffect = effect
    }
  }
  return effect
}

function createFCUpdateQueue<State>() {
  const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>
  updateQueue.lastEffect = null
  return updateQueue
}

/**
 * mount 时，useState 的实现
 * @param initialState
 * @returns
 */
function mountState<State>(
  initialState: State | (() => State),
): [State, Dispatch<State>] {
  const hook = mountWorkInProgressHook()

  // 计算初始状态，保存在 hook 中
  let memoizedState
  if (initialState instanceof Function) {
    memoizedState = initialState()
  } else {
    memoizedState = initialState
  }
  hook.memoizedState = memoizedState

  const queue = createUpdateQueue<State>()
  hook.updateQueue = queue

  // NOTE: dispatch 方法是可以不在 FC 调用中的
  // 这里预置了 fiber 和 queue，用户只需要传递 action
  // @ts-expect-error xxx
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue)
  // 存到 queue 中，在 update 时，作为更新函数返回
  queue.dispatch = dispatch

  return [memoizedState, dispatch]
}

/**
 * 让 useState 返回的 dispatch 接入的更新，从当前 fiber 触发
 * @param fiber
 * @param updateQueue
 * @param action
 */
function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>,
) {
  const lane = requestUpdateLane()
  const update = createUpdate(action, lane)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber, lane)
}

/**
 * 获取 mount 时 hook 的数据
 * @returns
 */
function mountWorkInProgressHook(): Hook {
  // 不存在，首先创建一个
  const hook: Hook = {
    memoizedState: null,
    updateQueue: null,
    next: null,
    baseQueue: null,
    baseState: null,
  }

  if (workInProgressHook === null) {
    // mount 时第一个 hook
    if (currentlyRenderingFiber === null) {
      throw new Error(
        "hooks can only be called inside the body of a function component.",
      )
    } else {
      workInProgressHook = hook
      // 记录数据到 fiber 上
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount 时以后的 hook，串联到链表上
    workInProgressHook.next = hook
    workInProgressHook = hook
  }
  return workInProgressHook
}

/**
 * update 时，useState 的实现
 * @returns
 */
function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook()

  // 计算新 state 的逻辑
  const queue = hook.updateQueue as UpdateQueue<State>
  const baseState = hook.baseState
  const pending = queue.shared.pending
  const current = currentHook as Hook
  let baseQueue = current.baseQueue
  queue.shared.pending = null

  if (pending !== null) {
    // pending baseQueue update保存在current中
    if (baseQueue !== null) {
      // baseQueue b2 -> b0 -> b1 -> b2
      // pendingQueue p2 -> p0 -> p1 -> p2
      // b0
      const baseFirst = baseQueue.next
      // p0
      const pendingFirst = pending.next
      // b2 -> p0
      baseQueue.next = pendingFirst
      // p2 -> b0
      pending.next = baseFirst
      // p2 -> b0 -> b1 -> b2 -> p0 -> p1 -> p2
    }
    baseQueue = pending
    // 保存在current中
    current.baseQueue = pending
    queue.shared.pending = null

    if (baseQueue !== null) {
      const {
        memoizedState,
        baseQueue: newBaseQueue,
        baseState: newBaseState,
      } = processUpdateQueue(baseState, baseQueue, renderLane)
      hook.memoizedState = memoizedState
      hook.baseState = newBaseState
      hook.baseQueue = newBaseQueue
    }
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function updateWorkInProgressHook(): Hook {
  // TODO: render 过程中触发的更新
  let nextCurrentHook: Hook | null
  if (currentHook === null) {
    // update 时第一个 hook
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
    // nextCurrentHook 不存在，说明 hooks 数量不一致，因为不是 mount，currentlyRenderingFiber 一定存在
    // mount/update u1, u2, u3
    // update       u1, u2, u3, u4
    // 经过 nextCurrentHook = currentHook.next 导致 nextCurrentHook 为 null
    throw new Error("Rendered more hooks than during the previous render.")
  }

  currentHook = nextCurrentHook
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
    baseQueue: currentHook.baseQueue,
    baseState: currentHook.baseState,
  }
  if (workInProgressHook === null) {
    // update 时第一个 hook
    if (currentlyRenderingFiber === null) {
      throw new Error(
        "hooks can only be called inside the body of a function component.",
      )
    } else {
      workInProgressHook = newHook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // update 时以后的 hook
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }
  return workInProgressHook
}
