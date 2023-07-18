/**
 * update 的优先级
 */
export type Lane = number
/**
 * lane 的集合
 */
export type Lanes = number

// 使用二进制表示有利于选择多个优先级的组合
export const SyncLane = 0b0001
export const NoLane = 0b0000
export const NoLanes = 0b0000

export function mergeLanes(a: Lane, b: Lane): Lanes {
  return a | b
}

/**
 * TODO: 对于不同情况触发的更新，返回不同的优先级
 */
export function requestUpdateLane(): Lane {
  return SyncLane
}

/**
 * lane 越小，优先级越高，不包含 0。
 * 返回二进制中最靠右的一位
 */
export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes
}
