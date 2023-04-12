import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols"
import type { Props, ReactElementType } from "shared/ReactTypes"
import {
	FiberNode,
	createFiberFromElement,
	createWorkInProgress,
} from "./fiber"
import { ChildDeletion, Placement } from "./fiberFlags"
import { HostText } from "./workTags"

type ExistingChildren = Map<string | number, FiberNode>

function ChildReconciler(
	/**
	 * 不追踪副作用的话，就不比较多余的 flag，为首屏 mount 优化。
	 * 虽然这里的 fiberNode 没有 Placement，但是在 hostRootFiber 上会有。
	 * 所以最后是对根节点进行一次 Placement 操作。
	 */
	shouldTrackEffects: boolean
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

	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null
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
		element: ReactElementType
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
						deleteRemainingChildren(returnFiber, currentFiber.sibling)
						return existing
					}
					// key 相同 type 不同，不可能存在复用可能性，删除旧节点
					deleteRemainingChildren(returnFiber, currentFiber)
					break
				} else {
					// TODO: 处理多节点情况
					if (__DEV__) {
						console.warn(
							"(reconcileSingleElement)",
							"还未实现的 react 类型",
							element
						)
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
		content: string | number
	) {
		while (currentFiber !== null) {
			// update
			if (currentFiber.tag === HostText) {
				// 类型没变，复用
				const existing = useFiber(currentFiber, { content })
				existing.return = returnFiber
				deleteRemainingChildren(returnFiber, currentFiber.sibling)
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

	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		// 除了 react element，还有其他类型
		newChild: any[]
	) {
		// 最后一个被复用的 fiberNode 在 current 中的位置
		let lastPlacedIndex = 0
		// 创建的最后一个 fiber
		let lastNewFiber: FiberNode | null = null
		// 创建的第一个 fiber
		let firstNewFiber: FiberNode | null = null

		// 1. 将 current 中所有同级 fiber 保存在 Map 中
		const existingChildren: ExistingChildren = new Map()

		// NOTE: 比较的双方，前者 current 是 FiberNode 链表，后者 newChild 是 react element 数组
		let current = currentFirstChild
		while (current !== null) {
			const ketToUse = current.key !== null ? current.key : current.index
			existingChildren.set(ketToUse, current)
			current = current.sibling
		}

		for (let i = 0; i < newChild.length; i++) {
			// 2. 遍历 newChild，判断是否可以复用
			const after = newChild[i]

			const newFiber = updateFromMap(returnFiber, existingChildren, i, after)

			// eg: 更新后变成 false 或者 null
			if (newFiber === null) {
				continue
			}

			// 3. 标记移动还是插入
			newFiber.index = i
			newFiber.return = returnFiber

			if (lastNewFiber === null) {
				lastNewFiber = newFiber
				firstNewFiber = newFiber
			} else {
				lastNewFiber.sibling = newFiber
				lastNewFiber = newFiber
			}

			if (!shouldTrackEffects) {
				continue
			}

			const current = newFiber.alternate
			if (current !== null) {
				const oldIndex = current.index
				if (oldIndex < lastPlacedIndex) {
					// 移动
					newFiber.flags |= Placement
					continue
				} else {
					// 无需移动
					lastPlacedIndex = oldIndex
				}
			} else {
				// 插入
				newFiber.flags |= Placement
				// NOTE: 此处 Placement 出现两种含义，mount 时是插入和 update 时是移动
				lastPlacedIndex = i
			}
		}

		// 4. 将剩下的标记删除
		existingChildren.forEach((child) => {
			deleteChild(returnFiber, child)
		})
		return firstNewFiber
	}

	/**
	 *
	 * 返回 FiberNode 表示可以复用，或者创建的新 FiberNode
	 */
	function updateFromMap(
		returnFiber: FiberNode,
		existingChildren: ExistingChildren,
		index: number,
		element: any
	): FiberNode | null {
		const keyToUse = element.key !== null ? element.key : index
		const before = existingChildren.get(keyToUse) || null

		if (typeof element === "string" || typeof element === "number") {
			// element 是 HostText
			if (before) {
				if (before.tag === HostText) {
					existingChildren.delete(keyToUse)
					return useFiber(before, { content: String(element) })
				}
			}
			// 不能复用的情况无需在此处标记删除，会将 map 中剩余的节点标记统一标记为删除
			return new FiberNode(HostText, { content: String(element) }, null)
		}

		if (typeof element === "object" && element !== null) {
			switch (element.$$typeof) {
				case REACT_ELEMENT_TYPE: {
					if (before) {
						if (before.type === element.type && before.key === element.key) {
							existingChildren.delete(keyToUse)
							return useFiber(before, element.props)
						}
					}
					return createFiberFromElement(element)
				}
				default:
					if (__DEV__) {
						console.warn("(updateFromMap)", "未实现")
					}
					break
			}

			// TODO: 数组类型

			if (Array.isArray(element)) {
				if (__DEV__) {
					console.warn("(updateFromMap)", "未实现数组类型的 child")
				}
			}
		}

		return null
	}

	return function reconcileChildrenFibers(
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
		newChild?: ReactElementType
	) {
		// 单节点
		if (typeof newChild === "object" && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE: {
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					)
				}
				default:
					if (__DEV__) {
						console.warn("(reconcileChidrenFibers)", "未实现的 reconcile 类型")
					}
					break
			}
			// 多节点 ul > li * 3
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFiber, newChild)
			}
		}

		// 文本节点 HostText
		if (typeof newChild === "string" || typeof newChild === "number") {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			)
		}

		// 兜底情况，删除旧节点
		if (currentFiber !== null) {
			deleteChild(returnFiber, currentFiber)
		}

		if (__DEV__) {
			console.warn("reconcileChidrenFibers: 未实现的 reconcile 类型", newChild)
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
