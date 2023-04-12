import type { Key, Props, ReactElementType, Ref } from "shared/ReactTypes"
import type { Container } from "hostConfig"
import type { WorkTag } from "./workTags"
import { FunctionComponent, HostComponent } from "./workTags"
import type { Flags } from "./fiberFlags"
import { NoFlags } from "./fiberFlags"

export class FiberNode {
	// 实例属性
	tag: WorkTag
	/**
	 * 从 ReactElement 中取得 type
	 * 对于 FunctionComponent，() => {} 函数本身就是其 type。
	 * 对于 div DOM，type 就是 'div'。
	 */
	type: any
	key: Key
	/**
	 * 比如对于 HostComponent <div>，div 这个 DOM 就是其 stateNode。
	 * 对于 hostRootFiber，stateNode 就是 FiberRootNode。
	 */
	stateNode: any
	ref: Ref

	// 构成树状结构，表示节点之间关系
	/**
	 * 父节点，return 描述了工作顺序
	 */
	return: FiberNode | null
	sibling: FiberNode | null
	child: FiberNode | null
	/**
	 * 同级 FiberNode 的索引
	 */
	index: number

	// 作为工作单元
	/**
	 * 将要发生变化的 props
	 */
	pendingProps: Props
	/**
	 * 工作结束后确定下的 props
	 */
	memoizedProps: Props | null
	/**
	 * 存储消费后的状态。
	 * 对于 FC 来说，它指向 hooks 链表的第一个 hook。
	 */
	memoizedState: any
	/**
	 * 用于在 wip 和 current 之间切换
	 */
	alternate: FiberNode | null
	/**
	 * 副作用，更新标记
	 */
	flags: Flags
	/**
	 * 子树中包含的副作用，更新标记
	 */
	subtreeFlags: Flags
	updateQueue: unknown
	/**
	 * 存储此节点下所有需要删除的子节点
	 */
	deletions: FiberNode[] | null

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag
		this.key = key
		this.stateNode = null
		this.type = null
		this.ref = null

		this.return = null
		this.sibling = null
		this.child = null
		this.index = 0

		this.pendingProps = pendingProps
		this.memoizedProps = null
		this.memoizedState = null
		this.updateQueue = null
		this.alternate = null
		this.flags = NoFlags
		this.subtreeFlags = NoFlags
		this.deletions = null
	}
}

export class FiberRootNode {
	// 需要支持多种宿主环境
	container: Container
	/**
	 * 指向 hostRootFiber
	 */
	current: FiberNode
	/**
	 * 更新完成后的 hostRootFiber
	 */
	finishedWork: FiberNode | null

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container
		this.current = hostRootFiber
		hostRootFiber.stateNode = this
		this.finishedWork = null
	}
}

/**
 * 根据双缓存机制，应当返回 current 对应的 FiberNode。
 * 对于同一个 fibernode，在多次更新时，会在双缓存中来回切换，避免重复创建。
 * @param current
 * @param pendingProps
 * @returns
 */
export function createWorkInProgress(
	current: FiberNode,
	pendingProps: Props
): FiberNode {
	let wip = current.alternate

	if (wip === null) {
		// mount
		// 需要新建一个 FiberNode
		wip = new FiberNode(current.tag, pendingProps, current.key)
		wip.stateNode = current.stateNode
		wip.alternate = current
		current.alternate = wip
	} else {
		// update
		wip.pendingProps = pendingProps
		// 清除副作用，因为可能是上次更新遗留的
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

/**
 * 根据 ReactElement 创建 FiberNode
 * @param element
 * @returns
 */
export function createFiberFromElement(element: ReactElementType): FiberNode {
	const { type, key, props } = element

	let fiberTag: WorkTag = FunctionComponent

	if (typeof type === "string") {
		fiberTag = HostComponent
	} else if (typeof type !== "function" && __DEV__) {
		console.warn("createFiberFromElement", "未定义的 type 类型", element)
	}

	const fiber = new FiberNode(fiberTag, props, key)
	fiber.type = type
	return fiber
}
