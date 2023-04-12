import type { Dispatch } from "react/src/currentDispatcher"
import type { Action } from "shared/ReactTypes"

export interface Update<State> {
	action: Action<State>
}

export interface UpdateQueue<State> {
	// 这样的结构是为了在 wip 和 current 之间共享
	shared: {
		pending: Update<State> | null
	}
	/**
	 * 保存 hooks 的 dispatch
	 */
	dispatch: Dispatch<State> | null
}

/**
 * Update 实例化方法
 * @param action
 * @returns
 */
export function createUpdate<State>(action: Action<State>): Update<State> {
	return {
		action,
	}
}

/**
 * UpdateQueue 实例化方法
 * @returns
 */
export function createUpdateQueue<State>(): UpdateQueue<State> {
	return {
		shared: {
			pending: null,
		},
		dispatch: null,
	}
}

/**
 * 往 updateQueue 中添加一个 update
 * @param updateQueue
 * @param update
 */
export function enqueueUpdate<State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) {
	updateQueue.shared.pending = update
}

/**
 * updateQueue 消费 update
 * @param baseState 初始状态
 * @param pendingUpdate 消费的 update
 * @returns 全新的状态
 */
export function processUpdateQueue<State>(
	baseState: State,
	pendingUpdate: Update<State> | null
): { memoizedState: State } {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
	}

	if (pendingUpdate !== null) {
		const action = pendingUpdate.action
		if (action instanceof Function) {
			// baseState 1 update (x) => 4x -> memoizedState 4
			result.memoizedState = action(baseState)
		} else {
			// baseState 1 update 2 -> memoizedState 2
			result.memoizedState = action
		}
	}

	return result
}
