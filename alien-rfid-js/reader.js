const net = require('net')
const Telnet = require('telnet-client')
const debug = require('debug')('alien-rfid-reader')

const START_NOTIFICATION_HEADER = '#Alien RFID Reader Auto Notification Message'
const END_NOTIFICATION_HEADER = '#End of Notification Message'

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
    await this.mainConnection.connect({
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

    debug(`Connected!`)
  }

  async getTagList (multiplier) {
    if (multiplier === null || multiplier === undefined) {
      multiplier = 1
    }

    await this.runCommand('set tagListFormat=Text')
    let response = await this.runCommand('get taglist ' + multiplier)
    await this.runCommand('set tagListFormat=XML')

    if (response === '(No Tags)') {
      return []
    }

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

    await this.runCommand('set tagListFormat=Text')
    await this.runCommand('set tagStreamAddress=' + this.options.listener.host + ':' + this.options.listener.port)
    await this.runCommand('set streamHeader=OFF')
    await this.runCommand('set tagStreamMode=ON')
    // await this.runCommand('set autoMode=ON')
  }

  async startAutonomousMode (callback) {
    this.listenerSocket = net.createServer(c => {
      debug('Reader connected to listener!')

      c.on('end', () => {
        debug('Reader disconnected from listener!')
      })

      let buffer = ''
      c.on('data', (data) => {
        buffer += data.toString()

        let startNotificationIndex = buffer.indexOf(START_NOTIFICATION_HEADER)
        let endNotificationIndex = buffer.indexOf(END_NOTIFICATION_HEADER)

        if (startNotificationIndex >= 0 && endNotificationIndex >= 0) {
          let messageStartIndex = startNotificationIndex + START_NOTIFICATION_HEADER.length
          let message = buffer.substring(messageStartIndex, endNotificationIndex)
          buffer = buffer.substring(endNotificationIndex + END_NOTIFICATION_HEADER.length)

          AlienRfidReader._parseListenerMessage(message, callback)
        }
      })
    })

    this.listenerSocket.listen({
      host: this.options.listener.host,
      port: this.options.listener.port
    })

    await this.runCommand('set tagListFormat=Text')
    await this.runCommand('set notifyAddress=' + this.options.listener.host + ':' + this.options.listener.port)
    await this.runCommand('set notifyTrigger=TrueFalse')
    await this.runCommand('set notifyMode=ON')
    await this.runCommand('set notifyFormat=Text')
    await this.runCommand('autoModeReset')
    await this.runCommand('set autoStopTimer=1000')
    await this.runCommand('set autoMode=ON')
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
