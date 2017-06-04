import path from 'path'
import React from 'react'
import { createComponent } from './index'
import universalComponent from '../src'

export const createPath = name => path.join(__dirname, '../__fixtures__', name)

export default isWebpack => {
  const importAsync = createComponent(40, null, new Error('test error'))
  const create = name =>
    universalComponent(importAsync, {
      path: path.join(__dirname, '..', '__fixtures__', name),
      chunkName: name,
      resolve: isWebpack && (() => createPath(name))
    })

  const Loadable1 = create('component')
  const Loadable2 = create('component2')
  const Loadable3 = create('component3')

  return props =>
    <div>
      {props.one ? <Loadable1 /> : null}
      {props.two ? <Loadable2 /> : null}
      {props.three ? <Loadable3 /> : null}
    </div>
}
