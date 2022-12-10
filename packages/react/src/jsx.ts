import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import type { ElementType, Key, Props, ReactElementType, Ref } from 'shared/ReactTypes'

const ReactElement = function (
  type: ElementType,
  key: Key,
  ref: Ref,
  props: Props,
) {
  const element: ReactElementType = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __mark: 'hyoban',
  }
  return element
}

export const jsx = function (
  type: ElementType,
  config: any,
) {
  const props: Props = {}

  let key: Key = null
  let ref: Ref = null
  for (const propName in config) {
    const val = config[propName]
    if (propName === 'key') {
      if (val !== undefined) {
        key = `${val}`
      }
    } else if (propName === 'ref') {
      if (val !== undefined) {
        ref = val
      }
    } else if ({}.hasOwnProperty.call(config, propName)) {
      props[propName] = val
    }
  }
  return ReactElement(type, key, ref, props)
}

export const jsxDEV = jsx
