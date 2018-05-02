const net = require('net')
const Promise = require('bluebird')
const Telnet = require('telnet-client')
const debug = require('debug')('alien-rfid-reader')

// const START_NOTIFICATION_HEADER = '#Alien RFID Reader Auto Notification Message'
// const END_NOTIFICATION_HEADER = '#End of Notification Message'

class AlienRfidReader {
  constructor (options) {
    this.options = options || {}
    this.mainConnection = null
    this.listenerSocket = null
  }

  async disconnect () {
    await this.mainConnection.end()
    this.mainConnection = null
    if (this.listenerSocket) {
      await new Promise(resolve => this.listenerSocket.close(resolve))
      this.listenerSocket = null
    }
  }

  async connect () {
    const host = this.options.host
    const port = this.options.port

    debug(`Connecting to reader at ${host}:${port}`)

    this.mainConnection = new Telnet()
    this.mainConnection.connect({
      host,
      port,
      username: this.options.username,
      password: this.options.password,
      loginPrompt: 'Username>\0',
      irs: '\n',
      passwordPrompt: 'Password>\0',
      shellPrompt: /Alien>(\0)?/,
      debug: true
    })

    return new Promise((resolve, reject) => {
      let fulfilled = false

      this.mainConnection.on('ready', (prompt) => {
        debug(`Connection ready`)

        if (!fulfilled) {
          resolve()
          fulfilled = true
        }
      })

      this.mainConnection.on('timeout', () => {
        debug('Socket timeout!')

        if (!fulfilled) {
          reject(new Error('socket timeout'))
          fulfilled = true
        }
      })

      this.mainConnection.on('close', () => {
        debug('Connection closed')

        if (!fulfilled) {
          reject(new Error('connection closed'))
          fulfilled = true
        }
      })

      this.mainConnection.on('error', (err) => {
        debug('Connection error: ', err)

        if (!fulfilled) {
          reject(new Error('connection error'))
          fulfilled = true
        }
      })
    })
  }

  async getTagList (multiplier) {
    if (multiplier === null || multiplier === undefined) {
      multiplier = 1
    }

    await this.setTagListFormatWithSpeed()
    await this.runCommand('set tagListFormat=Custom')

    let response = await this.runCommand('get taglist ' + multiplier)
    await this.runCommand('set tagListFormat=XML')

    if (response === '(No Tags)') {
      return []
    }

    debug('Got taglist: ', response)

    return response.split('\r\n').map(AlienRfidReader._parseTagLine)
  }

  async setRfPowerLevel (level) {
    await this.runCommand('set rflevel=' + level)
  }

  async setAcquisitionMode (mode) {
    return this.runCommand('set acquireMode=' + mode)
  }

  async setAntennas (antennas) {
    return this.runCommand('set antennaSequence=' + antennas)
  }

  async setTagListFormat (format) {
    return this.runCommand('set tagListCustomFormat=' + format)
  }

  async setTagStreamFormat (format) {
    return this.runCommand('set tagStreamCustomFormat=' + format)
  }

  async resetTagListFormat (format) {
    await this.setTagListFormat('EPC:%i, Disc:%d %t, Last:%D %T, Count:%r, Ant:%a, Proto:%p')
    await this.setTagStreamFormat('EPC:%i, Disc:%d %t, Last:%D %T, Count:%r, Ant:%a, Proto:%p')
  }

  async setTagListFormatWithSpeed () {
    await this.setTagListFormat('EPC:%i, Disc:%d %t, Last:%D %T, Count:%r, Ant:%a, Proto:%p, Speed:%s, RSSI: %m')
    await this.setTagStreamFormat('EPC:%i, Disc:%d %t, Last:%D %T, Count:%r, Ant:%a, Proto:%p, Speed:%s, RSSI: %m')
  }

  static _parseListenerMessage (message, callback) {
    let lines = message.split('\r\n')
    let dataLines = lines.filter(line => line[0] !== '#' && line)

    let tags = []
    for (let line of dataLines) {
      if (line !== '(No Tags)') {
        tags.push(AlienRfidReader._parseTagLine(line))
      }
    }

    if (callback) {
      callback(tags)
    }
  }

