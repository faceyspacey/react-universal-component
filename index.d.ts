declare module 'react-universal-component' {
  import * as React from 'react';

  type ReportChunksProps = {
    report(chunkName: string | undefined): void;
  };

  export class ReportChunks extends React.Component<ReportChunksProps> {}

  type ComponentType<P> =
    | React.ComponentType<P>
    | React.StatelessComponent<P>
    | React.ComponentClass<P>
    | React.Component<P>;

  type Info = {
    /** Whether the component just mounted */
    isMount: boolean;

    /** Whether the imported component is already available from previous usage and required synchronsouly */
    isSync: boolean;

    /**
     * Very rarely will you want to do stuff on the server.
     *
     * _Note: server will always be sync_
     */
    isServer: boolean;
  };

  type UniversalProps = {
    isLoading: boolean;
    error: Error | undefined;

    /**
     * `onBefore`/`onAfter` are callbacks called before and after the wrapped component
     * loads/changes on both `componentWillMount` and `componentWillReceiveProps`.
     * This enables you to display loading indicators elsewhere in the UI.
     */
    onBefore(
      info: Info
    ): void;

    /**
     * `onBefore`/`onAfter` are callbacks called before and after the wrapped component
     * loads/changes on both `componentWillMount` and `componentWillReceiveProps`.
     * This enables you to display loading indicators elsewhere in the UI.
     */
    onAfter(
      info: Info
    ): void;

    /**
     * `onError` is similar to the onError static option, except it operates at the component
     * level. Therefore you can bind to this of the parent component and call
     * `this.setState()` or `this.props.dispatch()`.
     * Again, it's use case is for when you want to show error information elsewhere in the
     * UI besides just the place that the universal component would otherwise render.
     */
    onError(
      error: Error
    ): void;
  };

  type UniversalComponent<P> = React.StatelessComponent<
    P & Partial<UniversalProps>
  > & {
    preload(props?: P): void;
  };

  type Module<P> =
    | {
        default?: P;
        [x: string]: any;
      }
    | {
        exports?: P;
        [x: string]: any;
      };

  type Options<P, C, Export> = Partial<
    {
      /**
       * Lets you specify the export from the module you want to be your component
       * if it's not `default` in ES6 or `module.exports` in ES5.
       * It can be a string corresponding to the export key, or a function that's
       * passed the entire module and returns the export that will become the component.
       */
      key: keyof Export | ((module: Export) => ComponentType<P>);

      /**
       * Allows you to specify a maximum amount of time before the error component
       * is displayed. The default is 15 seconds.
       */
      timeout: number;

      /**
       * `minDelay` is essentially the minimum amount of time the loading component
       * will always show for. It's good for enforcing silky smooth animations, such as
       * during a 500ms sliding transition. It insures the re-render won't happen
       * until the animation is complete. It's often a good idea to set this to something
       * like 300ms even if you don't have a transition, just so the loading spinner
       * shows for an appropriate amount of time without jank.
       */
      minDelay: number;

      /**
       * `alwaysDelay` is a boolean you can set to true (default: `false`) to guarantee the
       * `minDelay` is always used (i.e. even when components cached from previous imports
       * and therefore synchronously and instantly required). This can be useful for
       * guaranteeing animations operate as you want without having to wire up other
       * components to perform the task.
       * _Note: this only applies to the client when
       * your `UniversalComponent` uses dynamic expressions to switch between multiple
       * components._
       *
       * default: `false`
       */
      alwaysDelay: boolean;

      /**
       * When set to `false` allows you to keep showing the current component when the
       * loading component would otherwise show during transitions from one component to
       * the next.
       */
      loadingTransition: boolean;

      /**
       * `ignoreBabelRename` is by default set to false which allows the plugin to attempt
       * and name the dynamically imported chunk (replacing / with -).
       * In more advanced scenarios where more granular control is required over the webpack chunk name,
       * you should set this to true in addition to providing a function to chunkName to control chunk naming.
       */
      ignoreBabelRename: boolean;

      testBabelPlugin: boolean;

      resolve: string | number | ((props: P) => number | string);

      path: string | ((props: P) => string);

      chunkName: string | ((props: P) => string);

      alwaysUpdate: boolean;

      id: string;

      /**
       * A callback called if async imports fail.
       * It does not apply to sync requires.
       */
      onError(
        error: Error,
        options: { isServer: boolean }
      ): void;

      /**
       * A callback function that receives the entire module.
       * It allows you to export and put to use things other than your
       * default component export, like reducers, sagas, etc.
       *
       * `onLoad` is fired directly before the component is rendered so you can setup
       * any reducers/etc it depends on. Unlike the `onAfter` prop, this option to the
       * `universal` HOC is only fired the first time the module is received. Also
       * note: it will fire on the server, so do if (!isServer) if you have to.
       * But also keep in mind you will need to do things like replace reducers on
       * both the server + client for the imported component that uses new reducers
       * to render identically in both places.
       */
      onLoad(
        module: Export,
        options: { isSync: boolean; isServer: boolean }
      ): void;

      /**
       * The component class or function corresponding to your stateless component
       * that displays while the primary import is loading.
       * While testing out this package, you can leave it out as a simple default one is used.
       */
      loading:
        | ((p: P) => JSX.Element | ComponentType<P>)
        | (JSX.Element | ComponentType<P>);

      /**
       * The component that displays if there are any errors that occur during
       * your aynschronous import. While testing out this package,
       * you can leave it out as a simple default one is used.
       */
      error:
        | ((p: P) => JSX.Element | ComponentType<P & { error: Error }>)
        | (JSX.Element | ComponentType<P & { error: Error }>);
    }
  >;

  export default function universal<
    P,
    C extends ComponentType<P> = ComponentType<P>,
    Export extends Module<C> = Module<C>
  >(
    loadSpec:
      | PromiseLike<Export>
      | ((props: P) => PromiseLike<Export>)
      | {
          load(props: P): PromiseLike<Export>;
        },
    options?: Options<P, C, Export>
  ): UniversalComponent<P>;
}
