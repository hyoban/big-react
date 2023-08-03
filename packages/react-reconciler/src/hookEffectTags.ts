/**
 * 表示 useEffect
 */
export const Passive = 0b0010

/**
 * 表示本次更新需要触发 effect
 */
export const HookHasEffect = 0b0001

// 对于fiber，新增PassiveEffect，代表「当前fiber本次更新存在副作用」
// 对于effect hook，Passive代表「useEffect对应effect」
// 对于effect hook，HookHasEffect代表「当前effect本次更新存在副作用」
