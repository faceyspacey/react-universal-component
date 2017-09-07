// @flow
import React from 'react'

import type { Id, Key, OnLoad, Mod, StrFun, ImportModule } from './flowTypes'

export const isServer = typeof window === 'undefined'
export const isWebpack = () => typeof __webpack_require__ !== 'undefined'
export const babelInterop = (mod: ?Mod) =>
  mod && typeof mod === 'object' && mod.__esModule ? mod.default : mod

export const DefaultLoading = () => <div>Loading...</div>
export const DefaultError = ({ error }: { error: Object }) => (
  <div>Error: {error && error.message}</div>
)

export const tryRequire = (id: Id): ?any => {
  try {
    return requireById(id)
  }
  catch (err) {}

  return null
}

export const requireById = (id: Id): ?any => {
  if (!isWebpack() && typeof id === 'string') {
    return module.require(id)
  }

  return __webpack_require__(id)
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
