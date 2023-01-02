import type { Container } from 'hostConfig'
import { appendChildToContainer, commitTextUpdate, removeChild } from 'hostConfig'
import type { FiberNode, FiberRootNode } from './fiber'
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from './fiberFlags'
import { FunctionComponent, HostComponent, HostRoot, HostText } from './workTags'

let nextEffect: FiberNode | null = null

export function commitMutationEffects(
  finishedWork: FiberNode,
) {
  nextEffect = finishedWork

  while (nextEffect !== null) {
    // 向下遍历
    const child: FiberNode | null = nextEffect.child
    if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
      nextEffect = child
    } else {
      // 要么没有子节点，要么子节点没有 flags
      // 向上遍历
      while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect)
        const sibling: FiberNode | null = nextEffect.sibling
        if (sibling !== null) {
          nextEffect = sibling
          break
        }
        nextEffect = nextEffect.return
      }
    }
  }
}

function commitMutationEffectsOnFiber(finishedWork: FiberNode) {
  // 此处的 finishedWork 就是真正需要处理 flags 的节点
  const flags = finishedWork.flags

  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    // 将 Placement 标记从 flags 中移除
    finishedWork.flags &= ~Placement
  }

  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }

  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach(commitDeletion)
    }
    finishedWork.flags &= ~ChildDeletion
  }
}

function commitUpdate(fiber: FiberNode) {
  switch (fiber.tag) {
    case HostText: {
      const text = fiber.memoizedProps.content
      return commitTextUpdate(fiber.stateNode, text)
    }
    default: {
      if (__DEV__) {
        console.warn('(commitUpdate)', '未实现的 update 类型', fiber)
      }
    }
  }
}

function commitDeletion(childToDelete: FiberNode) {
  // 记录遍历过程中要子树中最高的节点，用于后续的删除
  let rootHostNode: FiberNode | null = null

  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent: {
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        // TODO: 解绑 ref，执行 useEffect 的 cleanup
        return
      }
      case HostText: {
        if (rootHostNode === null) {
          rootHostNode = unmountFiber
        }
        return
      }
      case FunctionComponent: {
        // TODO: 执行 useEffect 的 cleanup
        return
      }
      default: {
        if (__DEV__) {
          console.warn('(commitDeletion)', '未处理的 unmount 类型', unmountFiber)
        }
      }
    }
  })

  if (rootHostNode !== null) {
    const hostParent = getHostParent(rootHostNode)
    if (hostParent !== null) {
      removeChild(hostParent, (rootHostNode as FiberNode).stateNode)
    }
  }
  childToDelete.return = null
  childToDelete.child = null
}

/**
 * DFS 递归子树
 * @param root 子树的根节点
 * @param onCommitUnmount 递归时执行的操作
 * @returns
 */
function commitNestedComponent(
  root: FiberNode,
  onCommitUnmount: (fiber: FiberNode) => void,
) {
  let node = root
  while (true) {
    onCommitUnmount(node)

    if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }

    if (node === root) {
      return
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

function commitPlacement(finishedWork: FiberNode) {
  if (__DEV__) {
    console.warn('(commitPlacement)', '执行 Placement 操作', finishedWork)
  }

  // 找到最近的父级节点
  const hostParent = getHostParent(finishedWork)
  if (hostParent !== null) {
    // 将 finishedWork 对应的 DOM 节点插入到父级节点中
    appendPlacementNodeIntoContainer(finishedWork, hostParent)
  }
}

/**
 * 向上找到 fiber 最近的包含实际宿主环境节点 fiber 的宿主节点
 * @param fiber
 * @returns
 */
function getHostParent(fiber: FiberNode): Container | null {
  let parent = fiber.return
  while (parent !== null) {
    const parentTag = parent.tag

    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container
    }
    if (parentTag === HostComponent) {
      return parent.stateNode as Container
    }

    parent = parent.return
  }
  if (__DEV__) {
    console.warn('(getHostParent)', '未找到宿主节点', fiber)
  }
  return null
}

/**
 * 将标记 Placement 的 fiber 节点对应的宿主环境节点插入到父宿主节点中。
 * 传入的 fiber 不一定有对应宿主环境节点，需要向下递归找到实际的 host node。
 * @param finishedWork
 * @param hostParent
 * @returns
 */
function appendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
) {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    appendChildToContainer(hostParent, finishedWork.stateNode)
    return
  }
  const child = finishedWork.child
  if (child !== null) {
    appendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling

    while (sibling !== null) {
      appendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
