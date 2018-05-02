<template>
  <q-layout>
    <q-page-container>
      <q-page
        padding
        class="row justify-center">
        <div class="col-xs-12 col-sm-8 col-md-6">
          <q-list>
            <q-item>
              <q-item-main>
                <q-item-tile>
                  <div class="text-center full-width">
                    <q-icon
                      name="wifi"
                      size="200pt"
                      color="primary">
                    </q-icon>
                  </div>
                  <div class="text-center full-width text-capitalize">
                    Internet das Coisas - RFID
                  </div>
                </q-item-tile>
              </q-item-main>
            </q-item>
            <q-list-header>Conexão</q-list-header>
            <q-item>
              <q-item-main>
                <q-item-tile>
                  <q-field helper="Padrão: '150.164.10.41'">
                    <q-input
                      @keyup.enter="tryToConnect"
                      v-model="connection.host"
                      float-label="Endereço do leitor">
                    </q-input>
                  </q-field>
                </q-item-tile>
              </q-item-main>
            </q-item>
            <q-item>
              <q-item-main>
                <q-item-tile>
                  <q-field :helper="`Padrão: ${DEFAULT_PORT}`">
                    <q-input
                      @keyup.enter="tryToConnect"
                      v-model="connection.port"
                      float-label="Porta do leitor">
                    </q-input>
                  </q-field>
                </q-item-tile>
              </q-item-main>
            </q-item>

            <q-item-separator />

            <q-list-header>Modo passivo</q-list-header>
            <q-item>
              <q-item-main>
                <q-item-tile>
                  <q-field helper="Padrão: '150.164.0.242'">
                    <q-input
                      @keyup.enter="tryToConnect"
                      v-model="connection.listenerHost"
                      float-label="Endereço da máquina a receber dados autônomos">
                    </q-input>
                  </q-field>
                </q-item-tile>
              </q-item-main>
            </q-item>
            <q-item>
              <q-item-main>
                <q-item-tile>
                  <q-field helper="Padrão: '4000'">
                    <q-input
                      @keyup.enter="tryToConnect"
                      v-model="connection.listenerPort"
                      float-label="Porta para dados autônomos">
                    </q-input>
                  </q-field>
                </q-item-tile>
              </q-item-main>
            </q-item>
            <q-item>
              <q-item-main>
                <q-item-tile>
                  <q-btn
                    @click="tryToConnect"
                    :loading="connection.state === CONNECTION_STATES.CONNECTING"
                    class="full-width"
                    type="submit"
                    color="primary">
                    Conectar
                  </q-btn>
                </q-item-tile>
              </q-item-main>
            </q-item>
          </q-list>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { mapActions } from 'vuex'
const dgram = require('dgram')

const DEFAULT_PORT = 23

const CONNECTION_STATES = {
  IDLE: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  ERROR: 3
}

export default {
  data: () => ({
    CONNECTION_STATES,
    DEFAULT_PORT,
    connection: {
      host: '150.164.10.42',
      port: DEFAULT_PORT + '',
      listenerPort: '4000',
      listenerHost: '150.164.200.99',
      state: CONNECTION_STATES.IDLE
    }
  }),
  mounted: function () {
    this.startAutoDiscovery()
  },
  methods: {
    ...mapActions('connection', [
      'connect'
    ]),

    tryToConnect: async function () {
      this.connection.state = CONNECTION_STATES.CONNECTING
      try {
        await this.connect({
          host: this.connection.host,
          port: this.connection.port,
          listener: {
            host: this.connection.listenerHost,
            port: this.connection.listenerPort
          }
        })
        this.connection.state = CONNECTION_STATES.CONNECTED
      } catch (e) {
        this.connection.state = CONNECTION_STATES.ERROR
      }
    },

    startAutoDiscovery: async function () {
      const server = dgram.createSocket('udp4')

      server.on('message', (msg, rinfo) => {
        debugger
        console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`)
      })

      server.on('listening', () => {
        const address = server.address()
        console.log(`server listening ${address.address}:${address.port}`)
      })

      server.bind(3988, '0.0.0.0')
    }
  },
  watch: {
    'connection.state': function (newState, oldState) {
      if (oldState === CONNECTION_STATES.CONNECTING) {
        if (newState === CONNECTION_STATES.ERROR) {
          this.$q.notify({
            type: 'negative',
            position: 'top',
            message: 'Erro ao tentar conectar ao endereço indicado'
          })
        } else if (newState === CONNECTION_STATES.CONNECTED) {
          this.$router.push(
            {
              name: 'dashboard',
              query: {
                host: this.connection.host,
                port: this.connection.port
              }
            }
          )
        }
      }
    }
  }
}
</script>
