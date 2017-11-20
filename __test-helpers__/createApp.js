import path from 'path'
import React from 'react'
import {
  createComponent,
  createBablePluginComponent,
  createDynamicBablePluginComponent
} from './index'
import universal from '../src'

export const createPath = name => path.join(__dirname, '../__fixtures__', name)

export const createApp = isWebpack => {
  const importAsync = createComponent(40)
  const create = name =>
    universal(importAsync, {
      path: createPath(name),
      resolve: isWebpack && createPath(name),
      chunkName: name
    })

  const Component1 = create('component')
  const Component2 = create('component2')
  const Component3 = create('component3')

  return props => (
    <div>
      {props.one ? <Component1 /> : null}
      {props.two ? <Component2 /> : null}
      {props.three ? <Component3 /> : null}
    </div>
  )
}

export const createDynamicApp = isWebpack => {
  const importAsync = createComponent(40)
  const Component = universal(importAsync, {
    path: ({ page }) => createPath(page),
    chunkName: ({ page }) => page,
    resolve: isWebpack && (({ page }) => createPath(page))
  })

  return props => (
    <div>
      {props.one ? <Component page='component' /> : null}
      {props.two ? <Component page='component2' /> : null}
      {props.three ? <Component page='component3' /> : null}
    </div>
  )
}

export const createBablePluginApp = isWebpack => {
  const create = name => {
    const importAsync = createBablePluginComponent(
      40,
      null,
      new Error('test error'),
      createPath(name)
    )
    return universal(importAsync, { testBabelPlugin: true })
  }

  const Component1 = create('component')
  const Component2 = create('component2')
  const Component3 = create('component3')

  return props => (
    <div>
      {props.one ? <Component1 /> : null}
      {props.two ? <Component2 /> : null}
      {props.three ? <Component3 /> : null}
    </div>
  )
}

export const createDynamicBablePluginApp = isWebpack => {
  const create = name => {
    const importAsync = createDynamicBablePluginComponent()
    return universal(importAsync, { testBabelPlugin: true })
  }

  const Component1 = create('component')
  const Component2 = create('component2')
  const Component3 = create('component3')

  return props => (
    <div>
      {props.one ? <Component1 page='component' /> : null}
      {props.two ? <Component2 page='component2' /> : null}
      {props.three ? <Component3 page='component3' /> : null}
    </div>
  )
}
