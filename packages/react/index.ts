import currentDispatcher, { resolveDispatcher } from "./src/currentDispatcher"
import { isValidElement as isValidElementFn, jsx } from "./src/jsx"

import type { Dispatcher } from "./src/currentDispatcher"

export const version = "1.0.0"

export const isValidElement = isValidElementFn
// TODO: 根据环境区分使用jsx/jsxDEV
export const createElement = jsx

export const useState: Dispatcher["useState"] = (initialState) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

export const useEffect: Dispatcher["useEffect"] = (create, deps) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useEffect(create, deps)
}

/**
 * 内部数据共享层
 */
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
}
