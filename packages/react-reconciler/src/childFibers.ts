import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import type { Props, ReactElementType } from 'shared/ReactTypes'
import { FiberNode, createFiberFromElement, createWorkInProgress } from './fiber'
import { ChildDeletion, Placement } from './fiberFlags'
import { HostText } from './workTags'

function ChildReconciler(
  /**
   * 不追踪副作用的话，就不比较多余的 flag，为首屏 mount 优化。
   * 虽然这里的 fiberNode 没有 Placement，但是在 hostRootFiber 上会有。
   * 所以最后是对根节点进行一次 Placement 操作。
   */
  shouldTrackEffects: boolean,
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

  function deleteRemaingChildren(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
  ) {
    if (!shouldTrackEffects) {
      return null
    }

    let childToDelete = currentFirstChild
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
    return null
  }

  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElementType,
  ) {
    const key = element.key
    while (currentFiber !== null) {
      // update
      if (currentFiber.key === key) {
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (currentFiber.type === element.type) {
            // key 和 type 都相同，复用
            const existing = useFiber(currentFiber, element.props)
            existing.return = returnFiber
            // 当前节点可以复用，标记其它的节点为删除
            deleteRemaingChildren(returnFiber, currentFiber.sibling)
            return existing
          }
          // key 相同 type 不同，不可能存在复用可能性，删除旧节点
          deleteRemaingChildren(returnFiber, currentFiber)
          break
        } else {
          // TODO: 处理多节点情况
          if (__DEV__) {
            console.warn('(reconcileSingleElement)', '还未实现的 react 类型', element)
            break
          }
        }
      } else {
        // key 不同，删除当前，继续往下找
        deleteChild(returnFiber, currentFiber)
        currentFiber = currentFiber.sibling
      }
    }

    // mount 时就是根据 element 创建 fiberNode 即可
    // 更新时上面的流程如果没有找到可以复用的，就创建一个新的
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number,
  ) {
    while (currentFiber !== null) {
      // update
      if (currentFiber.tag === HostText) {
        // 类型没变，复用
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        deleteRemaingChildren(returnFiber, currentFiber.sibling)
        return existing
      }
      // 类型不同，比如 div 变成了 text，删除旧节点
      deleteChild(returnFiber, currentFiber)
      currentFiber = currentFiber.sibling
    }

    // mount
    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber
    return fiber
  }

  /**
   * 应用首屏优化策略，根据 shouldTrackEffects 判断是否需要标记 Placement
   * @param fiber
   * @returns
   */
  function placeSingleChild(fiber: FiberNode) {
    if (shouldTrackEffects && fiber.alternate === null) {
      fiber.flags |= Placement
    }
    return fiber
  }

  return function reconcileChidrenFibers(
    /**
     * 父 fiber
     */
    returnFiber: FiberNode,
    /**
     * 子节点 current fiber
     */
    currentFiber: FiberNode | null,
    /**
     * 子节点 react element
     */
    newChild?: ReactElementType,
  ) {
    // 单节点
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFiber, newChild),
          )
        }
        default:
          if (__DEV__) {
            console.warn('(reconcileChidrenFibers)', '未实现的 reconcile 类型')
          }
          break
      }
    }

    // TODO: 多节点 ul > li * 3

    // 文本节点 HostText
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild),
      )
    }

    // 兜底情况，删除旧节点
    if (currentFiber !== null) {
      deleteChild(returnFiber, currentFiber)
    }

    if (__DEV__) {
      console.warn('reconcileChidrenFibers: 未实现的 reconcile 类型', newChild)
    }
    return null
  }
}

/**
 * 复用传入的 fiberNode
 * @param fiber
 * @param pendingProps
 * @returns
 */
function useFiber(fiber: FiberNode, pendingProps: Props) {
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

export const reconcileChildFibers = ChildReconciler(true)
export const mountChildFibers = ChildReconciler(false)
