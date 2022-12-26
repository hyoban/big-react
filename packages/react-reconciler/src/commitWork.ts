import type { Container } from 'hostConfig'
import { appendChildToContainer } from 'hostConfig'
import type { FiberNode, FiberRootNode } from './fiber'
import { MutationMask, NoFlags, Placement } from './fiberFlags'
import { HostComponent, HostRoot, HostText } from './workTags'

let nextEffect: FiberNode | null = null

export const commitMutationEffects = (
  finishedWork: FiberNode,
) => {
  nextEffect = finishedWork

  while (nextEffect !== null) {
    // 向下遍历
    const child: FiberNode | null = nextEffect.child
    if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
      nextEffect = child
    } else {
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
  const flags = finishedWork.flags
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }
}

function commitPlacement(finishedWork: FiberNode) {
  if (__DEV__) {
    console.warn('commitPlacement', finishedWork)
  }
  const hostParent = getHostParent(finishedWork)
  if (hostParent !== null) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent)
  }
}

function getHostParent(fiber: FiberNode) {
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
    console.warn('getHostParent not found', fiber)
  }
  return null
}

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
