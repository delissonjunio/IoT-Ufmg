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

        <q-btn v-if="isConnected" color="negative" @click="disconnect">Desconectar</q-btn>
        <q-btn v-else color="primary" @click="refreshConnection">Conectar</q-btn>

        <q-btn v-if="systemLog.fileDestination" flat @click="systemLog.dialogVisible = true">Mostrar log</q-btn>
        <q-btn v-else flat @click="configureSystemLog">Configurar log</q-btn>

        <div class="col float-right">
          <q-btn color="negative" flat @click="disconnectAndReturnToSetup">Sair</q-btn>
        </div>

        <q-list class="q-mt-md">
          <q-list-header>Configurações</q-list-header>
          <q-item>
            <q-item-side icon="wifi">
              Potência do sinal
            </q-item-side>
            <q-item-main>
              <q-slider :value="configuration.signalStrength"
                          @change="val => { configuration.signalStrength = val }"
                        :min="170" :max="290" label color="grey"></q-slider>
            </q-item-main>
          </q-item>
          <q-item>
            <q-item-side icon="av_timer">
              Modo de leitura
            </q-item-side>
            <q-item-main>
              <q-btn-toggle
                v-model="configuration.acquisitionMode"
                flat
                toggle-color="primary"
                :options="[
                  {label: 'Inventory (lento, lê todas as tags)', value: 'Inventory'},
                  {label: 'Global Scroll (rápido, máximo 1 tag)', value: 'Global Scroll'}
                ]" />
            </q-item-main>
          </q-item>
          <q-item>
            <q-item-side icon="av_timer">
              Antenas ativas
            </q-item-side>
            <q-item-main>
              <q-option-group
                type="checkbox"
                inline
                v-model="configuration.antennas"
                :options="[
                  { label: '1', value: '0' },
                  { label: '2', value: '1' },
                ]"
              />
            </q-item-main>
          </q-item>
          <q-item-separator></q-item-separator>
          <q-list-header>Estatísticas</q-list-header>
          <q-item>
            <q-item-side>
              Leituras de sucesso
            </q-item-side>
            <q-item-main>
              <template v-if="statistics.successReadsPerSecond">
                {{ statistics.successReadsPerSecond }} / segundo
              </template>
              <template v-else>
                &dash;
              </template>
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
import { mapActions, mapState } from 'vuex'

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
    statistics: {
      successReadsPerSecond: 0
    },
    configuration: {
      signalStrength: 290,
      readTimeout: 3,
      acquisitionMode: 'Inventory',
      antennas: ['0']
    },
    tagData: {
      tags: [],
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
        // { name: 'antenna', label: 'Antena', field: 'antenna' },
        { name: 'rssi', label: 'RSSI', field: 'rssi' },
        { name: 'speed', label: 'Velocidade', field: 'speed' },
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
    }
  },
  computed: {
    ...mapState('connection', [
      'connection'
    ]),

    isConnected: function () {
      return this.connection && this.connection.mainConnection
    }
  },
  methods: {
    ...mapActions('connection', [
      'refreshConnection',
      'disconnect',
      'disconnectAndRemoveData'
    ]),

    configureSystemLog: function () {
      remote.dialog.showSaveDialog(null, {
        filters: [
          {name: 'Arquivos de Log', extensions: ['log']}
        ]
      }, (filename) => {
        if (filename) {
          console.log('log: ' + filename)
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

    gotAutonomousModeTags: function (tags) {
      for (let newTag of tags) {
        let existingTag = this.tagData.tags.find(t => t.id === newTag.tag)
        if (existingTag) {
          existingTag.lastSeenAt = newTag.last
          existingTag.antenna = newTag.ant
          existingTag.readQty += parseInt(newTag.count)
          existingTag.rssi = newTag.rssi
          existingTag.speed = newTag.speed
        } else {
          this.tagData.tags.push({
            id: newTag.tag || '?',
            discoverTime: newTag.disc,
            lastSeenAt: newTag.last,
            antenna: newTag.ant,
            readQty: parseInt(newTag.count),
            rssi: newTag.rssi,
            speed: newTag.speed
          })
        }

        console.info(newTag)
        this.addToSystemLog(`Tag recebida: ${JSON.stringify(newTag)}`)
      }
    },

    disconnectAndReturnToSetup: async function () {
      await this.disconnect()
      this.$router.replace({name: 'setup'})
    },

    removeSelectedTags: function () {
      this.tagData.tags = this.tagData.tags.filter(tag => {
        return !_.includes(this.tagData.selected, tag)
      })

      this.tagData.selected = []
    },

    switchMode: async function (newMode) {
      const previousMode = this.mode
      this.mode = newMode

      if (this.mode === 'passive') {
        this.addToSystemLog(`Entrando no modo passivo`)

        let lastReadTime = new Date().getTime()
        let lastTotal = 0

        this.connection.startTagStream(tags => {
          let currentReadTime = new Date().getTime()
          lastTotal += tags.map(t => parseInt(t.count)).reduce((a, b) => a + b, 0)
          let howLongItTookToReadThese = currentReadTime - lastReadTime
          if (howLongItTookToReadThese > 1000) {
            this.statistics.successReadsPerSecond = Math.round((lastTotal / howLongItTookToReadThese) * 1000)

            lastReadTime = currentReadTime
            lastTotal = 0
          }

          this.gotAutonomousModeTags(tags)
        })
      } else {
        if (previousMode === 'passive') {
          this.addToSystemLog(`Saindo do modo passivo`)
          this.connection.stopTagStream()
        }
      }

      if (this.mode === 'active') {
        this.addToSystemLog(`Entrando no modo ativo`)
        let tags = await this.connection.getTagList()
        let timer = await this.connection.getTimer()

        this.statistics.successReadsPerSecond = timer['reads_sec']
        this.gotAutonomousModeTags(tags)

        this.switchMode('')
        this.addToSystemLog(`Saindo do modo ativo: ${tags.length} tags lidas, com taxa de ${this.statistics.successReadsPerSecond} tags/segundo`)
      }
    }
  },
  watch: {
    'configuration.signalStrength': function (val) {
      if (this.isConnected) {
        this.connection.setRfPowerLevel(val)
      }
    },

    'configuration.acquisitionMode': function (val) {
      if (this.isConnected) {
        this.connection.setAcquisitionMode(val)
      }
    },

    'configuration.antennas': function (val) {
      if (this.isConnected) {
        this.connection.setAntennas(val.join(' '))
      }
    }
  }
}
</script>
