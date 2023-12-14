import {
  appendInitialChild,
  createInstance,
  createTextInstance,
} from "hostConfig"

import { NoFlags, Update } from "./fiberFlags"
import {
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags"

import type { FiberNode } from "./fiber"
import type { Container, Instance } from "hostConfig"

/**
 * 递归中的归。首次渲染时构建离屏 DOM 树。
 * @param wip
 * @returns
 */
export function completeWork(wip: FiberNode) {
  const newProps = wip.pendingProps
  const current = wip.alternate
  switch (wip.tag) {
    case HostComponent:
      if (current !== null && current.stateNode) {
        // update

        // TODO: 应该比较各种 props 是否变化，记录更新 flags，然后在 commit 阶段再更新
        // fiberNode.updateQueue = [
        // 'className', 'xxx', 'style', 'xxx'
        // ]
        // 变的属性名，变的属性值，变的属性名，变的属性值

        // 这里的实现是为了省事
        // updateFiberProps(current.stateNode, newProps)
        markUpdate(wip)
      } else {
        // mount
        // 构建离屏 DOM，同时记录 props 到 DOM 上
        const instance = createInstance(wip.type, newProps)
        // 将子 fiber 创建好的 DOM 插入到 instance 中
        appendAllChildren(instance, wip)
        // 将当前插入完成的更大的 DOM 树位置记录在 FiberNode 中
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostText:
      if (current !== null && current.stateNode) {
        // update
        const oldText = current.memoizedProps.content
        const newText = newProps.content
        if (oldText !== newText) {
          markUpdate(wip)
        }
      } else {
        // 构建离屏 DOM
        const instance = createTextInstance(newProps.content)
        // hostText 不存在 child，不需要挂载
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostRoot:
    case FunctionComponent:
    case Fragment:
      bubbleProperties(wip)
      return null
    default:
      if (__DEV__) {
        console.warn("(completeWork)", ": 未处理的 CompleteWork 情况")
      }
  }
}

// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
function appendAllChildren(parent: Container | Instance, wip: FiberNode) {
  // 插入的应该是组件中的实际节点
  // 比如对于函数组件，应该插入的是函数组件中经过递归找到的实际的节点

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

/**
 * 将子节点 child 和 sibling 的 flags 向上收集
 * @param wip
 */
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

/**
 * 为 fiber 设置更新标记
 * @param fiber
 */
function markUpdate(fiber: FiberNode) {
  fiber.flags |= Update
}
