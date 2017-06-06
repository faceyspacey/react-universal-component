# React Universal Component

A simplified combination async/sync ("Universal") component inspired by React Loadable and other developments in the React/Webpack world. 

## Thanks

- **React Loadable** and **@thejameskyle** for paving the way and [discovering the path forward](https://medium.com/@thejameskyle/react-loadable-2674c59de178#.6h46yjgwr)
- **Vue** and its creator, **Evan You**, for inspiration for a [cleaner API](https://vuejs.org/v2/guide/components.html#Advanced-Async-Components) and a `timeout` feature
- The Webpack team (and **@simenbrekken** for drawer my attention to) Webpack's latest ["magic comment"](https://vuejs.org/v2/guide/components.html#Advanced-Async-Components) feature which greatly simplifies serving chunks on the server
- **@djeeg** for his idea for the `onLoad` hook for doing things like replacing reducers
- **@richardscarrott** for providing a key element throughout this process: [webpack-hot-server-middleware](webpack-hot-server-middleware) which allows for the best universal HMR experience I've seen/had to date
- **@cletusw** for paving the way in what became [extract-css-chunks-webpack-plugin](https://github.com/faceyspacey/extract-css-chunks-webpack-plugin) via his [HMR support PR to extract-text-webpack-plugin](https://github.com/webpack-contrib/extract-text-webpack-plugin/pull/457)
- **Next.js** for being the first to offer any such feature for complete universal rendering, and for indicating the need for such capabilities in the greater NPM community



## Installation

```yarn add react-universal-component```


## Motivation

To be the be-all-end-all async/sync "Universal" component for React. Just kidding. *Kinda*. In fact, that pursuit may never be over, which is why the core universal-rendering tools have been abstracted/extracted into its own package so you can easily accomplish any custom needs you might have: [require-universal-module](https://github.com/faceyspacey/require-universal-module).

That said, in combination with several other packages and the developments mentioned above, the story has come to a close for universal code-splitting in Reactlandia. See, the code has been cracked for while now for Server Side Rendering and Code-Splitting *individually*. Accomplishing both *simultaneously* has been an impossibility without jumping through major hoops (which few have succeeded at) or using a *framework*, specifically Next.js. This package essentially offers to the greater NPM community a general "front end" to the solution while [Webpack Flush Chunks](https://github.com/faceyspacey/webpack-flush-chunks) solves a general "back end."

***Quick story:*** basically I started on this journey to pick up where React Loadable left off and handle the challenge of serving the chunks corresponding to modules flushed by React Loadable. See, React Loadable only knows what modules were used, but not what chunks, and definitely not the corresponding scripts and stylesheets. And so [Webpack Flush Chunks](https://github.com/faceyspacey/webpack-flush-chunks) was born. Though Webpack's *"magic comment"* feature greatly simplifies pinpointing what chunks were used to render your *universal* component, *Webpack Flush Chunks* jumps through many hoops to determine what chunks to send from the server by triangulating what modules were rendered with the information of your webpack stats. It also must work with both Babel and Webpack servers. It must handle CSS chunks, and it must have first class support for HMR. After investing much time solving these problems--something I didn't really plan--the whole "stack" corresponding to this problem became important to me, and so I dreamt up what the ideal *universal* component should be, learning from all recent developments, and built it :). 

I won't go into much more about all the problems solved by the family of packages necessary to make this happen, so I'll point you to the Medium article where I describe it all

http://medium.com/@faceyspacey/foobar

## Other Packages you will need:

https://github.com/faceyspacey/webpack-flush-chunks

*and if you want stylesheets chunks:*

https://github.com/faceyspacey/extract-css-chunks-webpack-plugin

Study [Webpack Flush Chunks](https://github.com/faceyspacey/webpack-flush-chunks) and its corresponding boilerplates to gain mastery of the webpack configuration you will need to bring this all together. 

## Most Basic Example


*src/App.js:*
```js
import React from 'react'
import universal from 'react-universal-component'

const MyUniversalComponent = universal(() => import('./Foo'), {
  resolve: () => require.resolveWeak('./Foo')
})

export default () =>
  <div>
    <MyUniversalComponent />
  </div>
```

*server/render.js:*
```js
import { flushModuleIds } from 'react-universal-component/server'
import flushChunks from 'webpack-flush-chunks'

export default function serverRender(req, res) => {
  const app = ReactDOMServer.renderToString(<App />)

  // see webpack-flush-chunks for great ways to get `webpackStats`
  const { js, styles } = flushChunks(webpackStats, { 
    moduleIds: flushModuleIds()
  })

  res.send(
    `<!doctype html>
      <html>
        <head>
          ${styles} // will contain stylesheets for: main.css, 0.css, 1.css, etc
        </head>
        <body>
          <div id="root">${app}</div>
          ${js} // will contain scripts for: bootstrap.js, 0.js, 1.js, etc, main.js
        </body>
      </html>`
  )
}
```

## API + Options


```js
universal(asyncComponent, options)
```
- `asyncComponent`: () => import('./Foo)

The first argument can be a function that returns a promise, or a promise itself, or a function that takes a node-style callback, which it can call with the module, as is useful if you are using Webpack's `require.ensure` directly. See [require-universal-module](https://github.com/faceyspacey/require-universal-module), which this package depends on, for advanced usage, such as how to use `require.ensure`.

**The Options:**

All are optional except `resolve` and if you are using Babel on the server, you must also have `path`
- `loading`: LoadingComponent, -- *default: a simple one is provided for you*
- `error`: ErrorComponent, -- *default: a simple one is provided for you*
- `resolve`: `() => require.resolveWeak('./Foo')`
- `path`: `path.join(__dirname, './Example')`
- `key`: `'foo'` || `module => module.foo` -- *default: `default` export in ES6 and `module.exports` in ES5*
- `chunkName`: `'myChunkName'` 
- `timeout`: `15000` -- *default*
- `onLoad`: `module => doSomething(module)
- `minDelay`: `300` -- *default*


**In Depth:**

- `loading` is the component class or function corresponding to your stateless component that displays while the primary import is loading. While testing out this package, you can leave it out as a simple default one is used.

- `error` similarly is the component that displays if there are any errors that occur during your aynschronous import. While testing out this package, you can leave it out as a simple default one is used.

- `resolve` is the most important and perhaps irregular option. It's always a call to Webpack's lesser-known `require.resolveWeak` function, which you must pass the same path you to pass to your `import()` call. All it does is tell Webpack not to include the given module in a dependency in the current chunk, thereby enabling your async call to `import()` to split the component out into a separate chunk *without it also being in the parent chunk*. It will be synchronously called on the server, as well as on the client. If it doesn't successfully return a module on the client, `import()` will be used when the component is actually rendered. See [Webpack Flush Chunks](https://github.com/faceyspacey/webpack-flush-chunks) for how to serve your split chunks.

- `path` is required only if you're using a Babel server. And again, its value must be the same path used in `import()` and `require.resolveWeak`, with the exception that it must be an absolute path. Keep in mind that even if you're using a Babel server, you *still* need to use `require.resolveWeak` for your `resolve` option so initial synchronous client-side renderings work as well.

- `key` lets you specify the export from the module you want to be your component if it's not `default` in ES6 or `module.exports` in ES5. It can be a string corresponding to the export key, or a function that's passed the entire module and returns the export that will become the component.

- `chunkName` is what will be flushed for you via `flushChunkNames()` along with any other universal components as part of server-side rendering. Keep in mind for Webpack to be aware of this, you need to define your `asyncComponent` like this: `import(/* webpackChunkName: 'myChunkName' /* './Foo'). *If you are not using Webpack magic comments, you use `flushModuleIds()` instead*. This is a feature that was introduced just a few weeks ago in Webpack 2.4.1. To learn more about it, checkout: https://webpack.js.org/guides/code-splitting-async/#chunk-names and again see [Webpack Flush Chunks](https://github.com/faceyspacey/webpack-flush-chunks) for server-side chunk flushing.

- `timeout` allows you to specify a maximum amount of time before the `error` component is displayed. The default is 15 seconds.

- `onLoad` is a callback function that receives the *entire* module. It allows you to export and put to use things other than your `default` component export, like reducers, sagas, etc. E.g: `onLoad: module => store.replaceReducer({ ...otherReducers, foo: module.fooReducer })`.

- `minDelay` is essentially the minimum amount of time the loading component will always show for. It's a different take on what *React Loadable* and Vue are doing, where no loading component will show for a given amount of milliseconds to avoid janky flashing between the `loading` component and the async component. What this offers is a controlled solution that is the most responsive. Rather than have a certain amount of milliseconds go by where nothing is shown, the loading component is shown instantly. It puts the control back in your hands for how the lifecycle from *render* to *loading* to *loaded* feels. In addition it solves a common problem I had which is this: I often have pages animate or slide in, while the page that's sliding in has a spinner showing in it. What is sub-optimal in this experience is if the async module loads during that sliding animation, the spinner is replaced with the entire async component and frames are dropped from the sliding animation as React re-renders. It becomes jank. So, say, you have a `500ms` CSS sliding transition, you can set `minDelay` to `500` to perfectly time the re-rendering for immediately after the page slides into place. As for the consequence of not letting your component load as quickly as possible, basically, the previous implementation suffers from the problem it tries to solve anyway: if the loading component starts at `200ms`, and then the async component renders at `230ms`, you still have some flashing jank. In conclusion, it's better just to perfectly time this and have a predictable minimal amount of time the spinner displays.

If you're wondering why things like `import()` and `require.resolveWeak()` must be called as a function, i.e. `() => import()`, there are a few scenarios where you don't have to. We don't have the benefit of whatever Next.js does in their transpilation to bypass this, but if within your own wrapping function or HoC, you may be able to avoid it. Both possibilities are ultimately allowed, though not documented here. Checkout [require-universal-module](https://github.com/faceyspacey/require-universal-module) for how to do this and an explanation of a few more possibilities for these options. Most these options are simply passed to that package.

## Module/Chunk Flushing

You saw this above. Below is an example of both options:
- `flushModuleIds()`
- and `flushChunkNames()`

```js
import { flushModuleIds, flushChunkNames } from 'react-universal-component/server'
import flushChunks from 'webpack-flush-chunks'

export default function serverRender(req, res) => {
  const app = ReactDOMServer.renderToString(<App />)

  const { js, styles } = flushChunks(webpackStats, { 
    moduleIds: flushModuleIds(),      // pick one or the other, not both
    // chunkNames: flushChunkNames(), // requires use of Webpack's magic comments
  })
```

As you can see, their usage is basically identical. Just make sure you're using Webpack's ["magic comment"](https://webpack.js.org/guides/code-splitting-async/#chunk-names) feature if you plan to call `flushChunkNames`. See [Webpack Flush Chunks](https://github.com/faceyspacey/webpack-flush-chunks) for how to put your Webpack configuration together.


## Comparison to Other "Universal" Rendering Solutions
