// @flow
import React from 'react'
import PropTypes from 'prop-types'
import hoist from 'hoist-non-react-statics'
import req from './requireUniversalModule'

import type {
  Config,
  ConfigFunc,
  ComponentOptions,
  RequireAsync,
  Props,
  State
} from './flowTypes'

import { DefaultLoading, DefaultError, isServer, createElement } from './utils'

export { CHUNK_NAMES, MODULE_IDS } from './requireUniversalModule'
export { default as ReportChunks } from './report-chunks'

let hasBabelPlugin = false

const isHMR = () =>
  // $FlowIgnore
  module.hot && (module.hot.data || module.hot.status() === 'apply')

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
    alwaysDelay = false,
    testBabelPlugin = false,
    loadingTransition = true,
    ...options
  } = opts

  const isDynamic = hasBabelPlugin || testBabelPlugin
  options.isDynamic = isDynamic
  options.modCache = {}
  options.promCache = {}

  return class UniversalComponent extends React.Component<void, Props, *> {
    /* eslint-disable react/sort-comp */
    _mounted: boolean
    _asyncOnly: boolean
    _component: ?Object

    state: State
    props: Props
    context: Object
    /* eslint-enable react/sort-comp */

    static preload(props: Props, context: Object = {}) {
      props = props || {}
      const { requireAsync, requireSync } = req(component, options, props)
      let Component

      try {
        Component = requireSync(props, context)
      }
      catch (error) {
        return Promise.reject(error)
      }

      if (Component) return Promise.resolve(Component)

      return requireAsync(props, context)
    }

    static contextTypes = {
      store: PropTypes.object,
      report: PropTypes.func
    }

    constructor(props: Props, context: {}) {
      super(props, context)
      this.state = { error: null }
    }

    componentWillMount() {
      this._mounted = true

      const { addModule, requireSync, requireAsync, asyncOnly } = req(
        component,
        options,
        this.props
      )

      let Component

      try {
        Component = requireSync(this.props, this.context)
      }
      catch (error) {
        return this.update({ error })
      }

      this._asyncOnly = asyncOnly
      const chunkName = addModule(this.props) // record the module for SSR flushing :)

      if (this.context.report) {
        this.context.report(chunkName)
      }

      if (Component || isServer) {
        this.handleBefore(true, true, isServer)
        this.update({ Component }, true, true, isServer)
        return
      }

      this.handleBefore(true, false)
      this.requireAsync(requireAsync, this.props, true)
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

        if (shouldUpdate(nextProps, this.props)) {
          let Component

          try {
            Component = requireSync(nextProps, this.context)
          }
          catch (error) {
            return this.update({ error })
          }

          this.handleBefore(false, !!Component)

          if (!Component) {
            return this.requireAsync(requireAsync, nextProps)
          }

          const state = { Component }

          if (alwaysDelay) {
            if (loadingTransition) this.update({ Component: null }) // display `loading` during componentWillReceiveProps
            setTimeout(() => this.update(state, false, true), minDelay)
            return
          }

          this.update(state, false, true)
        }
        else if (isHMR()) {
          const Component = requireSync(nextProps, this.context)
          this.setState({ Component: () => null }) // HMR /w Redux and HOCs can be finicky, so we
          setTimeout(() => this.setState({ Component })) // toggle components to insure updates occur
        }
      }
    }

    requireAsync(requireAsync: RequireAsync, props: Props, isMount?: boolean) {
      if (this.state.Component && loadingTransition) {
        this.update({ Component: null }) // display `loading` during componentWillReceiveProps
      }

      const time = new Date()

      requireAsync(props, this.context)
        .then((Component: ?any) => {
          const state = { Component }

          const timeLapsed = new Date() - time
          if (timeLapsed < minDelay) {
            const extraDelay = minDelay - timeLapsed
            return setTimeout(() => this.update(state, isMount), extraDelay)
          }

          this.update(state, isMount)
        })
        .catch(error => this.update({ error }))
    }

    update = (
      state: State,
      isMount?: boolean = false,
      isSync?: boolean = false,
      isServer?: boolean = false
    ) => {
      if (!this._mounted) return
      if (!state.error) state.error = null
      this.handleAfter(state, isMount, isSync, isServer)
    }

    handleBefore(
      isMount: boolean,
      isSync: boolean,
      isServer?: boolean = false
    ) {
      if (this.props.onBefore) {
        const { onBefore } = this.props
        const info = { isMount, isSync, isServer }
        onBefore(info)
      }
    }

    handleAfter(
      state: State,
      isMount: boolean,
      isSync: boolean,
      isServer: boolean
    ) {
      const { Component, error } = state

      if (Component && !error) {
        hoist(UniversalComponent, Component, { preload: true })

        if (this.props.onAfter) {
          const { onAfter } = this.props
          const info = { isMount, isSync, isServer }
          onAfter(info, Component)
        }
      }
      else if (error && this.props.onError) {
        this.props.onError(error)
      }

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
