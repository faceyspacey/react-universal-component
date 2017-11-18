// @noflow
import path from 'path'
import { createPath, waitFor, normalizePath } from '../__test-helpers__'

import req, {
  flushModuleIds,
  flushChunkNames,
  clearChunks
} from '../src/requireUniversalModule'

const requireModule = (asyncImport, options, props) =>
  req(asyncImport, { ...options, modCache: {}, promCache: {} }, props)

describe('requireSync: tries to require module synchronously on both the server and client', () => {
  it('babel', () => {
    const modulePath = createPath('es6')
    const { requireSync } = requireModule(undefined, { path: modulePath })
    const mod = requireSync()

    const defaultExport = require(modulePath).default
    expect(mod).toEqual(defaultExport)
  })

  it('babel: path option as function', () => {
    const modulePath = createPath('es6')
    const { requireSync } = requireModule(undefined, { path: () => modulePath })
    const mod = requireSync()

    const defaultExport = require(modulePath).default
    expect(mod).toEqual(defaultExport)
  })

  it('webpack', () => {
    global.__webpack_require__ = path => __webpack_modules__[path]
    const modulePath = createPath('es6')

    global.__webpack_modules__ = {
      [modulePath]: require(modulePath)
    }

    const options = { resolve: () => modulePath }
    const { requireSync } = requireModule(undefined, options)
    const mod = requireSync()

    const defaultExport = require(modulePath).default
    expect(mod).toEqual(defaultExport)

    delete global.__webpack_require__
    delete global.__webpack_modules__
  })

  it('webpack: resolve option as string', () => {
    global.__webpack_require__ = path => __webpack_modules__[path]
    const modulePath = createPath('es6.js')

    global.__webpack_modules__ = {
      [modulePath]: require(modulePath)
    }

    const { requireSync } = requireModule(undefined, { resolve: modulePath })
    const mod = requireSync()

    const defaultExport = require(modulePath).default
    expect(mod).toEqual(defaultExport)

    delete global.__webpack_require__
    delete global.__webpack_modules__
  })

  it('webpack: when mod is undefined, requireSync used instead after all chunks evaluated at render time', () => {
    global.__webpack_require__ = path => __webpack_modules__[path]
    const modulePath = createPath('es6')

    // main.js chunk is evaluated, but 0.js comes after
    global.__webpack_modules__ = {}

    const { requireSync } = requireModule(undefined, {
      resolve: () => modulePath
    })
    const mod = requireSync()

    expect(mod).toEqual(undefined)

    // 0.js chunk is evaluated, and now the module exists
    global.__webpack_modules__ = {
      [modulePath]: require(modulePath)
    }

    // requireSync is used, for example, at render time after all chunks are evaluated
    const modAttempt2 = requireSync()
    const defaultExport = require(modulePath).default
    expect(modAttempt2).toEqual(defaultExport)

    delete global.__webpack_require__
    delete global.__webpack_modules__
  })

  it('es5 resolution', () => {
    const { requireSync } = requireModule(undefined, {
      path: path.join(__dirname, '../__fixtures__/es5')
    })
    const mod = requireSync()

    const defaultExport = require('../__fixtures__/es5')
    expect(mod).toEqual(defaultExport)
  })

  it('babel: dynamic require', () => {
    const modulePath = ({ page }) => createPath(page)
    const props = { page: 'es6' }
    const options = { path: modulePath }
    const { requireSync } = requireModule(null, options, props)
    const mod = requireSync(props)

    const defaultExport = require(createPath('es6')).default
    expect(mod).toEqual(defaultExport)
  })

  it('webpack: dynamic require', () => {
    global.__webpack_require__ = path => __webpack_modules__[path]
    const modulePath = ({ page }) => createPath(page)

    global.__webpack_modules__ = {
      [createPath('es6')]: require(createPath('es6'))
    }

    const props = { page: 'es6' }
    const options = { resolve: modulePath }
    const { requireSync } = requireModule(undefined, options, props)
    const mod = requireSync(props)

    const defaultExport = require(createPath('es6')).default
    expect(mod).toEqual(defaultExport)

    delete global.__webpack_require__
    delete global.__webpack_modules__
  })
})

describe('requireAsync: requires module asynchronously on the client, returning a promise', () => {
  it('asyncImport as function: () => import()', async () => {
    const { requireAsync } = requireModule(() => Promise.resolve('hurray'))

    const res = await requireAsync()
    expect(res).toEqual('hurray')
  })

  it('asyncImport as promise: import()', async () => {
    const { requireAsync } = requireModule(Promise.resolve('hurray'))

    const res = await requireAsync()
    expect(res).toEqual('hurray')
  })

  it('asyncImport as function using callback for require.ensure: (props, { resolve }) => resolve(module)', async () => {
    const { requireAsync } = requireModule((props, { resolve }) =>
      resolve('hurray')
    )

    const res = await requireAsync()
    expect(res).toEqual('hurray')
  })

  it('asyncImport as function using callback for require.ensure: (props, { reject }) => reject(error)', async () => {
    const { requireAsync } = requireModule((props, { reject }) =>
      reject(new Error('ah'))
    )

    try {
      await requireAsync()
    }
    catch (error) {
      expect(error.message).toEqual('ah')
    }
  })

  it('asyncImport as function with props: props => import()', async () => {
    const { requireAsync } = requireModule(props => Promise.resolve(props.foo))
    const res = await requireAsync({ foo: 123 })
    expect(res).toEqual(123)
  })

  it('asyncImport as function with props: (props, { resolve }) => cb()', async () => {
    const asyncImport = (props, { resolve }) => resolve(props.foo)
    const { requireAsync } = requireModule(asyncImport)
    const res = await requireAsync({ foo: 123 })
    expect(res).toEqual(123)
  })

  it('return Promise.resolve(mod) if module already synchronously required', async () => {
    const modulePath = createPath('es6')
    const options = { path: modulePath }
    const { requireSync, requireAsync } = requireModule(undefined, options)
    const mod = requireSync()

    expect(mod).toBeDefined()

    const prom = requireAsync()
    expect(prom.then).toBeDefined()

    const modAgain = await requireAsync()
    expect(modAgain).toEqual('hello')
  })

  it('export not found rejects', async () => {
    const { requireAsync } = requireModule(() => Promise.resolve('hurray'), {
      key: 'dog'
    })

    try {
      await requireAsync()
    }
    catch (error) {
      expect(error.message).toEqual('export not found')
    }
  })

  it('rejected promise', async () => {
    const { requireAsync } = requireModule(Promise.reject(new Error('ah')))

    try {
      await requireAsync()
    }
    catch (error) {
      expect(error.message).toEqual('ah')
    }
  })

  it('rejected promise calls onError', async () => {
    const error = new Error('ah')
    const onError = jest.fn()
    const opts = { onError }
    const { requireAsync } = requireModule(Promise.reject(error), opts)

    try {
      await requireAsync()
    }
    catch (error) {
      expect(error.message).toEqual('ah')
    }

    expect(onError).toBeCalledWith(error, { isServer: false })
  })
})