  async stopAutonomousMode () {
    await this.runCommand('autoModeReset')
    await this.runCommand('set notifyMode=OFF')

    if (this.listenerSocket) {
      await new Promise(resolve => this.listenerSocket.close(resolve))
      this.listenerSocket = null
    }
  }

  async stopTagStream () {
    await this.runCommand('set tagStreamMode=OFF')
    await this.runCommand('set tagListFormat=XML')
    await this.runCommand('set tagStreamFormat=XML')

    if (this.listenerSocket) {
      await new Promise(resolve => this.listenerSocket.close(resolve))
      this.listenerSocket = null
    }
  }

  async startTagStream (callback) {
    this.listenerSocket = net.createServer(c => {
      debug('Reader connected to listener!')

      c.on('end', () => {
        debug('Reader disconnected from listener!')
      })

      let buffer = ''
      c.on('data', (data) => {
        buffer += data.toString()

        let orsIndex = buffer.indexOf('\r\n')
        if (orsIndex >= 0) {
          let messages = buffer.split('\r\n')
          if (orsIndex === buffer.length - 1 - 1) {
            buffer = ''
          } else {
            buffer = messages[messages.length - 1]
            messages.splice(messages.length - 1, 1)
          }

          AlienRfidReader._parseListenerMessage(messages.join('\r\n').replace('\0', ''), callback)
        }
      })
    })

    this.listenerSocket.listen({
      host: this.options.listener.host,
      port: this.options.listener.port
    })

    debug('Listening on ' + this.options.listener.host + ':' + this.options.listener.port)

    await this.runCommand('set tagListFormat=Custom')
    await this.setTagListFormatWithSpeed()
    await this.runCommand('set tagStreamAddress=' + this.options.listener.host + ':' + this.options.listener.port)
    await this.runCommand('set streamHeader=OFF')
    await this.runCommand('set tagStreamMode=ON')
  }

  async getTimer () {
    let result = await this.runCommand('get timer')
    let lines = result.split('\r\n').filter(l => l[0] !== '#')

    let data = {}
    lines.forEach(line => {
      let fields = line.split('   ')
      fields.forEach(field => {
        let [fieldName, fieldValue] = field.split('=')
        fieldName = fieldName.replace(' ', '_').replace('\t', '_').replace('/', '_').toLowerCase()
        data[fieldName] = fieldValue
      })
    })

    return data
  }

  async startAutonomousMode (callback) {
    await this.runCommand('set autoMode=OFF')
    await this.runCommand('set NotifyMode=OFF')
    await this.setTagListFormat('EPC:%i, Disc:%d %t, Last:%D %T, Count:%r, Ant:%a, Proto:%p, Speed:%s, RSSI: %m')
    await this.runCommand('set acquireMode=Global Scroll')
    await this.runCommand('set AcqG2Cycles=1')
    await this.runCommand('Set AcqG2Count=10')
    await this.runCommand('set AcqG2Q = 0')
    await this.runCommand('set TagListAntennaCombine=OFF')
    await this.runCommand('set RFModulation = HS')
    await this.runCommand('set AntennaSequence=0')
    await this.runCommand('set TagType=16')
    await this.runCommand('clear taglist')
    await this.runCommand('set tagListFormat=Custom')

    while (true) {
      let response = await this.runCommand('get taglist 1')
      if (response !== '(No Tags)') {
        callback(response.split('\r\n').map(AlienRfidReader._parseTagLine))
      }

      // debug('Got taglist: ', response)
    }
  }

  async runCommand (command) {
    debug('Running command: "' + command + '"')
    let response = await this.mainConnection.exec(command)
    return response.replace('\r\n\0\r\n', '')
  }

  static _parseTagLine (line) {
    let data = {}

    let fields = line.split(',')
    for (let field of fields) {
      const [fieldName, ...fieldData] = field.trim().split(':')
      data[fieldName.toLowerCase()] = fieldData.join('')
    }

    data.tag = data.tag || data.epc || data['\0epc']
    return data
  }
}

module.exports = AlienRfidReader
