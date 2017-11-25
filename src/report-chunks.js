import React from 'react'
import PropTypes from 'prop-types'

export default class ReportChunks extends React.Component {
  static propTypes = {
    report: PropTypes.func.isRequired
  }

  static childContextTypes = {
    report: PropTypes.func.isRequired
  }

  getChildContext() {
    return {
      report: this.props.report
    }
  }

  render() {
    return React.Children.only(this.props.children)
  }
}
