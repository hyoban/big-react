import type { Action } from "shared/ReactTypes"

export interface Dispatcher {
  useState: <T>(initialState: T | (() => T)) => [T, Dispatch<T>]
}

export type Dispatch<State> = (value: Action<State>) => void

const currentDispatcher: {
  current: Dispatcher | null
} = {
  current: null,
}

export const resolveDispatcher = () => {
  const dispatcher = currentDispatcher.current
  if (dispatcher === null) {
    throw new Error(
      "hooks can only be called inside the body of a function component.",
    )
  }

  return dispatcher
}

export default currentDispatcher
