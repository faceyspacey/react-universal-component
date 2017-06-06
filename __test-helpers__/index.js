import React from 'react'

// normalize the required path so tests pass in all environments
export const normalizePath = path => path.split('__fixtures__')[1]

// fake delay so we can test different stages of async loading lifecycle
export const waitFor = ms => new Promise(resolve => setTimeout(resolve, ms))

export const Loading = props => <p>Loading... {JSON.stringify(props)}</p>
export const Err = props => <p>Error! {JSON.stringify(props)}</p>
export const MyComponent = props => <p>MyComponent {JSON.stringify(props)}</p>

export const createComponent = (delay, Component, error?) => async () => {
  await waitFor(delay)

  if (Component) {
    return Component
  }

  throw error
}
