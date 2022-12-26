import type { Container } from 'hostConfig'
import { appendInitialChild, createInstance, createTextInstance } from 'hostConfig'
import type { FiberNode } from './fiber'
import { NoFlags } from './fiberFlags'
import { HostComponent, HostRoot, HostText } from './workTags'

export const completeWork = (wip: FiberNode) => {
  // 递归中的归

  const newProps = wip.pendingProps
  const current = wip.alternate
  switch (wip.tag) {
    case HostComponent:
      if (current !== null && current.stateNode) {
        // update
      } else {
        // 构建离屏 DOM
        const instance = createInstance(wip.type, newProps)
        // 将 DOM 插入 DOM 树中
        appendAllChildren(instance, wip)
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostText:
      if (current !== null && current.stateNode) {
        // update
      } else {
        // 构建离屏 DOM
        const instance = createTextInstance(newProps.content)
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostRoot:
      bubbleProperties(wip)
      return null
    default:
      if (__DEV__) {
        console.warn('completeWork: 未处理的 CompleteWork 类型')
      }
  }
}

function appendAllChildren(parent: Container, wip: FiberNode) {
  // 插入的应该是组件中的实际节点
  let node = wip.child

  while (node !== null) {
    if (node?.tag === HostComponent || node?.tag === HostText) {
      appendInitialChild(parent, node.stateNode)
    } else if (node?.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === wip) {
      return
    }

    while (node?.sibling === null) {
      if (node?.return === null || node?.return === wip) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags
  let child = wip.child

  while (child !== null) {
    subtreeFlags |= child.subtreeFlags
    subtreeFlags |= child.flags

    child.return = wip
    child = child.sibling
  }
  wip.subtreeFlags |= subtreeFlags
}
