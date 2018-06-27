<template>
  <q-layout>
    <q-page-container>
      <q-page
        padding
        class="row justify-center text-center"
        style="width: 100%;">
        <div class="col-12 row-bar-bottom">
          <q-chip class="float-left" :color="connectionStatusToColor">
            <template v-if="connectionStatus === CONNECTION_STATUSES.DISCONNECTED">
              Desconectado
            </template>
            <template v-if="connectionStatus === CONNECTION_STATUSES.CONNECTED">
              Conectando
            </template>
            <template v-if="connectionStatus === CONNECTION_STATUSES.ESTABLISHED">
              Conectado
            </template>
          </q-chip>
          <q-btn @click="floodStatus = FLOOD_STATUSES.SINGLE_SHOT1" v-if="floodStatus === FLOOD_STATUSES.STANDBY" class="float-right q-ml-sm" flat color="primary" label="Enviar flood"></q-btn>
          <q-btn @click="floodStatus = FLOOD_STATUSES.AUTOMATIC" v-if="floodStatus === FLOOD_STATUSES.STANDBY" class="float-right q-ml-sm" flat color="primary" label="Envio automatico"></q-btn>
          <q-btn @click="floodStatus = FLOOD_STATUSES.STANDBY" v-if="floodStatus === FLOOD_STATUSES.AUTOMATIC" class="float-right q-ml-sm" flat color="red" label="Parar envio automatico"></q-btn>
        </div>
        <div class="col-12 row-bar-bottom">
          <q-tree
            :nodes="previousNodes"
            node-key="nodeId"
            :expanded="allNodeIds"
            default-expand-all>
            <div slot="body-node" slot-scope="prop" class="row items-center">
              <q-chip color="secondary">
                Temperatura: {{ prop.node.temperature }} ˚C
              </q-chip>
              <q-chip color="secondary" class="q-ml-sm">
                Luminosidade: {{ prop.node.luminosity }} %
              </q-chip>
            </div>
            <div slot="header-node" slot-scope="prop" class="row items-center">
              <q-chip icon="wifi" color="primary">
                {{ prop.node.nodeId }}
              </q-chip>
            </div>
            <div slot="body-base" slot-scope="prop" class="row items-center">

            </div>
            <div slot="header-base" slot-scope="prop" class="row items-center">
              <q-chip icon="wifi" color="primary">
                BASE
              </q-chip>
            </div>
          </q-tree>
        </div>
      </q-page>
      <q-page v-if="false">
        <rfid-mote :base="true" :nodeId="'BASE'" :children="previousNodes"></rfid-mote>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import RfidMote from '../components/RfidMote'

const WHOLE_SF_MSG_LEN = 36
const ACTIVE_MESSAGE_MARKER = 0x00
const AM_TP2 = 0x00
const HANDLER_ID = 0x00

const BROADCAST_ADDRESS = 0xffff
const BASE_NODE_ADDRESS = 0x0000
const PAYLOAD_LEN = 0x1c

const FLOOD_REQ_TYPE = 0x42
const FLOOD_RESP_TYPE = 0x93

const CONNECTION_STATUSES = {
  DISCONNECTED: 0,
  CONNECTED: 1,
  ESTABLISHED: 2
}

const FLOOD_STATUSES = {
  STANDBY: 0,
  AUTOMATIC: 1,
  SINGLE_SHOT1: 2,
  SINGLE_SHOT2: 3
}