describe('addModule: add moduleId and chunkName for SSR flushing', () => {
  it('babel', () => {
    clearChunks()

    const moduleEs6 = createPath('es6')
    const moduleEs5 = createPath('es5')

    let universal = requireModule(undefined, {
      path: moduleEs6,
      chunkName: 'es6'
    })
    universal.addModule()

    universal = requireModule(undefined, { path: moduleEs5, chunkName: 'es5' })
    universal.addModule()

    const paths = flushModuleIds().map(normalizePath)
    const chunkNames = flushChunkNames()

    expect(paths).toEqual(['/es6', '/es5'])
    expect(chunkNames).toEqual(['es6', 'es5'])
  })

  it('webpack', () => {
    global.__webpack_require__ = path => __webpack_modules__[path]

    const moduleEs6 = createPath('es6')
    const moduleEs5 = createPath('es5')

    // modules stored by paths instead of IDs (replicates babel implementation)
    global.__webpack_modules__ = {
      [moduleEs6]: require(moduleEs6),
      [moduleEs5]: require(moduleEs5)
    }

    clearChunks()

    let universal = requireModule(undefined, {
      resolve: () => moduleEs6,
      chunkName: 'es6'
    })
    universal.addModule()

    universal = requireModule(undefined, {
      resolve: () => moduleEs5,
      chunkName: 'es5'
    })
    universal.addModule()

    const paths = flushModuleIds().map(normalizePath)
    const chunkNames = flushChunkNames()

    expect(paths).toEqual(['/es6', '/es5'])
    expect(chunkNames).toEqual(['es6', 'es5'])

    delete global.__webpack_require__
    delete global.__webpack_modules__
  })
})

describe('other options', () => {
  it('key (string): resolve export to value of key', () => {
    const modulePath = createPath('es6')
    const { requireSync } = requireModule(undefined, {
      path: modulePath,
      key: 'foo'
    })
    const mod = requireSync()

    const defaultExport = require(modulePath).foo
    expect(mod).toEqual(defaultExport)
  })

  it('key (function): resolves export to function return', () => {
    const modulePath = createPath('es6')
    const { requireSync } = requireModule(undefined, {
      path: modulePath,
      key: module => module.foo
    })
    const mod = requireSync()

    const defaultExport = require(modulePath).foo
    expect(mod).toEqual(defaultExport)
  })

  it('key (null): resolves export to be entire module', () => {
    const { requireSync } = requireModule(undefined, {
      path: path.join(__dirname, '../__fixtures__/es6'),
      key: null
    })
    const mod = requireSync()

    const defaultExport = require('../__fixtures__/es6')
    expect(mod).toEqual(defaultExport)
  })

  it('timeout: throws if loading time is longer than timeout', async () => {
    const asyncImport = waitFor(20).then('hurray')
    const { requireAsync } = requireModule(asyncImport, { timeout: 10 })

    try {
      await requireAsync()
    }
    catch (error) {
      expect(error.message).toEqual('timeout exceeded')
    }
  })

  it('onLoad (async): is called and passed entire module', async () => {
    const onLoad = jest.fn()
    const mod = { __esModule: true, default: 'foo' }
    const asyncImport = Promise.resolve(mod)
    const { requireAsync } = requireModule(() => asyncImport, {
      onLoad,
      key: 'default'
    })

    const props = { foo: 'bar' }
    const context = {}
    await requireAsync(props, context)

    const info = { isServer: false, isSync: false }
    expect(onLoad).toBeCalledWith(mod, info, props, context)
    expect(onLoad).not.toBeCalledWith('foo', info, props)
  })

  it('onLoad (sync): is called and passed entire module', async () => {
    const onLoad = jest.fn()
    const mod = { __esModule: true, default: 'foo' }
    const asyncImport = () => {
      throw new Error('ah')
    }

    global.__webpack_modules__ = { id: mod }
    global.__webpack_require__ = id => __webpack_modules__[id]

    const { requireSync } = requireModule(asyncImport, {
      onLoad,
      resolve: () => 'id',
      key: 'default'
    })

    const props = { foo: 'bar' }
    const context = {}
    requireSync(props, context)

    const info = { isServer: false, isSync: true }
    expect(onLoad).toBeCalledWith(mod, info, props, context)
    expect(onLoad).not.toBeCalledWith('foo', info, props)

    delete global.__webpack_require__
    delete global.__webpack_modules__
  })
})
