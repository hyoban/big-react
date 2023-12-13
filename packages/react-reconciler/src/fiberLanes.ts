import {
  unstable_IdlePriority,
  unstable_ImmediatePriority,
  unstable_NormalPriority,
  unstable_UserBlockingPriority,
  unstable_getCurrentPriorityLevel,
} from "scheduler"
import { FiberRootNode } from "./fiber"

/**
 * update 的优先级
 */
export type Lane = number
/**
 * lane 的集合
 */
export type Lanes = number

// 使用二进制表示有利于选择多个优先级的组合
// 非 0 数值越低，优先级越高
export const SyncLane = 0b0001
export const NoLane = 0b0000
export const NoLanes = 0b0000
/**
 * 连续输入事件，如拖拽
 */
export const InputContinuousLane = 0b0010
export const DefaultLane = 0b0100
export const IdleLane = 0b1000

export function mergeLanes(a: Lane, b: Lane): Lanes {
  return a | b
}

/**
 * 对于不同情况触发的更新，返回不同的优先级。从上下文中获取当前的优先级。
 */
export function requestUpdateLane(): Lane {
  const currentSchedulerPriority = unstable_getCurrentPriorityLevel()
  const lane = schedulerPriorityToLane(currentSchedulerPriority)
  return lane
}

/**
 * lane 越小，优先级越高，不包含 0。
 * 返回二进制中最靠右的一位
 */
export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes
}

export function markRootFinished(root: FiberRootNode, lanes: Lanes) {
  root.pendingLanes &= ~lanes
}

/**
 * 将 react 运行时的优先级 lane 转换为调度器中的优先级
 */
export function lanesToSchedulerPriority(lanes: Lanes) {
  const lane = getHighestPriorityLane(lanes)
  if (lane === SyncLane) {
    return unstable_ImmediatePriority
  }
  if (lane === InputContinuousLane) {
    return unstable_UserBlockingPriority
  }
  if (lane === DefaultLane) {
    return unstable_NormalPriority
  }
  return unstable_IdlePriority
}

/**
 * 调度器中的优先级转换为 react 运行时的优先级 lane
 */
export function schedulerPriorityToLane(schedulerPriority: number) {
  if (schedulerPriority === unstable_ImmediatePriority) {
    return SyncLane
  }
  if (schedulerPriority === unstable_UserBlockingPriority) {
    return InputContinuousLane
  }
  if (schedulerPriority === unstable_NormalPriority) {
    return DefaultLane
  }
  return NoLane
}
