const supportsSymbol = typeof Symbol === "function" && Symbol.for

export const REACT_ELEMENT_TYPE = supportsSymbol
	? Symbol.for("react.element")
	: 0xeac7

export const REACT_FRAGMENT_TYPE = supportsSymbol
	? Symbol.for("react.fragment")
	: 0xeacb
