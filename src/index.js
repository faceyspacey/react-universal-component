// @flow
import React from 'react'
import req from 'require-universal-module'

type GenericComponent<Props> = Class<React.Component<{}, Props, mixed>>
type Component<Props> = GenericComponent<Props>
type LoadingCompponent = GenericComponent<{}>
type ErrorComponent = GenericComponent<{}>
type AsyncComponent<Props> =
  | Promise<Component<Props>>
  | (() => Promise<Component<Props>>)
type Key<Props> = string | null | ((module: Object) => Component<Props>)
type OnLoad = (module: Object) => void

type Options<Props> = {
  loading?: LoadingCompponent,
  error?: ErrorComponent,
  minDelay?: number,

  // options for requireAsyncModule:
  resolve?: string | (() => number),
  path?: string,
  chunkName?: string,
  timeout?: number,
  key?: Key<Props>,
  onLoad?: OnLoad
}

type Props = {
  error?: ?any,
  isLoading?: ?boolean
}

const DefaultLoading = () => <div>Loading...</div>
const DefaultError = () => <div>Error!</div>

export default function universalComponent<Props: Props>(
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

  return class Loadable extends React.Component<void, Props, *> {
    _mounted: boolean

    static preload() {
      requireAsync()
    }

    constructor(props: Props) {
      super(props)

      if (!Component) {
        // try one more syncronous require, in case chunk comes after main.js
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

      if (this.state.hasComponent) return
      const time = new Date()

      requireAsync()
        .then((mod: Object) => {
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
        return <Loading {...props} />
      }
      else if (userError) {
        return <Err {...props} error={userError} />
      }
      else if (hasComponent && Component) {
        // primary usage (for async import loading + errors):
        return <Component {...props} />
      }
      else if (error) {
        return <Err {...props} error={error} />
      }

      return <Loading {...props} />
    }
  }
}
