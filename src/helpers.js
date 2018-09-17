import hoist from 'hoist-non-react-statics'
import UniversalComponent from './index'

export const __update = (
  props,
  state,
  isInitialized,
  isMount = false,
  isSync = false,
  isServer = false
) => {
  if (!isInitialized) return state
  if (!state.error) {
    state.error = null
  }
  return __handleAfter(props, state, isMount, isSync, isServer)
}

/* eslint class-methods-use-this: ["error", { "exceptMethods": ["__handleAfter"] }] */
export const __handleAfter = (props, state, isMount, isSync, isServer) => {
  const { mod, error } = state

  if (mod && !error) {
    hoist(UniversalComponent, mod, {
      preload: true,
      preloadWeak: true
    })

    if (props.onAfter) {
      const { onAfter } = props
      const info = { isMount, isSync, isServer }
      onAfter(info, mod)
    }
  }
  else if (error && props.onError) {
    props.onError(error)
  }

  return state
}
