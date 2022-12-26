export type Flags = number

export const NoFlags = 0b0000001
export const Placement = 0b0000010
export const Update = 0b0000100
export const ChildDeletion = 0b0001000

// 判断是否需要执行 mutation 子阶段
export const MutationMask = Placement | Update | ChildDeletion
