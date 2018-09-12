// @flow
import * as React from 'react'
import requireById from './requireById'

import type {
  Id,
  Key,
  Props,
  LoadingComponent,
  ErrorComponent,
  OnLoad,
  Mod,
  StrFun
} from './flowTypes'

export const isTest = process.env.NODE_ENV === 'test'
export const isServer = !(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
)

export const isWebpack = () => typeof __webpack_require__ !== 'undefined'
export const babelInterop = (mod: ?Mod) =>
  mod && typeof mod === 'object' && mod.__esModule ? mod.default : mod

export const DefaultLoading: LoadingComponent = () => <div>Loading...</div>
export const DefaultError: ErrorComponent = ({ error }) => (
  <div>Error: {error && error.message}</div>
)

export const tryRequire = (id: Id): ?any => {
  try {
    return requireById(id)
  }
  catch (err) {
    // warn if there was an error while requiring the chunk during development
    // this can sometimes lead the server to render the loading component.
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `chunk not available for synchronous require yet: ${id}: ${
          err.message
        }`,
        err.stack
      )
    }
  }

  return null
}

export const resolveExport = (
  mod: ?Mod,
  key: ?Key,
  onLoad: ?OnLoad,
  chunkName: ?StrFun,
  props: Object,
  context: Object,
  modCache: Object,
  isSync?: boolean = false
) => {
  const exp = findExport(mod, key)
  if (onLoad && mod) {
    const isServer = typeof window === 'undefined'
    const info = { isServer, isSync }
    onLoad(mod, info, props, context)
  }
  if (chunkName && exp) cacheExport(exp, chunkName, props, modCache)
  return exp
}

export const findExport = (mod: ?Mod, key?: Key): ?any => {
  if (typeof key === 'function') {
    return key(mod)
  }
  else if (key === null) {
    return mod
  }

  return mod && typeof mod === 'object' && key ? mod[key] : babelInterop(mod)
}

export const createElement = (Component: any, props: {}) =>
  React.isValidElement(Component) ? (
    React.cloneElement(Component, props)
  ) : (
    <Component {...props} />
  )

export const createDefaultRender = (
  Loading: LoadingComponent,
  Err: ErrorComponent
) => (props: Props, mod: ?any, isLoading: ?boolean, error: ?Error) => {
  if (isLoading) {
    return createElement(Loading, props)
  }
  else if (error) {
    return createElement(Err, { ...props, error })
  }
  else if (mod) {
    // primary usage (for async import loading + errors):
    return createElement(mod, props)
  }

  return createElement(Loading, props)
}

export const callForString = (strFun: StrFun, props: Object) =>
  typeof strFun === 'function' ? strFun(props) : strFun

export const loadFromCache = (
  chunkName: StrFun,
  props: Object,
  modCache: Object
) => !isServer && modCache[callForString(chunkName, props)]

export const cacheExport = (
  exp: any,
  chunkName: StrFun,
  props: Object,
  modCache: Object
) => (modCache[callForString(chunkName, props)] = exp)

export const loadFromPromiseCache = (
  chunkName: StrFun,
  props: Object,
  promisecache: Object
) => promisecache[callForString(chunkName, props)]

export const cacheProm = (
  pr: Promise<*>,
  chunkName: StrFun,
  props: Object,
  promisecache: Object
) => (promisecache[callForString(chunkName, props)] = pr)
