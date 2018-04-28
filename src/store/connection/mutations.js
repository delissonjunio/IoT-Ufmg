export const connectionData = (state, { host, port, listenerHost, listenerPort }) => {
  state.host = host
  state.port = port
  state.listenerHost = listenerHost
  state.listenerPort = listenerPort
}
