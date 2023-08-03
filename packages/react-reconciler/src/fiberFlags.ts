export type Flags = number

export const NoFlags = 0b0000000
export const Placement = 0b0000001
export const Update = 0b0000010
export const ChildDeletion = 0b0000100

/**
 * 表示本次更新存在副作用
 */
export const PassiveEffect = 0b0001000

/**
 * 用于判断是否需要执行 mutation 子阶段
 */
export const MutationMask = Placement | Update | ChildDeletion

/**
 * 表示需要触发 effect（包含组件卸载的情况）
 */
export const PassiveMask = PassiveEffect | ChildDeletion
