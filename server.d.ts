declare module 'react-universal-component/server' {
  const clearChunks: () => void;
  const flushChunkNames: () => string[];

  export { clearChunks, flushChunkNames };
}
