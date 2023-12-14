import {
  appendChildToContainer,
  commitUpdate,
  insertChildToContainer,
  removeChild,
} from "hostConfig"

import {
  ChildDeletion,
  Flags,
  LayoutMask,
  MutationMask,
  NoFlags,
  PassiveEffect,
  PassiveMask,
  Placement,
  Ref,
  Update,
} from "./fiberFlags"
import { Effect, FCUpdateQueue } from "./fiberHooks"
import { HookHasEffect } from "./hookEffectTags"
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./workTags"

import type { FiberNode, FiberRootNode, PendingPassiveEffects } from "./fiber"
import type { Container, Instance } from "hostConfig"

let nextEffect: FiberNode | null = null

function commitEffects(
  phrase: "mutation" | "layout",
  mask: Flags,
  callback: (fiber: FiberNode, root: FiberRootNode) => void,
) {
  return (finishedWork: FiberNode, root: FiberRootNode) => {
    nextEffect = finishedWork

    while (nextEffect !== null) {
      // 向下遍历
      const child: FiberNode | null = nextEffect.child
      if ((nextEffect.subtreeFlags & mask) !== NoFlags && child !== null) {
        nextEffect = child
      } else {
        // 要么没有子节点，要么子节点没有 flags
        // 向上遍历
        while (nextEffect !== null) {
          callback(nextEffect, root)
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
}

function commitMutationEffectsOnFiber(
  finishedWork: FiberNode,
  root: FiberRootNode,
) {
  // 此处的 finishedWork 就是真正需要处理 flags 的节点
  const { flags, tag } = finishedWork

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
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete, root)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }

  if ((flags & PassiveEffect) !== NoFlags) {
    // 收集回调
    commitPassiveEffect(finishedWork, root, "update")
    finishedWork.flags &= ~PassiveEffect
  }

  if ((flags & Ref) !== NoFlags && tag === HostComponent) {
    safelyDetachRef(finishedWork)
  }
}

function safelyDetachRef(current: FiberNode) {
  const ref = current.ref
  if (ref !== null) {
    if (typeof ref === "function") {
      ref(null)
    } else {
      ref.current = null
    }
  }
}

const commitLayoutEffectsOnFiber = (
  finishedWork: FiberNode,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _root: FiberRootNode,
) => {
  const { flags, tag } = finishedWork

  if ((flags & Ref) !== NoFlags && tag === HostComponent) {
    // 绑定新的ref
    safelyAttachRef(finishedWork)
    finishedWork.flags &= ~Ref
  }
}

function safelyAttachRef(fiber: FiberNode) {
  const ref = fiber.ref
  if (ref !== null) {
    const instance = fiber.stateNode
    if (typeof ref === "function") {
      ref(instance)
    } else {
      ref.current = instance
    }
  }
}

export const commitMutationEffects = commitEffects(
  "mutation",
  MutationMask | PassiveMask,
  commitMutationEffectsOnFiber,
)

export const commitLayoutEffects = commitEffects(
  "layout",
  LayoutMask,
  commitLayoutEffectsOnFiber,
)

function commitPassiveEffect(
  fiber: FiberNode,
  root: FiberRootNode,
  type: keyof PendingPassiveEffects,
) {
  // update unmount
  if (
    fiber.tag !== FunctionComponent ||
    (type === "update" && (fiber.flags & PassiveEffect) === NoFlags)
  ) {
    return
  }
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (updateQueue !== null) {
    if (updateQueue.lastEffect === null && __DEV__) {
      console.error("当FC存在PassiveEffect flag时，不应该不存在effect")
    }
    root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect)
  }
}

function commitHookEffectList(
  flags: Flags,
  lastEffect: Effect,
  callback: (effect: Effect) => void,
) {
  let effect = lastEffect.next as Effect

  do {
    if ((effect.tag & flags) === flags) {
      callback(effect)
    }
    effect = effect.next as Effect
  } while (effect !== lastEffect.next)
}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const destroy = effect.destroy
    if (typeof destroy === "function") {
      destroy()
    }
    effect.tag &= ~HookHasEffect
  })
}

export function commitHookEffectListDestroy(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const destroy = effect.destroy
    if (typeof destroy === "function") {
      destroy()
    }
  })
}

export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, (effect) => {
    const create = effect.create
    if (typeof create === "function") {
      effect.destroy = create()
    }
  })
}

function recordHostChildrenToDelete(
  childrenToDelete: FiberNode[],
  unmountFiber: FiberNode,
) {
  // 1. 找到第一个root host节点
  const lastOne = childrenToDelete[childrenToDelete.length - 1]

  if (!lastOne) {
    childrenToDelete.push(unmountFiber)
  } else {
    let node = lastOne.sibling
    while (node !== null) {
      if (unmountFiber === node) {
        childrenToDelete.push(unmountFiber)
      }
      node = node.sibling
    }
  }

  // 2. 每找到一个 host节点，判断下这个节点是不是 1 找到那个节点的兄弟节点
}

function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
  // 记录遍历过程中要子树中最高的节点，用于后续的删除
  const rootChildrenToDelete: FiberNode[] = []

  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent: {
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        // 解绑 ref
        safelyDetachRef(unmountFiber)
        return
      }
      case HostText: {
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber)
        return
      }
      case FunctionComponent: {
        // TODO: 执行 useEffect 的 cleanup
        commitPassiveEffect(unmountFiber, root, "unmount")
        return
      }
      default: {
        if (__DEV__) {
          console.warn(
            "(commitDeletion)",
            "未处理的 unmount 类型",
            unmountFiber,
          )
        }
      }
    }
  })

  if (rootChildrenToDelete.length) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent !== null) {
      rootChildrenToDelete.forEach((node) => {
        removeChild(node.stateNode, hostParent)
      })
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
  // eslint-disable-next-line no-constant-condition
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
    console.warn("(commitPlacement)", "执行 Placement 操作", finishedWork)
  }

  // 找到最近的父级 host 节点
  const hostParent = getHostParent(finishedWork)

  // 找到兄弟 host 节点
  const hostSibling = getHostSibling(finishedWork)

  if (hostParent !== null) {
    // 将 finishedWork 对应的 DOM 节点插入到父级节点中
    // 或者插入父级节点的子节点之前
    insertOrAppendPlacementNodeIntoContainer(
      finishedWork,
      hostParent,
      hostSibling,
    )
  }
}

function getHostSibling(fiber: FiberNode) {
  let node = fiber

  // eslint-disable-next-line no-constant-condition
  findSiblings: while (true) {
    while (node.sibling === null) {
      const parent = node.return
      if (
        parent === null ||
        parent.tag === HostRoot ||
        parent.tag === HostComponent
      ) {
        // 终止条件，没找到
        return null
      }
      node = parent
    }

    // 顺着同级向下找
    node.sibling.return = node.return
    node = node.sibling

    while (node.tag !== HostText && node.tag !== HostComponent) {
      if ((node.flags & Placement) !== NoFlags) {
        // 不稳定的节点
        continue findSiblings
      }

      if (node.child === null) {
        continue findSiblings
      } else {
        node.child.return = node
        node = node.child
      }
    }

    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode
    }
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
    console.warn("(getHostParent)", "未找到宿主节点", fiber)
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
function insertOrAppendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance,
) {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(finishedWork.stateNode, hostParent, before)
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode)
    }
    return
  }
  const child = finishedWork.child
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling

    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
