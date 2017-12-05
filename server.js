module.exports = {
  flushModuleIds: require('./dist/requireUniversalModule').flushModuleIds,
  flushChunkNames: require('./dist/requireUniversalModule').flushChunkNames,
  clearChunks: require('./dist/requireUniversalModule').clearChunks,
  ReportChunks: require('./dist/report-chunks').default
}
