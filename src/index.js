// @flow
import React from 'react'
import req from 'require-universal-module'

type Id = string

type GenericComponent<Props> =
  | Class<React.Component<{}, Props, mixed>>
  | React$Element<any>

type Component<Props> = GenericComponent<Props>
type LoadingCompponent = GenericComponent<{}>
type ErrorComponent = GenericComponent<{}>

type AsyncComponent<Props> =
  | Promise<Component<Props>>
  | (() => Promise<Component<Props>>)
type Key<Props> = string | null | ((module: ?Object) => Component<Props>)
type OnLoad = (module: Object) => void
type OnError = (error: Object) => void
type PathResolve = Id | (() => Id)
type Options<Props> = {
  loading?: LoadingCompponent,
  error?: ErrorComponent,
  minDelay?: number,

  // options for requireAsyncModule:
  resolve?: PathResolve,
  path?: PathResolve,
  chunkName?: string,
  timeout?: number,
  key?: Key<Props>,
  onLoad?: OnLoad,
  onError?: OnError
}

type Props = {
  error?: ?any,
  isLoading?: ?boolean
}

const DefaultLoading = () => <div>Loading...</div>
const DefaultError = () => <div>Error!</div>

const isServer = typeof window === 'undefined'
const DEV = process.env.NODE_ENV === 'development'

export default function universal<Props: Props>(
  component: AsyncComponent<Props>,
  opts: Options<Props> = {}
) {
  const {
    loading: Loading = DefaultLoading,
    error: Err = DefaultError,
    minDelay = 0,
    ...options
  } = opts

  const { requireSync, requireAsync, addModule, mod } = req(component, options)

  let Component = mod // initial syncronous require attempt done for us :)

  return class UniversalComponent extends React.Component<void, Props, *> {
    _mounted: boolean

    static preload(props?: Props) {
      return requireAsync(props).catch(e => {
        if (DEV) console.warn('[react-universal-component] preload failed:', e)
      })
    }

    constructor(props: Props) {
      super(props)

      if (!Component) {
        // try one more syncronous require, in case chunk comes after main.js
        // HMR won't work if you've setup your app this way. `mod` must be
        // assigned to `Component` in the closure for HMR to work.
        Component = requireSync()
      }

      this.state = {
        error: null,
        hasComponent: !!Component
      }
    }

    componentWillMount() {
      this._mounted = true
      addModule() // record the module for SSR flushing :)

      if (this.state.hasComponent || isServer) return
      const time = new Date()

      requireAsync(this.props)
        .then((mod: ?any) => {
          Component = mod // for HMR updates component must be in closure
          const state = { hasComponent: !!Component }

          const timeLapsed = new Date() - time
          if (timeLapsed < minDelay) {
            const extraDelay = minDelay - timeLapsed
            return setTimeout(() => this.update(state), extraDelay)
          }
          this.update(state)
        })
        .catch(error => this.update({ error }))
    }

    componentWillUnmount() {
      this._mounted = false
    }

    update = (state: { error?: any, hasComponent?: boolean }) => {
      if (!this._mounted) return
      this.setState(state)
    }

    render() {
      const { error, hasComponent } = this.state
      const { isLoading, error: userError, ...props } = this.props

      // user-provided props (e.g. for data-fetching loading):
      if (isLoading) {
        return createElement(Loading, props)
      }
      else if (userError) {
        return createElement(Err, { ...props, error: userError })
      }
      else if (hasComponent && Component) {
        // primary usage (for async import loading + errors):
        return createElement(Component, props)
      }
      else if (error) {
        return createElement(Err, { ...props, error })
      }

      return createElement(Loading, props)
    }
  }
}

const createElement = (Component: any, props: Props) =>
  React.isValidElement(Component)
    ? React.cloneElement(Component, props)
    : <Component {...props} />
