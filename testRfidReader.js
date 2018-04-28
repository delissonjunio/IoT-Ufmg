const AlienRfidReader = require('./alien-rfid-js/reader')

async function runTest () {
  const reader = new AlienRfidReader({
    host: '150.164.10.41',
    port: 23,
    username: 'alien',
    password: 'password',
    listener: {
      host: '150.164.0.242',
      port: 4000
    }
  })

  await reader.connect()
  let tags = await reader.getTagList()
  console.log('got tags: ', tags)
  reader.startTagStream(tags => {
    console.info('got tags: ', tags)
  })

  setTimeout(() => reader.stopAutonomousMode(), 40000)
}

runTest()
