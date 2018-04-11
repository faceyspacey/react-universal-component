// @noflow
import path from 'path'
import React from 'react'
import renderer from 'react-test-renderer'

import universal from '../src'
import { flushModuleIds, flushChunkNames } from '../src/requireUniversalModule'

import {
  createApp,
  createDynamicApp,
  createPath,
  createBablePluginApp,
  createDynamicBablePluginApp
} from '../__test-helpers__/createApp'

import {
  normalizePath,
  waitFor,
  Loading,
  Err,
  MyComponent,
  MyComponent2,
  createComponent,
  createDynamicComponent,
  createBablePluginComponent,
  createDynamicBablePluginComponent,
  dynamicBabelNodeComponent,
  createDynamicComponentAndOptions
} from '../__test-helpers__'

describe('async lifecycle', () => {
  it('loading', async () => {
    const asyncComponent = createComponent(400, MyComponent)
    const Component = universal(asyncComponent)

    const component1 = renderer.create(<Component />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(200)
    expect(component1.toJSON()).toMatchSnapshot() // loading

    await waitFor(200)
    expect(component1.toJSON()).toMatchSnapshot() // loaded

    const component2 = renderer.create(<Component />)
    expect(component2.toJSON()).toMatchSnapshot() // re-loaded
  })

  it('error', async () => {
    const asyncComponent = createComponent(40, null)
    const Component = universal(asyncComponent)

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // initial

    await waitFor(20)
    expect(component.toJSON()).toMatchSnapshot() // loading

    await waitFor(20)
    expect(component.toJSON()).toMatchSnapshot() // errored
  })

  it('timeout error', async () => {
    const asyncComponent = createComponent(40, null)
    const Component = universal(asyncComponent, {
      timeout: 10
    })

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // initial

    await waitFor(20)

    expect(component.toJSON()).toMatchSnapshot() // error
  })

  it('component unmounted: setState not called', async () => {
    const asyncComponent = createComponent(10, MyComponent)
    const Component = universal(asyncComponent)

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
    const asyncComponent = createComponent(40, MyComponent)
    const Component = universal(asyncComponent, {
      loading: Loading
    })

    const component1 = renderer.create(<Component prop='foo' />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // loading

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // loaded

    const component2 = renderer.create(<Component prop='bar' />)
    expect(component2.toJSON()).toMatchSnapshot() // re-loaded
  })

  it('custom error component', async () => {
    const asyncComponent = createComponent(40, null)
    const Component = universal(asyncComponent, {
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
    const asyncComponent = createComponent(40, MyComponent)
    const Component = universal(asyncComponent)

    const component1 = renderer.create(<Component isLoading />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(50)
    expect(component1.toJSON()).toMatchSnapshot() // loading even though async component is available
  })

  it('<MyUniversalComponent error={new Error} /> - also displays error component', async () => {
    const asyncComponent = createComponent(40, MyComponent)
    const Component = universal(asyncComponent, { error: Err })

    const component1 = renderer.create(<Component error={new Error('ah')} />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(50)
    expect(component1.toJSON()).toMatchSnapshot() // error even though async component is available
  })

  it('components passed as elements: loading', async () => {
    const asyncComponent = createComponent(40, <MyComponent />)
    const Component = universal(asyncComponent, {
      loading: <Loading />
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

  it('components passed as elements: error', async () => {
    const asyncComponent = createComponent(40, null)
    const Component = universal(asyncComponent, {
      error: <Err />
    })

    const component1 = renderer.create(<Component prop='foo' />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // loading

    await waitFor(20)
    expect(component1.toJSON()).toMatchSnapshot() // Error!

    const component2 = renderer.create(<Component prop='bar' />)
    expect(component2.toJSON()).toMatchSnapshot() // loading again...
  })

  it('arguments/props passed to asyncComponent function for data-fetching', async () => {
    const asyncComponent = async (props, cb) => {
      // this is what you would actually be doing here:
      // const data = await fetch(`/path?key=${props.prop}`)
      // const value = await data.json()

      const value = props.prop
      const component = await Promise.resolve(<div>{value}</div>)
      return component
    }
    const Component = universal(asyncComponent, {
      key: null
    })

    const component1 = renderer.create(<Component prop='foo' />)
    expect(component1.toJSON()).toMatchSnapshot() // initial

    await waitFor(10)
    expect(component1.toJSON()).toMatchSnapshot() // loaded
  })
})

describe('server-side rendering', () => {
  it('es6: default export automatically resolved', async () => {
    const asyncComponent = createComponent(40, null)
    const Component = universal(asyncComponent, {
      path: path.join(__dirname, '../__fixtures__/component')
    })

    const component = renderer.create(<Component />)

    expect(component.toJSON()).toMatchSnapshot() // serverside
  })

  it('es5: module.exports resolved', async () => {
    const asyncComponent = createComponent(40, null)
    const Component = universal(asyncComponent, {
      path: path.join(__dirname, '../__fixtures__/component.es5')
    })

    const component = renderer.create(<Component />)

    expect(component.toJSON()).toMatchSnapshot() // serverside
  })
})

describe('other options', () => {
  it('key (string): resolves export to value of key', async () => {
    const asyncComponent = createComponent(20, { fooKey: MyComponent })
    const Component = universal(asyncComponent, {
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
    const asyncComponent = createComponent(20, { fooKey: MyComponent })
    const Component = universal(asyncComponent, {
      key: module => module.fooKey
    })

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // initial

    await waitFor(5)
    expect(component.toJSON()).toMatchSnapshot() // loading

    await waitFor(20)
    expect(component.toJSON()).toMatchSnapshot() // success
  })

  it('onLoad (async): is called and passed an es6 module', async () => {
    const onLoad = jest.fn()
    const mod = { __esModule: true, default: MyComponent }
    const asyncComponent = createComponent(40, mod)
    const Component = universal(asyncComponent, { onLoad })

    const component = renderer.create(<Component foo='bar' />)

    await waitFor(50)
    const info = { isServer: false, isSync: false }
    const props = { foo: 'bar' }
    const context = {}
    expect(onLoad).toBeCalledWith(mod, info, props, context)

    expect(component.toJSON()).toMatchSnapshot() // success
  })

  it('onLoad (async): is called and passed entire module', async () => {
    const onLoad = jest.fn()
    const mod = { __esModule: true, foo: MyComponent }
    const asyncComponent = createComponent(40, mod)
    const Component = universal(asyncComponent, {
      onLoad,
      key: 'foo'
    })

    const component = renderer.create(<Component />)

    await waitFor(50)
    const info = { isServer: false, isSync: false }
    const context = {}
    expect(onLoad).toBeCalledWith(mod, info, {}, context)

    expect(component.toJSON()).toMatchSnapshot() // success
  })

  it('onLoad (sync): is called and passed entire module', async () => {
    const onLoad = jest.fn()
    const asyncComponent = createComponent(40)
    const Component = universal(asyncComponent, {
      onLoad,
      key: 'default',
      path: path.join(__dirname, '..', '__fixtures__', 'component')
    })

    renderer.create(<Component />)

    expect(onLoad).toBeCalledWith(
      require('../__fixtures__/component'),
      {
        isServer: false,
        isSync: true
      },
      {},
      {}
    )
  })

  it('minDelay: loads for duration of minDelay even if component ready', async () => {
    const asyncComponent = createComponent(40, MyComponent)
    const Component = universal(asyncComponent, {
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

  it('babel (babel-plugin)', async () => {
    const App = createBablePluginApp()

    flushModuleIds() // insure sets are empty:
    flushChunkNames()

    renderer.create(<App one two three={false} />)
    let paths = flushModuleIds().map(normalizePath)
    let chunkNames = flushChunkNames().map(normalizePath)

    expect(paths).toEqual(['/component', '/component2'])
    expect(chunkNames).toEqual(['/component', '/component2'])

    renderer.create(<App one two={false} three />)
    paths = flushModuleIds().map(normalizePath)
    chunkNames = flushChunkNames().map(normalizePath)

    expect(paths).toEqual(['/component', '/component3'])
    expect(chunkNames).toEqual(['/component', '/component3'])
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

  it('webpack (babel-plugin)', async () => {
    global.__webpack_require__ = path => __webpack_modules__[path]

    // modules stored by paths instead of IDs (replicates babel implementation)
    global.__webpack_modules__ = {
      [createPath('component')]: require(createPath('component')),
      [createPath('component2')]: require(createPath('component2')),
      [createPath('component3')]: require(createPath('component3'))
    }

    const App = createBablePluginApp(true)

    flushModuleIds() // insure sets are empty:
    flushChunkNames()

    renderer.create(<App one two three={false} />)
    let paths = flushModuleIds().map(normalizePath)
    let chunkNames = flushChunkNames().map(normalizePath)

    expect(paths).toEqual(['/component', '/component2'])
    expect(chunkNames).toEqual(['/component', '/component2'])

    renderer.create(<App one two={false} three />)
    paths = flushModuleIds().map(normalizePath)
    chunkNames = flushChunkNames().map(normalizePath)

    expect(paths).toEqual(['/component', '/component3'])
    expect(chunkNames).toEqual(['/component', '/component3'])

    delete global.__webpack_require__
    delete global.__webpack_modules__
  })

  it('babel: dynamic require', async () => {
    const App = createDynamicApp()

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

  it('webpack: dynamic require', async () => {
    global.__webpack_require__ = path => __webpack_modules__[path]

    // modules stored by paths instead of IDs (replicates babel implementation)
    global.__webpack_modules__ = {
      [createPath('component')]: require(createPath('component')),
      [createPath('component2')]: require(createPath('component2')),
      [createPath('component3')]: require(createPath('component3'))
    }

    const App = createDynamicApp(true)

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

  it('babel: dynamic require (babel-plugin)', async () => {
    const App = createDynamicBablePluginApp()

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

  it('webpack: dynamic require (babel-plugin)', async () => {
    global.__webpack_require__ = path => __webpack_modules__[path]

    // modules stored by paths instead of IDs (replicates babel implementation)
    global.__webpack_modules__ = {
      [createPath('component')]: require(createPath('component')),
      [createPath('component2')]: require(createPath('component2')),
      [createPath('component3')]: require(createPath('component3'))
    }

    const App = createDynamicBablePluginApp(true)

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

describe('advanced', () => {
  it('dynamic requires (async)', async () => {
    const components = { MyComponent }
    const asyncComponent = createDynamicComponent(0, components)
    const Component = universal(asyncComponent)

    const component = renderer.create(<Component page='MyComponent' />)
    await waitFor(5)

    expect(component.toJSON()).toMatchSnapshot() // success
  })

  it('Component.preload: static preload method pre-fetches chunk', async () => {
    const components = { MyComponent }
    const asyncComponent = createDynamicComponent(40, components)
    const Component = universal(asyncComponent)

    Component.preload({ page: 'MyComponent' })
    await waitFor(20)

    const component1 = renderer.create(<Component />)

    expect(component1.toJSON()).toMatchSnapshot() // still loading...

    // without the preload, it still would be loading
    await waitFor(22)
    expect(component1.toJSON()).toMatchSnapshot() // success

    const component2 = renderer.create(<Component />)
    expect(component2.toJSON()).toMatchSnapshot() // success
  })

  it('Component.preload: static preload method hoists non-react statics', async () => {
    // define a simple component with static properties
    const FooComponent = props => (
      <div>FooComponent {JSON.stringify(props)}</div>
    )
    FooComponent.propTypes = {}
    FooComponent.nonReactStatic = { foo: 'bar' }
    // prepare that component to be universally loaded
    const components = { FooComponent }
    const asyncComponent = createDynamicComponent(40, components)
    const Component = universal(asyncComponent)
    // wait for preload to finish
    await Component.preload({ page: 'FooComponent' })
    // assert desired static is available
    expect(Component).not.toHaveProperty('propTypes')
    expect(Component).toHaveProperty('nonReactStatic')
    expect(Component.nonReactStatic).toBe(FooComponent.nonReactStatic)
  })

  it('Component.preload: static preload method on node', async () => {
    const onLoad = jest.fn()
    const onErr = jest.fn()
    const opts = { testBabelPlugin: true }

    const Component = universal(dynamicBabelNodeComponent, opts)
    await Component.preload({ page: 'component' }).then(onLoad, onErr)

    expect(onErr).not.toHaveBeenCalled()

    const targetComponent = require(createPath('component')).default
    expect(onLoad).toBeCalledWith(targetComponent)
  })

  it('promise passed directly', async () => {
    const asyncComponent = createComponent(0, MyComponent, new Error('ah'))

    const options = {
      chunkName: ({ page }) => page,
      error: ({ message }) => <div>{message}</div>
    }

    const Component = universal(asyncComponent(), options)

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // loading...

    await waitFor(2)
    expect(component.toJSON()).toMatchSnapshot() // loaded
  })

  it('babel-plugin', async () => {
    const asyncComponent = createBablePluginComponent(
      0,
      MyComponent,
      new Error('ah'),
      'MyComponent'
    )
    const options = {
      testBabelPlugin: true,
      chunkName: ({ page }) => page
    }

    const Component = universal(asyncComponent, options)

    const component = renderer.create(<Component />)
    expect(component.toJSON()).toMatchSnapshot() // loading...

    await waitFor(2)
    expect(component.toJSON()).toMatchSnapshot() // loaded
  })

  it('componentWillReceiveProps: changes component (dynamic require)', async () => {
    const components = { MyComponent, MyComponent2 }
    const asyncComponent = createDynamicBablePluginComponent(0, components)
    const options = {
      testBabelPlugin: true,
      chunkName: ({ page }) => page
    }

    const Component = universal(asyncComponent, options)

    class Container extends React.Component {
      render() {
        const page = (this.state && this.state.page) || 'MyComponent'
        return <Component page={page} />
      }
    }

    let instance
    const component = renderer.create(<Container ref={i => (instance = i)} />)
    expect(component.toJSON()).toMatchSnapshot() // loading...

    await waitFor(2)
    expect(component.toJSON()).toMatchSnapshot() // loaded

    instance.setState({ page: 'MyComponent2' })

    expect(component.toJSON()).toMatchSnapshot() // loading...
    await waitFor(2)

    expect(component.toJSON()).toMatchSnapshot() // loaded
  })

  it('componentWillReceiveProps: changes component (dynamic require) (no babel plugin)', async () => {
    const components = { MyComponent, MyComponent2 }
    const { load, options } = createDynamicComponentAndOptions(0, components)

    const Component = universal(load, options)

    class Container extends React.Component {
      render() {
        const page = (this.state && this.state.page) || 'MyComponent'
        return <Component page={page} />
      }
    }

    let instance
    const component = renderer.create(<Container ref={i => (instance = i)} />)
    expect(component.toJSON()).toMatchSnapshot() // loading...

    await waitFor(2)
    expect(component.toJSON()).toMatchSnapshot() // loaded

    instance.setState({ page: 'MyComponent2' })

    expect(component.toJSON()).toMatchSnapshot() // loading...
    await waitFor(2)

    expect(component.toJSON()).toMatchSnapshot() // loaded
  })
})
