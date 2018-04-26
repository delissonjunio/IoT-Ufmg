import * as net from 'net'

const CONNECTION_TIMEOUT = 5000

export const connect = async ({ commit, dispatch, state }, { host, port }) => {
  commit('connectionData', {
    port,
    host
  })
  commit('connectionSocket', null)

  try {
    await dispatch('refreshConnection')
  } catch (e) {
    commit('connectionData', {
      port: '',
      host: ''
    })
    commit('connectionSocket', null)

    throw e
  }
}

export const disconnect = async ({ commit }) => {
  commit('connectionData', {
    port: '',
    host: ''
  })
  commit('connectionSocket', null)
}

export const refreshConnection = ({ commit, state }) => {
  return new Promise((resolve, reject) => {
    if (!state.socket) {
      let timeoutTimerId

      try {
        let client = net.connect(state.port, state.host, () => {
          clearTimeout(timeoutTimerId)

          commit('connectionData', {
            port: state.port,
            host: state.host
          })
          commit('connectionSocket', client)

          resolve(client)
        })

        client.on('close', (hadError) => {
          console.error('socket closed: ', hadError)
          clearTimeout(timeoutTimerId)

          reject(hadError)
        })

        timeoutTimerId = setTimeout(() => {
          console.error('connect timeout')
          client.destroy()
          reject(CONNECTION_TIMEOUT)
        }, CONNECTION_TIMEOUT)
      } catch (e) {
        console.error(e)
        clearTimeout(timeoutTimerId)
        reject(e)
      }
    } else {
      resolve(state.socket)
    }
  })
}
