export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText

export const FunctionComponent = 0
// 项目挂载的根节点
export const HostRoot = 3
// <div>
export const HostComponent = 5
// 文本节点
export const HostText = 6
