import { isWebpack } from '../utils'

const requireById = id => {
  if (!isWebpack() && typeof id === 'string') {
    return module.require(`${id}`)
  }

  return __webpack_require__(`${id}`)
}

export default requireById
