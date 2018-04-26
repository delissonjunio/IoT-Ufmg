export const connectionData = (state, { host, port }) => {
  state.host = host
  state.port = port
}

export const connectionSocket = (state, socket) => {
  state.socket = socket
}
