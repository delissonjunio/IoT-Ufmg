<template>
  <q-layout>
    <q-page-container>
      <q-page padding>
        <q-btn-dropdown v-if="mode !== 'passive'" color="primary" icon="wifi" :split="mode !== 'active'" label="Escanear" :loading="mode === 'active'" @click="switchMode('active')">
          <q-list link>
            <q-item v-close-overlay @click.native="switchMode('active')">
              <q-item-main>
                <q-item-tile label>Ativamente</q-item-tile>
              </q-item-main>
            </q-item>
            <q-item v-close-overlay @click.native="switchMode('passive')">
              <q-item-main>
                <q-item-tile label>Passivamente</q-item-tile>
              </q-item-main>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn v-else color="warning" icon="block" @click="switchMode('')">Parar escaneamento passivo</q-btn>

        <q-btn color="negative" @click="disconnectAndReturnToSetup">Desconectar</q-btn>

        <q-btn v-if="systemLog.fileDestination" flat @click="systemLog.dialogVisible = true">Mostrar log</q-btn>
        <q-btn v-else flat @click="configureSystemLog">Configurar log</q-btn>

        <q-list class="q-mt-md">
          <q-list-header>Configurações</q-list-header>
          <q-item>
            <q-item-side icon="wifi">
              Potência do sinal
            </q-item-side>
            <q-item-main>
              <q-slider :value="configuration.signalStrength"
                          @change="val => { configuration.signalStrength = val }"
                        :min="0" :max="100" label color="grey"></q-slider>
            </q-item-main>
          </q-item>
          <q-item>
            <q-item-side icon="av_timer">
              Tempo de leitura
            </q-item-side>
            <q-item-main>
              <q-slider :value="configuration.readTimeout"
                        @change="val => { configuration.readTimeout = val }"
                        :min="0" :max="100" label color="amber"></q-slider>
            </q-item-main>
          </q-item>
          <q-item-separator></q-item-separator>
          <q-list-header>Estatísticas</q-list-header>
          <q-item>
            <q-item-side>
              Leituras por segundo
            </q-item-side>
            <q-item-main>
              -
            </q-item-main>
          </q-item>
        </q-list>

        <q-table
          class="q-mt-sm"
          :data="tagData.tags"
          :columns="tagData.columns"
          :selected.sync="tagData.selected"
          selection="multiple"
          row-key="name"
          color="secondary"
          title="Tags">
          <template slot="top-selection" slot-scope="props">
            <div class="col" />
            <q-btn color="negative" delete icon="delete" @click="removeSelectedTags">Remover</q-btn>
          </template>
        </q-table>

        <q-modal v-model="systemLog.dialogVisible" :content-css="{padding: '50px', minWidth: '80vw'}">
          <div class="q-display-1 q-mb-md">Log do sistema</div>

          <q-input
            :value="systemLog.content"
            class="system-log"
            disabled
            readonly
            type="textarea">
          </q-input>

          <q-btn class="q-mt-md" color="primary" @click="systemLog.dialogVisible = false" label="Fechar"></q-btn>
        </q-modal>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style>
  .system-log {
    font-family: 'Roboto Mono', monospaced, sans-serif;
  }
</style>

<script>
import _ from 'lodash'
import { remote } from 'electron'
import * as fs from 'fs'
import { mapActions, mapState, mapGetters } from 'vuex'

const SERVER_COMMANDS = {
  ACTIVE_SCAN: () => 'ativo\n',
  START_PASSIVE_SCAN: () => 'passivo\n',
  STOP_PASSIVE_SCAN: () => 'pararpassivo\n',
  CHANGE_SCAN_STRENGHT: (strength) => `potencia ${strength}\n`,
  CHANGE_READ_TIMEOUT: (timeout) => `tempoleitura ${timeout}\n`
}

