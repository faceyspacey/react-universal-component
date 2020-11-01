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
  State,
  Props,
  Context
} from './flowTypes'
import ReportContext from './context'

import {
  DefaultLoading,
  DefaultError,
  createDefaultRender,
  isServer
} from './utils'
import { __update } from './helpers'

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
  asyncModule: Config | ConfigFunc,
  opts: ComponentOptions = {}
) {
  const {
    render: userRender,
    loading: Loading = DefaultLoading,
    error: Err = DefaultError,
    minDelay = 0,
    alwaysDelay = false,
    testBabelPlugin = false,
    loadingTransition = true,
    ...options
  } = opts

  const renderFunc = userRender || createDefaultRender(Loading, Err)

  const isDynamic = hasBabelPlugin || testBabelPlugin
  options.isDynamic = isDynamic
  options.usesBabelPlugin = hasBabelPlugin
  options.modCache = {}
  options.promCache = {}

  return class UniversalComponent extends React.Component<void, Props, *> {
    /* eslint-disable react/sort-comp */
    _initialized: boolean
    _asyncOnly: boolean

    state: State
    props: Props
    /* eslint-enable react/sort-comp */

    static contextType = ReportContext

    static preload(props: Props) {
      props = props || {}
      const { requireAsync, requireSync } = req(asyncModule, options, props)
      let mod

      try {
        mod = requireSync(props)
      }
      catch (error) {
        return Promise.reject(error)
      }

      return Promise.resolve()
        .then(() => {
          if (mod) return mod
          return requireAsync(props)
        })
        .then(mod => {
          hoist(UniversalComponent, mod, {
            preload: true,
            preloadWeak: true
          })
          return mod
        })
    }

    static preloadWeak(props: Props) {
      props = props || {}
      const { requireSync } = req(asyncModule, options, props)

      const mod = requireSync(props)
      if (mod) {
        hoist(UniversalComponent, mod, {
          preload: true,
          preloadWeak: true
        })
      }

      return mod
    }

    requireAsyncInner(
      requireAsync: RequireAsync,
      props: Props,
      state: State,
      isMount?: boolean
    ) {
      if (!state.mod && loadingTransition) {
        this.update({ mod: null, props }) // display `loading` during componentWillReceiveProps
      }

      const time = new Date()

      requireAsync(props)
        .then((mod: ?any) => {
          const state = { mod, props }

          const timeLapsed = new Date() - time
          if (timeLapsed < minDelay) {
            const extraDelay = minDelay - timeLapsed
            return setTimeout(() => this.update(state, isMount), extraDelay)
          }

          this.update(state, isMount)
        })
        .catch(error => this.update({ error, props }))
    }

    update = (
      state: State,
      isMount?: boolean = false,
      isSync?: boolean = false,
      isServer?: boolean = false
    ) => {
      if (!this._initialized) return
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
      const { mod, error } = state

      if (mod && !error) {
        hoist(UniversalComponent, mod, {
          preload: true,
          preloadWeak: true
        })

        if (this.props.onAfter) {
          const { onAfter } = this.props
          const info = { isMount, isSync, isServer }
          onAfter(info, mod)
        }
      }
      else if (error && this.props.onError) {
        this.props.onError(error)
      }

      this.setState(state)
    }
    // $FlowFixMe
    init(props) {
      const { addModule, requireSync, requireAsync, asyncOnly } = req(
        asyncModule,
        options,
        props
      )

      let mod

      try {
        mod = requireSync(props)
      }
      catch (error) {
        return __update(props, { error, props }, this._initialized)
      }

      this._asyncOnly = asyncOnly
      const chunkName = addModule(props) // record the module for SSR flushing :)
      if (this.context && this.context.report) {
        this.context.report(chunkName)
      }

      if (mod || isServer) {
        this.handleBefore(true, true, isServer)
        return __update(
          props,
          { asyncOnly, props, mod },
          this._initialized,
          true,
          true,
          isServer
        )
      }

      this.handleBefore(true, false)
      this.requireAsyncInner(
        requireAsync,
        props,
        { props, asyncOnly, mod },
        true
      )
      return { mod, asyncOnly, props }
    }

    constructor(props: Props, context: Context) {
      super(props, context)
      this.state = this.init(this.props)
      // $FlowFixMe
      this.state.error = null
    }

    static getDerivedStateFromProps(nextProps, currentState) {
      const { requireSync, shouldUpdate } = req(
        asyncModule,
        options,
        nextProps,
        currentState.props
      )
      if (isHMR() && shouldUpdate(currentState.props, nextProps)) {
        const mod = requireSync(nextProps)
        return { ...currentState, mod }
      }
      return null
    }

    componentDidMount() {
      this._initialized = true
    }

    componentDidUpdate(prevProps: Props) {
      if (isDynamic || this._asyncOnly) {
        const { requireSync, requireAsync, shouldUpdate } = req(
          asyncModule,
          options,
          this.props,
          prevProps
        )

        if (shouldUpdate(this.props, prevProps)) {
          let mod

          try {
            mod = requireSync(this.props)
          }
          catch (error) {
            return this.update({ error })
          }

          this.handleBefore(false, !!mod)

          if (!mod) {
            return this.requireAsyncInner(requireAsync, this.props, { mod })
          }

          const state = { mod }

          if (alwaysDelay) {
            if (loadingTransition) this.update({ mod: null }) // display `loading` during componentWillReceiveProps
            setTimeout(() => this.update(state, false, true), minDelay)
            return
          }

          this.update(state, false, true)
        }
      }
    }

    componentWillUnmount() {
      this._initialized = false
    }

    render() {
      const { isLoading, error: userError, ...props } = this.props
      const { mod, error } = this.state
      return renderFunc(props, mod, isLoading, userError || error)
    }
  }
}
