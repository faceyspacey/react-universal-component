import { createPath } from '../__test-helpers__'

import {
  tryRequire,
  requireById,
  resolveExport,
  findExport
} from '../src/utils'

test('tryRequire: requires module using key export finder + calls onLoad with module', () => {
  const moduleEs6 = createPath('es6')
  const expectedModule = require(moduleEs6)

  // babel
  let mod = tryRequire(moduleEs6)
  expect(mod).toEqual(expectedModule)

  // webpack
  global.__webpack_require__ = path => __webpack_modules__[path]
  global.__webpack_modules__ = {
    [moduleEs6]: expectedModule
  }

  mod = tryRequire(moduleEs6)
  expect(mod).toEqual(expectedModule)

  delete global.__webpack_require__
  delete global.__webpack_modules__

  // module not found
  mod = tryRequire('/foo')
  expect(mod).toEqual(null)
})

test('requireById: requires module for babel or webpack depending on environment', () => {
  const moduleEs6 = createPath('es6')
  const expectedModule = require(moduleEs6)

  // babel
  let mod = requireById(moduleEs6)
  expect(mod).toEqual(expectedModule)

  // webpack
  global.__webpack_require__ = path => __webpack_modules__[path]
  global.__webpack_modules__ = {
    [moduleEs6]: expectedModule
  }

  mod = requireById(moduleEs6)
  expect(mod).toEqual(expectedModule)

  delete global.__webpack_require__
  delete global.__webpack_modules__

  // module not found
  expect(() => requireById('/foo')).toThrow()
})

test('resolveExport: finds export and calls onLoad', () => {
  const onLoad = jest.fn()
  const mod = { foo: 'bar' }
  const props = { baz: 123 }
  const context = {}

  const exp = resolveExport(mod, 'foo', onLoad, undefined, props, context)
  expect(exp).toEqual('bar')

  const info = { isServer: false, isSync: false }
  expect(onLoad).toBeCalledWith(mod, info, props, context)
  // todo: test caching
})

test('findExport: finds export in module via key string, function or returns module if key === null', () => {
  const mod = { foo: 'bar' }

  // key as string
  let exp = findExport(mod, 'foo')
  expect(exp).toEqual('bar')

  // key as function
  exp = findExport(mod, mod => mod.foo)
  expect(exp).toEqual('bar')

  // key as null
  exp = findExport(mod, null)
  expect(exp).toEqual(mod)

  // default: no key
  exp = findExport({ __esModule: true, default: 'baz' })
  expect(exp).toEqual('baz')
})