export default {
  data: () => ({
    mode: '',
    tags: [],
    activeTimeoutId: 0,
    systemLog: {
      dialogVisible: false,
      fileDestination: '',
      content: ''
    },
    communication: {
      buffer: ''
    },
    configuration: {
      signalStrength: 50,
      readTimeout: 10
    },
    tagData: {
      tags: [
        // {
        //   id: '53B688C7-EAD8-41B3-8197-BA1111C09A5D',
        //   discoverTime: 159,
        //   lastSeenAt: new Date() + '',
        //   antenna: 0,
        //   readQty: 5
        // }
      ],
      columns: [
        {
          name: 'id',
          required: true,
          label: 'ID',
          align: 'left',
          field: 'id'
        },
        { name: 'discover_time', label: 'Tempo de descoberta', field: 'discoverTime', sortable: true },
        { name: 'last_seen', label: 'Lido por último em', field: 'lastSeenAt', sortable: true },
        { name: 'antenna', label: 'Antena', field: 'antenna' },
        { name: 'read_qty', label: 'Qtd de leituras', field: 'readQty', sortable: true }
      ],
      selected: []
    }
  }),
  mounted: async function () {
    try {
      await this.refreshConnection()
    } catch (e) {
      this.$q.notify({
        type: 'negative',
        position: 'top',
        message: 'Conexão ao servidor perdida'
      })

      this.$router.replace({name: 'setup'})
      return
    }

    this.socket.write(SERVER_COMMANDS.CHANGE_SCAN_STRENGHT(this.configuration.signalStrength))
    this.socket.write(SERVER_COMMANDS.CHANGE_READ_TIMEOUT(this.configuration.readTimeout))

    this.socket.on('data', (data) => {
      this.communication.buffer += String.fromCharCode.apply(null, data)
      this.parseBuffer()
    })
  },
  computed: {
    ...mapState('connection', [
      'socket'
    ]),

    ...mapGetters('connection', [
      'isConnected',
      'socketExists'
    ])
  },
  methods: {
    ...mapActions('connection', [
      'refreshConnection',
      'disconnect'
    ]),

    configureSystemLog: function () {
      remote.dialog.showSaveDialog(null, {
        filters: [
          {name: 'Arquivos de Log', extensions: ['log']}
        ]
      }, (filename) => {
        if (filename) {
          this.systemLog.fileDestination = filename
          fs.appendFile(filename, this.systemLog.content, 'utf-8')
        }
      })
    },

    addToSystemLog: function (data) {
      data = data.indexOf('\n') >= 0 ? data : data + '\n'
      const line = new Date() + ' ' + data

      if (this.systemLog.fileDestination) {
        fs.appendFile(this.systemLog.fileDestination, line, 'utf-8')
      }

      this.systemLog.content += line
    },

    parseBuffer: function () {
      while (this.communication.buffer.indexOf('\n') >= 0) {
        let messages = this.communication.buffer.split('\n')
        let firstMessage = messages[0]
        let leftoverMessages = messages.slice(1, messages.length)
        this.communication.buffer = leftoverMessages.join('\n')

        this.parseMessage(firstMessage.replace('\r', '').split(' '))
      }
    },

    parseMessage: function (message) {
      if (message[0] === 'tag') {
        let [tag, discoverTime, lastSeen, antenna, readQty] = message.slice(-5)
        if (this.mode === 'active') {
          this.mode = ''
          clearTimeout(this.activeTimeoutId)

          this.addToSystemLog(`Tag ${tag} lida no modo ativo`)
        }

        this.tagData.tags.push({
          id: tag,
          discoverTime,
          lastSeen,
          antenna,
          readQty
        })
      }
    },

    disconnectAndReturnToSetup: async function () {
      await this.disconnect()
      this.$router.replace({name: 'setup'})
    },

    generateRandomTagData: function () {
      return '0.yy m | 1.yy ms | xxxx-xxxx-xxxx-xxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random() * 16 | 0
        let t = Math.round(Math.random() * 9)
        let v = c === 'x' ? r : t
        return v.toString(16).toUpperCase()
      })
    },

    removeSelectedTags: function () {
      this.tagData.tags = this.tagData.tags.filter(tag => {
        return !_.includes(this.tagData.selected, tag)
      })

      this.tagData.selected = []
    },

    switchMode: function (newMode) {
      const previousMode = this.mode
      this.mode = newMode

      if (this.mode === 'passive') {
        this.addToSystemLog(`Entrando no modo passivo`)
        this.socket.write(SERVER_COMMANDS.START_PASSIVE_SCAN())
      } else {
        if (previousMode === 'passive') {
          this.addToSystemLog(`Saindo do modo passivo`)
          this.socket.write(SERVER_COMMANDS.STOP_PASSIVE_SCAN())
        }
      }

      if (this.mode === 'active') {
        this.addToSystemLog(`Entrando no modo ativo`)
        this.socket.write(SERVER_COMMANDS.ACTIVE_SCAN())
        this.activeTimeoutId = setTimeout(() => {
          this.switchMode('')
          this.addToSystemLog(`Saindo do modo ativo: nenhuma tag retornada`)
          this.$q.notify({
            type: 'warning',
            position: 'top',
            message: 'Nenhuma tag recebida do leitor'
          })
        }, this.configuration.readTimeout * 100)
      }
    }
  },
  watch: {
    isConnected: function (val) {
      if (!val && this.socketExists) {
        this.$q.notify({
          type: 'negative',
          position: 'top',
          message: 'Conexão ao servidor perdida'
        })

        this.$router.replace({ name: 'setup' })
      }
    },

    'configuration.signalStrength': function (val) {
      this.socket.write(SERVER_COMMANDS.CHANGE_SCAN_STRENGHT(val))
    },

    'configuration.readTimeout': function (val) {
      this.socket.write(SERVER_COMMANDS.CHANGE_READ_TIMEOUT(val))
    }
  }
}
</script>
