export const isConnected = (state) => {
  return state.socket && !state.socket.destroyed
}

export const socketExists = (state) => {
  return state.socket
}
