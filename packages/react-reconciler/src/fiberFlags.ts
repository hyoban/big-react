export type Flags = number

export const NoFlags = 0b00000000000000000000000000
export const Placement = 0b00000000000000000000000010
export const Update = 0b00000000000000000000000100
export const ChildDeletion = 0b00000000000000000000010000

/**
 * 表示本次更新存在副作用
 */
export const PassiveEffect = 0b00000000000000000000100000
export const Ref = 0b00000000000000000001000000

/**
 * 用于判断是否需要执行 mutation 子阶段
 */
export const MutationMask = Placement | Update | ChildDeletion | Ref
export const LayoutMask = Ref

/**
 * 表示需要触发 effect（包含组件卸载的情况）
 */
export const PassiveMask = PassiveEffect | ChildDeletion
