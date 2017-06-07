// @noflow
import path from 'path'
import React from 'react'
import renderer from 'react-test-renderer'

import universalComponent from '../src'
import { flushModuleIds, flushChunkNames } from '../server'

import createApp, { createPath } from '../__test-helpers__/createApp'
import {
  normalizePath,
  waitFor,
  Loading,
  Err,
  MyComponent,
  createComponent
} from '../__test-helpers__'

describe('async lifecycle', () => {
  it('loading', async () => {
    const importAsync = createComponent(40, MyComponent)
    const Component = universalComponent(importAsync)

    const component1 = renderer.create(<Component />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // loading

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // loaded

    const component2 = renderer.create(<Component />)

    expect(component2.toJSON()).toMatchSnapshot() // reload
  })

  it('error', async () => {
    const importAsync = createComponent(40, null, new Error('test error'))
    const Component = universalComponent(importAsync)

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // initial

    await waitFor(20)
    expect(component.toJSON()).toMatchSnapshot() // loading

    await waitFor(20)
    expect(component.toJSON()).toMatchSnapshot() // errored
  })

  it('timeout error', async () => {
    const importAsync = createComponent(40, null, new Error('test error'))
    const Component = universalComponent(importAsync, {
      timeout: 10
    })

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // initial

    await waitFor(20)
    expect(component.toJSON()).toMatchSnapshot() // error
  })

  it('component unmounted: setState not called', async () => {
    const importAsync = createComponent(10, MyComponent)
    const Component = universalComponent(importAsync)

    let instance
    const component = renderer.create(<Component ref={i => (instance = i)} />)

    instance.componentWillUnmount()
    await waitFor(20)

    // component will still be in loading state because setState is NOT called
    // since its unmounted. In reality, it won't be rendered anymore.
    expect(component.toJSON()).toMatchSnapshot() /*? component.toJSON() */
  })
})

describe('props: all components receive props', () => {
  it('custom loading component', async () => {
    const importAsync = createComponent(40, MyComponent)
    const Component = universalComponent(importAsync, {
      loading: Loading
    })

    const component1 = renderer.create(<Component prop='foo' />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // loading

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // loaded

    const component2 = renderer.create(<Component prop='bar' />)

    expect(component2.toJSON()).toMatchSnapshot() // reload
  })

  it('custom error component', async () => {
    const importAsync = createComponent(40, null, new Error('test error'))
    const Component = universalComponent(importAsync, {
      error: Err
    })

    const component1 = renderer.create(<Component prop='foo' />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // loading

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // Error!

    const component2 = renderer.create(<Component prop='bar' />)

    expect(component2.toJSON()).toMatchSnapshot() // loading again..
  })

  it('<MyUniversalComponent isLoading /> - also displays loading component', async () => {
    const importAsync = createComponent(40, MyComponent)
    const Component = universalComponent(importAsync)

    const component1 = renderer.create(<Component isLoading />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(50)
    expect(component1.toJSON()).toMatchSnapshot() // loading even though async component is available
  })

  it('<MyUniversalComponent error={new Error} /> - also displays error component', async () => {
    const importAsync = createComponent(40, MyComponent)
    const Component = universalComponent(importAsync, { error: Err })

    const component1 = renderer.create(<Component error={new Error('ah')} />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(50)
    expect(component1.toJSON()).toMatchSnapshot() // error even though async component is available
  })
})

describe('server-side rendering', () => {
  it('es6: default export automatically resolved', async () => {
    const importAsync = createComponent(40, null, new Error('test error'))
    const Component = universalComponent(importAsync, {
      path: path.join(__dirname, '../__fixtures__/component')
    })

    const component = renderer.create(<Component />)

    expect(component.toJSON()).toMatchSnapshot() // serverside
  })

  it('es5: module.exports resolved', async () => {
    const importAsync = createComponent(40, null, new Error('test error'))
    const Component = universalComponent(importAsync, {
      path: path.join(__dirname, '../__fixtures__/component.es5')
    })

    const component = renderer.create(<Component />)

    expect(component.toJSON()).toMatchSnapshot() // serverside
  })
})

describe('other options', () => {
  it('key (string): resolves export to value of key', async () => {
    const importAsync = createComponent(20, { fooKey: MyComponent })
    const Component = universalComponent(importAsync, {
      key: 'fooKey'
    })

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // initial

    await waitFor(5)
    expect(component.toJSON()).toMatchSnapshot() // loading

    await waitFor(30)
    expect(component.toJSON()).toMatchSnapshot() // success
  })

  it('key (function): resolves export to function return', async () => {
    const importAsync = createComponent(20, { fooKey: MyComponent })
    const Component = universalComponent(importAsync, {
      key: module => module.fooKey
    })

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // initial

    await waitFor(5)
    expect(component.toJSON()).toMatchSnapshot() // loading

    await waitFor(20)
    expect(component.toJSON()).toMatchSnapshot() // success
  })

  it('onLoad (async): is called and passed entire module', async () => {
    const onLoad = jest.fn()
    const mod = { __esModule: true, default: MyComponent }
    const importAsync = createComponent(40, mod)
    const Component = universalComponent(importAsync, {
      onLoad,
      key: 'default'
    })

    renderer.create(<Component />)

    await waitFor(50)
    expect(onLoad).toBeCalledWith(mod)
  })

  it('onLoad (sync): is called and passed entire module', async () => {
    const onLoad = jest.fn()
    const importAsync = createComponent(40)
    const Component = universalComponent(importAsync, {
      onLoad,
      key: 'default',
      path: path.join(__dirname, '..', '__fixtures__', 'component')
    })

    renderer.create(<Component />)

    expect(onLoad).toBeCalledWith(require('../__fixtures__/component'))
  })

  it('minDelay: loads for duration of minDelay even if component ready', async () => {
    const importAsync = createComponent(40, MyComponent)
    const Component = universalComponent(importAsync, {
      minDelay: 60
    })

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // initial

    await waitFor(45)
    expect(component.toJSON()).toMatchSnapshot() // still loading

    await waitFor(30)
    expect(component.toJSON()).toMatchSnapshot() // loaded
  })
})

describe('SSR flushing: flushModuleIds() + flushChunkNames()', () => {
  it('babel', async () => {
    const App = createApp()

    flushModuleIds() // insure sets are empty:
    flushChunkNames()

    renderer.create(<App one two three={false} />)
    let paths = flushModuleIds().map(normalizePath)
    let chunkNames = flushChunkNames()

    expect(paths).toEqual(['/component', '/component2'])
    expect(chunkNames).toEqual(['component', 'component2'])

    renderer.create(<App one two={false} three />)
    paths = flushModuleIds().map(normalizePath)
    chunkNames = flushChunkNames()

    expect(paths).toEqual(['/component', '/component3'])
    expect(chunkNames).toEqual(['component', 'component3'])
  })

  it('webpack', async () => {
    global.__webpack_require__ = path => __webpack_modules__[path]

    // modules stored by paths instead of IDs (replicates babel implementation)
    global.__webpack_modules__ = {
      [createPath('component')]: require(createPath('component')),
      [createPath('component2')]: require(createPath('component2')),
      [createPath('component3')]: require(createPath('component3'))
    }

    const App = createApp(true)

    flushModuleIds() // insure sets are empty:
    flushChunkNames()

    renderer.create(<App one two three={false} />)
    let paths = flushModuleIds().map(normalizePath)
    let chunkNames = flushChunkNames()

    expect(paths).toEqual(['/component', '/component2'])
    expect(chunkNames).toEqual(['component', 'component2'])

    renderer.create(<App one two={false} three />)
    paths = flushModuleIds().map(normalizePath)
    chunkNames = flushChunkNames()

    expect(paths).toEqual(['/component', '/component3'])
    expect(chunkNames).toEqual(['component', 'component3'])

    delete global.__webpack_require__
    delete global.__webpack_modules__
  })
})

test('Component.preload: static preload method pre-fetches chunk', async () => {
  const importAsync = createComponent(40, MyComponent)
  const Component = universalComponent(importAsync)

  Component.preload()
  await waitFor(20)

  const component1 = renderer.create(<Component />)

  expect(component1.toJSON()).toMatchSnapshot() // still loading...

  // without the preload, it still would be loading
  await waitFor(20)
  expect(component1.toJSON()).toMatchSnapshot() // success

  const component2 = renderer.create(<Component />)
  expect(component2.toJSON()).toMatchSnapshot() // success
})
