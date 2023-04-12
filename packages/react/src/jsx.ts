import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols"
import type {
	ElementType,
	Key,
	Props,
	ReactElementType,
	Ref,
} from "shared/ReactTypes"

/**
 * React Element 构造函数
 */
function ReactElement(type: ElementType, key: Key, ref: Ref, props: Props) {
	const element: ReactElementType = {
		$$typeof: REACT_ELEMENT_TYPE,
		type,
		key,
		ref,
		props,
		__mark: "hyoban",
	}
	return element
}

export function isValidElement(object: any) {
	return (
		typeof object === "object" &&
		object !== null &&
		object.$$typeof === REACT_ELEMENT_TYPE
	)
}

export function jsx(type: ElementType, config: any, ...maybeChildren: any) {
	// NOTE: 此处的 jsx 方法统一了 React.createElement 的处理
	// 实际情况下，两者的实现不相同

	const props: Props = {}

	let key: Key = null
	let ref: Ref = null
	for (const propName in config) {
		// 筛选出 key 和 ref，其他的都作为 props
		const val = config[propName]
		if (propName === "key") {
			if (val !== undefined) {
				key = `${val}`
			}
		} else if (propName === "ref") {
			if (val !== undefined) {
				ref = val
			}
		} else if ({}.hasOwnProperty.call(config, propName)) {
			// 排除原型链上的属性
			props[propName] = val
		}
	}

	const maybeChildrenLength = maybeChildren.length
	if (maybeChildrenLength) {
		if (maybeChildrenLength === 1) {
			props.children = maybeChildren[0]
		} else {
			props.children = maybeChildren
		}
	}
	return ReactElement(type, key, ref, props)
}

export function jsxDEV(type: ElementType, config: any) {
	return jsx(type, config)
}
