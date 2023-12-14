export type Ref = { current: any } | ((instance: any) => void)
export type ElementType = any
export type Props = any
export type Key = any

export interface ReactElementType {
  /**
   * 内部字段，用于标识当前对象是一个 ReactElement。
   * 需要通过 Symbol 来保证唯一性
   */
  $$typeof: symbol | number
  type: ElementType
  props: Props
  key: Key
  ref: Ref
  /**
   * 自定义字段，真实 react 项目中不存在
   */
  __mark: string
}

/**
 * 支持传递一个值或者函数，函数的返回值作为新的 state
 */
export type Action<State> = State | ((prevState: State) => State)
