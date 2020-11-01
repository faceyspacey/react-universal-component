// @flow

import React from 'react'
import PropTypes from 'prop-types'
import ReportContext from './context'

type Props = {
  report: Function,
  children: Object
}

export default class ReportChunks extends React.Component<void, Props, *> {
  static propTypes = {
    report: PropTypes.func.isRequired
  }

  constructor(props: Props) {
    super(props)
    this.state = {
      report: props.report
    }
  }

  render() {
    return (
      <ReportContext.Provider value={this.state}>
        {this.props.children}
      </ReportContext.Provider>
    )
  }
}
