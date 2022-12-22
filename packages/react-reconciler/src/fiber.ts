import type { Key, Props, Ref } from 'shared/ReactTypes'
import type { WorkTag } from './workTags'
import type { Flags } from './fiberFlags'
import { NoFlags } from './fiberFlags'

export class FiberNode {
  type: any
  tag: WorkTag
  pendingProps: Props
  key: Key
  stateNode: any
  ref: Ref

  return: FiberNode | null
  sibling: FiberNode | null
  child: FiberNode | null
  index: number

  memoizedProps: Props | null
  alternate: FiberNode | null
  flags: Flags

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例属性
    this.tag = tag
    this.key = key
    this.ref = null
    // HostComponent <div> div DOM
    this.stateNode = null
    // FunctionComponent () => {}
    this.type = null

    // 构成树状结构
    // 父节点，return 描述了工作顺序
    this.return = null
    this.sibling = null
    this.child = null
    // 同级 FiberNode 的索引
    this.index = 0

    // 作为工作单元
    // 工作开始前的 props
    this.pendingProps = pendingProps
    // 工作结束后确定下的 props
    this.memoizedProps = null

    // 用于在 wip 和 current 之间切换
    this.alternate = null
    // 副作用，更新标记
    this.flags = NoFlags
  }
}
