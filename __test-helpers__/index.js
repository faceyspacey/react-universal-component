import path from 'path'
import React from 'react'
import slash from 'slash'

// fake delay so we can test different stages of async loading lifecycle
export const waitFor = ms => new Promise(resolve => setTimeout(resolve, ms))

// normalize the required path so tests pass in all environments
export const normalizePath = path => slash(path.split('__fixtures__')[1])

export const createPath = name => path.join(__dirname, '../__fixtures__', name)

export const Loading = props => <p>Loading... {JSON.stringify(props)}</p>
export const Err = props => <p>Error! {JSON.stringify(props)}</p>
export const MyComponent = props => <p>MyComponent {JSON.stringify(props)}</p>
export const MyComponent2 = props => <p>MyComponent {JSON.stringify(props)}</p>

export const createComponent = (
  delay,
  Component,
  error = new Error('test error')
) => async () => {
  await waitFor(delay)
  if (Component) return Component
  throw error
}

export const createDynamicComponent = (
  delay,
  components,
  error = new Error('test error')
) => async (props, tools) => {
  await waitFor(delay)
  const Component = components[props.page]
  if (Component) return Component
  throw error
}

export const createBablePluginComponent = (
  delay,
  Component,
  error = new Error('test error'),
  name
) => {
  const asyncImport = async () => {
    await waitFor(delay)
    if (Component) return Component
    throw error
  }

  return {
    chunkName: () => name,
    path: () => name,
    resolve: () => name,
    load: () => Promise.all([asyncImport(), 'css']).then(prom => prom[0]),
    id: name,
    file: `${name}.js`
  }
}

export const createDynamicBablePluginComponent = (
  delay,
  components,
  error = new Error('test error')
) => {
  const asyncImport = async page => {
    await waitFor(delay)
    const Component = components[page]
    if (Component) return Component
    throw error
  }

  return ({ page }) => ({
    chunkName: () => page,
    path: () => createPath(page),
    resolve: () => createPath(page),
    load: () => Promise.all([asyncImport(page), 'css']).then(prom => prom[0]),
    id: page,
    file: `${page}.js`
  })
}

export const dynamicBabelNodeComponent = ({ page }) => ({
  chunkName: () => page,
  path: () => createPath(page),
  resolve: () => createPath(page),
  id: page,
  file: `${page}.js`
})

export const createDynamicComponentAndOptions = (
  delay,
  components,
  error = new Error('test error')
) => {
  const asyncImport = async page => {
    await waitFor(delay)
    const Component = components[page]
    if (Component) return Component
    throw error
  }

  const load = ({ page }) =>
    Promise.all([asyncImport(page), 'css']).then(prom => prom[0])

  const options = {
    chunkName: ({ page }) => page,
    path: ({ page }) => createPath(page),
    resolve: ({ page }) => createPath(page)
  }

  return { load, options }
}
