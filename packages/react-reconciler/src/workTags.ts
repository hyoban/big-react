export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment

export const FunctionComponent = 0
// 项目挂载的根节点
export const HostRoot = 3
// <div>
export const HostComponent = 5
// 文本节点
export const HostText = 6
export const Fragment = 7
