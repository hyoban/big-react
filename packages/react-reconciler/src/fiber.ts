import type { Key, Props, ReactElementType, Ref } from 'shared/ReactTypes'
import type { Container } from 'hostConfig'
import type { WorkTag } from './workTags'
import { FunctionComponent, HostComponent } from './workTags'
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
  memoizedState: any
  alternate: FiberNode | null
  flags: Flags
  subtreeFlags: Flags
  updateQueue: unknown
  deletions: FiberNode[] | null

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
    this.memoizedState = null
    this.updateQueue = null

    // 用于在 wip 和 current 之间切换
    this.alternate = null
    // 副作用，更新标记
    this.flags = NoFlags
    this.subtreeFlags = NoFlags
    this.deletions = null
  }
}

export class FiberRootNode {
  // 需要支持多种宿主环境
  container: Container
  current: FiberNode
  // 更新完成后的 FiberNode
  finishedWork: FiberNode | null

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container

    // 创建与 FiberRootNode 对应的 FiberNode 的连接
    this.current = hostRootFiber
    hostRootFiber.stateNode = this

    this.finishedWork = null
  }
}

export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props,
): FiberNode => {
  let wip = current.alternate
  // 对于同一个 fibernode，在多次更新时，会在双缓存中来回切换，避免重复创建

  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key)
    wip.stateNode = current.stateNode

    wip.alternate = current
    current.alternate = wip
  } else {
    // update
    wip.pendingProps = pendingProps
    wip.flags = NoFlags
    wip.subtreeFlags = NoFlags
    wip.deletions = null
  }
  wip.type = current.type
  wip.updateQueue = current.updateQueue
  wip.child = current.child
  wip.memoizedProps = current.memoizedProps
  wip.memoizedState = current.memoizedState

  return wip
}

export function createFiberFromElement(element: ReactElementType): FiberNode {
  const { type, key, props } = element
  let fiberTag: WorkTag = FunctionComponent

  if (typeof type === 'string') {
    fiberTag = HostComponent
  } else if (typeof type !== 'function' && __DEV__) {
    console.warn('createFiberFromElement: 未定义的 type 类型')
  }

  const fiber = new FiberNode(fiberTag, props, key)
  fiber.type = type
  return fiber
}