export default {
  components: {RfidMote},
  data: function () {
    return {
      console,
      CONNECTION_STATUSES,
      FLOOD_STATUSES,
      connectionStatus: CONNECTION_STATUSES.DISCONNECTED,
      floodStatus: FLOOD_STATUSES.STANDBY,
      ws: null,
      currentFloodId: 1,
      forceFloodAcceptance: true,
      nodes: [],
      previousNodes: [],
      allNodeIds: []
    }
  },
  mounted () {
    this.ws = new WebSocket('ws://localhost:8000')
    this.ws.binaryType = 'arraybuffer'

    let commBuffer = new Uint8Array(0)

    this.ws.onclose = () => {
      this.connectionStatus = CONNECTION_STATUSES.DISCONNECTED
    }

    this.ws.onerror = () => {
      this.connectionStatus = CONNECTION_STATUSES.DISCONNECTED
    }

    this.ws.onmessage = ev => {
      let data = ev.data
      if (data.byteLength <= 1) {
        return
      }

      let concatBuffer = new Uint8Array(data.byteLength + commBuffer.byteLength) // Buffer.from(Buffer.concat([commBuffer, data]))
      concatBuffer.set(new Uint8Array(commBuffer), 0)
      concatBuffer.set(new Uint8Array(data), commBuffer.byteLength)

      commBuffer = concatBuffer

      while (commBuffer.byteLength >= 28 || commBuffer.byteLength === 2) {
        if (commBuffer[0] === 85 && commBuffer[1] === 32) {
          commBuffer = commBuffer.slice(2)
          this.connectionStatus = CONNECTION_STATUSES.ESTABLISHED
        } else {
          if (commBuffer[0] === 0) {
            let length = commBuffer[5]
            let packet = commBuffer.slice(0, length + 8)
            commBuffer = commBuffer.slice(length + 8)

            this.handleMessageFromSensor(packet)
          } else if (commBuffer[1] === 0) {
            commBuffer = commBuffer.slice(1)
          }
        }
      }
    }

    this.ws.onopen = () => {
      this.connectionStatus = CONNECTION_STATUSES.CONNECTED
      this.ws.send(this.generateHandshakeMessage())

      setInterval(() => {
        if (this.floodStatus === FLOOD_STATUSES.STANDBY) {
          return
        }

        if (this.floodStatus === FLOOD_STATUSES.SINGLE_SHOT2) {
          this.floodStatus = FLOOD_STATUSES.STANDBY
        }

        if (this.floodStatus === FLOOD_STATUSES.SINGLE_SHOT1) {
          this.floodStatus = FLOOD_STATUSES.SINGLE_SHOT2
        }

        let nn = {}

        for (let node of this.nodes) {
          nn[node.nodeId] = node
          node.body = 'node'
          node.header = 'node'
        }

        for (let node of this.nodes) {
          let nodeChildren = this.nodes.filter(n => n.parentId === node.nodeId)
          for (let kj of nodeChildren) {
            nn[node.nodeId].children.push(kj)
          }
        }

        let ppp = Object.values(nn).filter(n => n.parentId === 0)
        let baseNode = {
          nodeId: 0,
          body: 'base',
          header: 'base',
          children: ppp
        }

        this.previousNodes = [baseNode]
        this.allNodeIds = [0, ...this.nodes.map(n => n.nodeId)]
        this.nodes = []

        if (this.floodStatus === FLOOD_STATUSES.SINGLE_SHOT) {
          this.floodStatus = FLOOD_STATUSES.STANDBY
        }

        this.sendFlood()
      }, 750)
    }
  },
  methods: {
    handleMessageFromSensor: function (data) {
      let message = this.decodeFloodMessage(data)
      if (message.dst !== BASE_NODE_ADDRESS) {
        return
      }

      if (message.type === FLOOD_REQ_TYPE) {
        // Got flood request!
      } else if (message.type === FLOOD_RESP_TYPE) {
        // Got flood response!
        this.nodes.push({ nodeId: message.src, ...message, children: [] })
      }
    },

    transformTemperature: function (sensorValue) {
      return Math.round(sensorValue / 515.5 * 24)
    },

    transformLuminosity: function (sensorValue) {
      return Math.round(sensorValue / 1099 * 100)
    },

    decodeFloodMessage: function (data) {
      let view = new DataView(data.buffer, data.byteOffset, data.byteLength)

      return {
        src: view.getUint16(8),
        dst: view.getUint16(10),
        type: view.getUint8(12),
        hops: view.getUint8(14),
        parentId: view.getUint8(16),
        temperature: this.transformTemperature(view.getUint16(17)),
        luminosity: this.transformLuminosity(view.getUint16(19))
      }
    },

    generateHandshakeMessage: function () {
      let buffer = new Uint8Array(2)
      buffer[0] = 0x55
      buffer[1] = 0x20

      return buffer
    },

    sendFlood: function () {
      this.ws.send(this.generateFloodMessage(this.currentFloodId, this.forceFloodAcceptance))
      this.currentFloodId += 1

      if (this.forceFloodAcceptance) {
        this.forceFloodAcceptance = false
      }

      if (this.currentFloodId === 256) {
        this.forceFloodAcceptance = true
      }
    },

    generateFloodMessage: function (floodId, force = false) {
      let buffer = new Uint8Array(37)
      let view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

      view.setUint8(0, WHOLE_SF_MSG_LEN)
      view.setUint8(1, ACTIVE_MESSAGE_MARKER)
      view.setUint16(2, BROADCAST_ADDRESS)
      view.setUint16(4, BASE_NODE_ADDRESS)

      view.setUint8(6, PAYLOAD_LEN)
      view.setUint8(7, AM_TP2)
      view.setUint8(8, HANDLER_ID)

      view.setUint16(9, BASE_NODE_ADDRESS)
      view.setUint16(11, BROADCAST_ADDRESS)

      view.setUint8(13, FLOOD_REQ_TYPE)
      view.setUint8(16, floodId)

      view.setUint16(35, force ? 0xcafe : 0x0000)

      return buffer
    }
  },
  computed: {
    connectionStatusToColor: function () {
      if (this.connectionStatus === CONNECTION_STATUSES.DISCONNECTED) {
        return 'red'
      }

      if (this.connectionStatus === CONNECTION_STATUSES.CONNECTED) {
        return 'yellow'
      }

      if (this.connectionStatus === CONNECTION_STATUSES.ESTABLISHED) {
        return 'primary'
      }
    }
  }
}
</script>

<style>
  .big-icon {
    font-size: 5rem;
  }

  .icon-base {
    color: dodgerblue;
  }

  .row-bar-bottom::before {
    border-bottom: 5px solid #222222;
  }
</style>
