// @flow
import type {
  Tools,
  ModuleOptions,
  Ids,
  Config,
  ConfigFunc,
  Props,
  Load
} from './flowTypes'

import {
  isWebpack,
  tryRequire,
  resolveExport,
  callForString,
  loadFromCache,
  loadFromPromiseCache,
  cacheProm,
  isServer,
  isTest
} from './utils'

declare var __webpack_require__: Function
declare var __webpack_modules__: Object

export const CHUNK_NAMES = new Set()
export const MODULE_IDS = new Set()

export default function requireUniversalModule<Props: Props>(
  universalConfig: Config | ConfigFunc,
  options: ModuleOptions,
  props: Props,
  prevProps?: Props
): Tools {
  const {
    key,
    timeout = 15000,
    onLoad,
    onError,
    isDynamic,
    modCache,
    promCache,
    usesBabelPlugin,
    debug
  } = options

  const config = getConfig(isDynamic, universalConfig, options, props)
  const { chunkName, path, resolve, load } = config
  const asyncOnly = (!path && !resolve) || typeof chunkName === 'function'

  const requireSync = (props: Object, context: Object): ?any => {
    const debugVars = {
      universalConfig,
      options,
      config,
      props,
      prevProps
    }
    let exp = loadFromCache(chunkName, props, modCache)

    if (!exp && debug) {
      console.warn('[requireSync] Module is not in cache', debugVars)
    }

    if (!exp) {
      let mod

      if (!isWebpack() && path) {
        const modulePath = callForString(path, props) || ''
        mod = tryRequire(modulePath)

        if (!mod && debug) {
          console.warn(
            '[requireSync] tryRequire with modulePath failed',
            { modulePath },
            debugVars
          )
        }
      }
      else if (isWebpack() && resolve) {
        const weakId = callForString(resolve, props)

        if (__webpack_modules__[weakId]) {
          mod = tryRequire(weakId)
        }

        if (!mod && debug) {
          console.warn(
            '[requireSync] tryRequire with weakId failed',
            { weakId },
            debugVars
          )
        }
      }

      if (mod) {
        exp = resolveExport(
          mod,
          key,
          onLoad,
          chunkName,
          props,
          context,
          modCache,
          true
        )

        if (!exp && debug) {
          console.warn('[requireSync] resolveExport failed', debugVars)
        }
      }
    }

    return exp
  }

  const requireAsync = (props: Object, context: Object): Promise<?any> => {
    const debugVars = {
      props,
      context,
      options,
      config
    }
    const exp = loadFromCache(chunkName, props, modCache)
    if (exp) return Promise.resolve(exp)

    const cachedPromise = loadFromPromiseCache(chunkName, props, promCache)
    if (cachedPromise) return cachedPromise

    const prom = new Promise((res, rej) => {
      const reject = error => {
        if (debug) {
          console.warn('[requireAsync] Failed to load module', error, debugVars)
        }

        error = error || new Error('timeout exceeded')
        clearTimeout(timer)
        if (onError) {
          const isServer = typeof window === 'undefined'
          const info = { isServer }
          onError(error, info)
        }
        rej(error)
      }

      // const timer = timeout && setTimeout(reject, timeout)
      const timer = timeout && setTimeout(reject, timeout)

      const resolve = mod => {
        clearTimeout(timer)

        const exp = resolveExport(
          mod,
          key,
          onLoad,
          chunkName,
          props,
          context,
          modCache
        )
        if (exp) return res(exp)

        reject(new Error('export not found'))
      }

      const request = load(props, { resolve, reject })

      // if load doesn't return a promise, it must call resolveImport
      // itself. Most common is the promise implementation below.
      if (!request || typeof request.then !== 'function') return
      request.then(resolve).catch(reject)
    })

    cacheProm(prom, chunkName, props, promCache)
    return prom
  }

  const addModule = (props: Object): ?string => {
    if (isServer || isTest) {
      if (chunkName) {
        let name = callForString(chunkName, props)
        if (usesBabelPlugin) {
          name = name.replace(/\//g, '-')
        }
        if (name) CHUNK_NAMES.add(name)
        if (!isTest) return name // makes tests way smaller to run both kinds
      }

      if (isWebpack()) {
        const weakId = callForString(resolve, props)
        if (weakId) MODULE_IDS.add(weakId)
        return weakId
      }

      if (!isWebpack()) {
        const modulePath = callForString(path, props)
        if (modulePath) MODULE_IDS.add(modulePath)
        return modulePath
      }
    }
  }

  const shouldUpdate = (next, prev): boolean => {
    const cacheKey = callForString(chunkName, next)

    const config = getConfig(isDynamic, universalConfig, options, prev)
    const prevCacheKey = callForString(config.chunkName, prev)

    return cacheKey !== prevCacheKey
  }

  return {
    requireSync,
    requireAsync,
    addModule,
    shouldUpdate,
    asyncOnly
  }
}

export const flushChunkNames = (): Ids => {
  const chunks = Array.from(CHUNK_NAMES)
  CHUNK_NAMES.clear()
  return chunks
}

export const flushModuleIds = (): Ids => {
  const ids = Array.from(MODULE_IDS)
  MODULE_IDS.clear()
  return ids
}

export const clearChunks = (): void => {
  CHUNK_NAMES.clear()
  MODULE_IDS.clear()
}

const getConfig = (
  isDynamic: ?boolean,
  universalConfig: Config | ConfigFunc,
  options: ModuleOptions,
  props: Props
): Config => {
  if (isDynamic) {
    return typeof universalConfig === 'function'
      ? universalConfig(props)
      : universalConfig
  }

  const load: Load =
    typeof universalConfig === 'function'
      ? universalConfig
      : // $FlowIssue
        () => universalConfig

  return {
    file: 'default',
    id: options.id || 'default',
    chunkName: options.chunkName || 'default',
    resolve: options.resolve || '',
    path: options.path || '',
    load
  }
}
