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

// $FlowIgnore
const isHMR = () => module.hot && module.hot.data

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

  return class UniversalComponent extends React.Component<void, Props, *> {
    _mounted: boolean
    _asyncOnly: boolean

    static preload(props: Props) {
      props = props || {}
      const { requireAsync } = req(component, options, props)
      return requireAsync(props)
    }

    constructor(props: Props) {
      super(props)

      const { requireSync, asyncOnly } = req(component, options, props)
      this._asyncOnly = asyncOnly

      this.state = {
        error: null,
        Component: requireSync(props)
      }
    }

    componentWillMount() {
      this._mounted = true
      const { addModule, requireAsync } = req(component, options, this.props)
      addModule(this.props) // record the module for SSR flushing :)

      if (this.state.Component || isServer) return
      this.requireAsync(requireAsync, this.props)
    }

    componentWillUnmount() {
      this._mounted = false
    }

    componentWillReceiveProps(nextProps: Props) {
      if (isDynamic || this._asyncOnly) {
        const { requireSync, requireAsync, shouldUpdate } = req(
          component,
          options,
          nextProps,
          this.props
        )

        if (shouldUpdate(nextProps, this.props) || isHMR()) {
          const Component = requireSync(nextProps)

          if (!Component) {
            return this.requireAsync(requireAsync, nextProps)
          }

          this.update({ Component })
        }
      }
    }

    requireAsync(requireAsync: RequireAsync, props: Props) {
      // insure `loading` displays even when the component
      // changes during componentWillReceiveProps
      if (this.state.Component) {
        this.update({ Component: null })
      }

      const time = new Date()

      requireAsync(props)
        .then((Component: ?any) => {
          const state = { Component }

          const timeLapsed = new Date() - time
          if (timeLapsed < minDelay) {
            const extraDelay = minDelay - timeLapsed
            return setTimeout(() => this.update(state), extraDelay)
          }
          this.update(state)
        })
        .catch(error => this.update({ error }))
    }

    update = (state: { error?: any, Component?: ?any }) => {
      if (!this._mounted) return
      if (!state.error) state.error = null
      this.setState(state)
    }

    render() {
      const { error, Component } = this.state
      const { isLoading, error: userError, ...props } = this.props

      // user-provided props (e.g. for data-fetching loading):
      if (isLoading) {
        return createElement(Loading, props)
      }
      else if (userError) {
        return createElement(Err, { ...props, error: userError })
      }
      else if (Component) {
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
