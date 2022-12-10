export type ElementType = any
export type Key = any
export type Ref = any
export type Props = any

export interface ReactElementType {
  /**
   * 内部字段，用于标识当前对象是一个 ReactElement
   * 需要通过 Symbol 来保证唯一性
   */
  $$typeof: Symbol | number
  type: ElementType
  key: Key
  ref: Ref
  props: Props
  /**
   * 自定义字段，真实 react 项目中不存在
   */
  __mark: string
}
