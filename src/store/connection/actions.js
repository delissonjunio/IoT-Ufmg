const AlienRfidReader = require('../../../alien-rfid-js/reader')

export const connect = async ({ commit, dispatch, state }, { host, port, listener }) => {
  window.localStorage.setItem('debug', '*')
  window.localStorage.setItem('DEBUG', '*')

  commit('connectionData', {
    port,
    host,
    listenerHost: listener.host,
    listenerPort: listener.port
  })

  try {
    await dispatch('refreshConnection')
  } catch (e) {
    await dispatch('disconnect')

    throw e
  }
}

export const disconnect = async ({ commit, state }) => {
  if (state.connection) {
    await state.connection.disconnect()
    state.connection = null
  }
}

export const disconnectAndRemoveData = async ({ commit, dispatch }) => {
  dispatch('disconnect')
  commit('connectionData', {
    port: '',
    host: '',
    listenerHost: '',
    listenerPort: ''
  })
}

export const refreshConnection = async ({ commit, state }) => {
  if (state.connection) {
    return
  }

  let reader = new AlienRfidReader({
    host: state.host,
    port: state.port,
    username: 'alien',
    password: 'password',
    listener: {
      host: state.listenerHost,
      port: state.listenerPort
    }
  })

  await reader.connect()
  state.connection = reader
}
