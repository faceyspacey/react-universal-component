// @flow
import React from 'react'
import PropTypes from 'prop-types'
import hoist from 'hoist-non-react-statics'
import { Context } from 'vm'
import req from './requireUniversalModule'
import type {
  Config,
  ConfigFunc,
  ComponentOptions,
  RequireAsync,
  State,
  Props
} from './flowTypes'

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
    context: Object
    /* eslint-enable react/sort-comp */

    static preload(props: Props, context: Object = {}) {
      props = props || {}
      const { requireAsync, requireSync } = req(asyncModule, options, props)
      let mod

      try {
        mod = requireSync(props, context)
      }
      catch (error) {
        return Promise.reject(error)
      }

      return Promise.resolve()
        .then(() => {
          if (mod) return mod
          return requireAsync(props, context)
        })
        .then(mod => {
          hoist(UniversalComponent, mod, {
            preload: true,
            preloadWeak: true
          })
          return mod
        })
    }

    static preloadWeak(props: Props, context: Object = {}) {
      props = props || {}
      const { requireSync } = req(asyncModule, options, props)

      const mod = requireSync(props, context)
      if (mod) {
        hoist(UniversalComponent, mod, {
          preload: true,
          preloadWeak: true
        })
      }

      return mod
    }

    static contextTypes = {
      store: PropTypes.object,
      report: PropTypes.func
    }

    requireAsyncInner(
      requireAsync: RequireAsync,
      props: Props,
      state: State,
      context: Context,
      isMount?: boolean
    ) {
      if (!state.mod && loadingTransition) {
        this.update({ mod: null, props }) // display `loading` during componentWillReceiveProps
      }

      const time = new Date()

      requireAsync(props, context)
        .then((mod: ?any) => {
          const state = { mod, props, context }

          const timeLapsed = new Date() - time
          if (timeLapsed < minDelay) {
            const extraDelay = minDelay - timeLapsed
            return setTimeout(() => this.update(state, isMount), extraDelay)
          }

          this.update(state, isMount)
        })
        .catch(error => this.update({ error, props, context }))
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
    init(props, context) {
      const { addModule, requireSync, requireAsync, asyncOnly } = req(
        asyncModule,
        options,
        props
      )

      let mod

      try {
        mod = requireSync(props, context)
      }
      catch (error) {
        return __update(props, { error, props, context }, this._initialized)
      }

      this._asyncOnly = asyncOnly
      const chunkName = addModule(props) // record the module for SSR flushing :)

      if (context.report) {
        context.report(chunkName)
      }

      if (mod || isServer) {
        this.handleBefore(true, true, isServer)
        return __update(
          props,
          { asyncOnly, props, mod, context },
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
        { props, asyncOnly, mod, context },
        context,
        true
      )
      return { mod, asyncOnly, context, props }
    }

    constructor(props: Props, context: {}) {
      super(props, context)
      this.state = this.init(this.props, this.context)
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
        const mod = requireSync(nextProps, currentState.context)
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
            mod = requireSync(this.props, this.context)
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
