import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import type { Props, ReactElementType } from 'shared/ReactTypes'
import { FiberNode, createFiberFromElement, createWorkInProgress } from './fiber'
import { ChildDeletion, Placement } from './fiberFlags'
import { HostText } from './workTags'

function ChildReconciler(
  shouldTrackEffects: boolean,
  // 不追踪副作用的话，就不比较多余的 flag，为首屏 mount 优化
  // 虽然这里的 fiberNode 没有 Placement，但是在 hostRootFiber 上会有
) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) {
      return
    }

    const deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      deletions.push(childToDelete)
    }
  }

  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElementType,
  ) {
    const key = element.key
    if (currentFiber !== null) {
      // update
      if (currentFiber.key === key) {
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (currentFiber.type === element.type) {
            // key 和 type 都相同，复用
            const existing = useFiber(currentFiber, element.props)
            existing.return = returnFiber
            return existing
          }
          deleteChild(returnFiber, currentFiber)
        } else {
          if (__DEV__) {
            console.warn('还未实现的 recact 类型', element)
          }
        }
      } else {
        // 删除旧节点
        deleteChild(returnFiber, currentFiber)
      }
    }

    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number,
  ) {
    if (currentFiber !== null) {
      // update
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        return existing
      }
      deleteChild(returnFiber, currentFiber)
    }
    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber
    return fiber
  }

  function placeSingleChild(fiber: FiberNode) {
    if (shouldTrackEffects && fiber.alternate === null) {
      fiber.flags |= Placement
    }
    return fiber
  }

  return function reconcileChidrenFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElementType,
  ) {
    // 判断当前 fiber 的类型
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFiber, newChild),
          )
        }
        default:
          if (__DEV__) {
            console.warn('reconcileChidrenFibers: 未实现的 reconcile 类型')
          }
          break
      }
    }

    // 文本节点 HostText
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild),
      )
    }

    if (currentFiber !== null) {
      deleteChild(returnFiber, currentFiber)
    }

    if (__DEV__) {
      console.warn('reconcileChidrenFibers: 未实现的 reconcile 类型', newChild)
    }
    return null
  }
}

function useFiber(fiber: FiberNode, pendingProps: Props) {
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

export const reconcileChildFibers = ChildReconciler(true)
export const mountChildFibers = ChildReconciler(false)
