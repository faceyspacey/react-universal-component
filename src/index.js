// @flow
import React from 'react'
import req from './requireUniversalModule'

import type {
  Config,
  ConfigFunc,
  ComponentOptions,
  RequireAsync,
  Props
} from './flowTypes'

import { DefaultLoading, DefaultError, isServer, createElement } from './utils'

let hasBabelPlugin = false

export const setHasBabelPlugin = () => {
  hasBabelPlugin = true
}

export default function universal<Props: Props>(
  component: Config | ConfigFunc,
  opts: ComponentOptions = {}
) {
  const {
    loading: Loading = DefaultLoading,
    error: Err = DefaultError,
    minDelay = 0,
    testBabelPlugin = false,
    ...options
  } = opts

  const isDynamic = hasBabelPlugin || testBabelPlugin
  options.isDynamic = isDynamic
  options.modCache = {}
  options.promCache = {}

  let Component

  return class UniversalComponent extends React.Component<void, Props, *> {
    _mounted: boolean

    static preload(props: Props) {
      props = props || {}
      const { requireAsync } = req(component, options, props)
      return requireAsync(props)
    }

    constructor(props: Props) {
      super(props)

      const { requireSync } = req(component, options, props)
      Component = requireSync(props)

      this.state = {
        error: null,
        hasComponent: !!Component
      }
    }

    componentWillReceiveProps(nextProps: Props) {
      if (isDynamic) {
        const { requireSync, requireAsync, shouldUpdate } = req(
          component,
          options,
          nextProps,
          this.props
        )

        if (shouldUpdate()) {
          Component = requireSync(nextProps)
          // if !Component, a re-render will happen and show  <Loading />

          if (!Component) {
            return this.requireAsync(requireAsync, nextProps)
          }

          this.update({ hasComponent: !!Component })
        }
      }
    }

    componentWillMount() {
      this._mounted = true
      const { addModule, requireAsync } = req(component, options, this.props)
      addModule(this.props) // record the module for SSR flushing :)

      if (this.state.hasComponent || isServer) return
      this.requireAsync(requireAsync, this.props)
    }

    componentWillUnmount() {
      this._mounted = false
    }

    requireAsync(requireAsync: RequireAsync, props: Props) {
      const time = new Date()

      requireAsync(props)
        .then((exp: ?any) => {
          Component = exp // for HMR updates component must be in closure
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

    update = (state: { error?: any, hasComponent?: boolean }) => {
      if (!this._mounted) return
      if (!state.error) state.error = null
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
