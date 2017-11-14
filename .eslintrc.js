module.exports = {
  parser: 'babel-eslint',
  parserOptions: {
    ecmaFeatures: {
      generators: true,
      experimentalObjectRestSpread: true
    },
    sourceType: 'module',
    allowImportExportEverywhere: false
  },
  plugins: ['flowtype'],
  extends: ['airbnb', 'plugin:flowtype/recommended'],
  settings: {
    flowtype: {
      onlyFilesWithFlowAnnotation: true
    }
  },
  globals: {
    window: true,
    document: true,
    __dirname: true,
    __DEV__: true,
    CONFIG: true,
    process: true,
    jest: true,
    describe: true,
    test: true,
    it: true,
    expect: true,
    beforeEach: true,
    __webpack_require__: true,
    __webpack_modules__: true
  },
  'import/resolver': {
    node: {
      extensions: ['.js', '.css', '.json', '.styl', '.jsx']
    }
  },
  'import/extensions': ['.js'],
  'import/ignore': ['node_modules', 'flow-typed', '\\.(css|styl|svg|json)$'],
  rules: {
    'no-shadow': 0,
    'no-use-before-define': 0,
    'no-param-reassign': 0,
    'react/prop-types': 0,
    'react/no-render-return-value': 0,
    'no-confusing-arrow': 0,
    'no-underscore-dangle': 0,
    'no-plusplus': 0,
    'new-parens': 0,
    'global-require': 0,
    camelcase: 1,
    'prefer-template': 1,
    'react/no-array-index-key': 1,
    'react/jsx-indent': 1,
    'dot-notation': 1,
    'import/no-named-default': 1,
    'no-unused-vars': 1,
    'import/no-unresolved': 1,
    'react/no-multi-comp': 1,
    'flowtype/no-weak-types': 0,
    camelcase: 0,
    'import/no-dynamic-require': 0,
    'consistent-return': 1,
    'no-empty': 1,
    'no-return-assign': 1,
    semi: [2, 'never'],
    'no-console': [2, { allow: ['warn', 'error'] }],
    'flowtype/semi': [2, 'never'],
    'jsx-quotes': [2, 'prefer-single'],
    'react/jsx-filename-extension': [2, { extensions: ['.jsx', '.js'] }],
    'spaced-comment': [2, 'always', { markers: ['?'] }],
    'arrow-parens': [2, 'as-needed', { requireForBlockBody: false }],
    'brace-style': [2, 'stroustrup'],
    'no-unused-expressions': [
      2,
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true
      }
    ],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
        optionalDependencies: true,
        peerDependencies: true
      }
    ],
    'comma-dangle': [
      2,
      {
        arrays: 'never',
        objects: 'never',
        imports: 'never',
        exports: 'never',
        functions: 'never'
      }
    ],
    'max-len': [
      'error',
      {
        code: 80,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreComments: true,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true
      }
    ],
    'import/extensions': ['error', 'never'],
    'react/sort-comp': [
      2,
      {
        order: [
          'propTypes',
          'props',
          'state',
          'defaultProps',
          'contextTypes',
          'childContextTypes',
          'getChildContext',
          'static-methods',
          'lifecycle',
          'everything-else',
          'render'
        ]
      }
    ]
  }
}
