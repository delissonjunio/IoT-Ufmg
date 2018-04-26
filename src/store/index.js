import Vue from 'vue'
import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'

import connection from './connection'

Vue.use(Vuex)

const store = new Vuex.Store({
  modules: {
    connection
  },
  plugins: [
    createPersistedState({
      reducer: (state) => {
        return {
          connection: {
            host: state.connection.host,
            port: state.connection.port
          }
        }
      }
    })
  ]
})

export default store
