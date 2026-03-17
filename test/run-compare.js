const puppeteer = require('puppeteer')
const closeServer = require('./http-server')

const URL = 'http://localhost:8000'

puppeteer
  .launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  .then(async (browser) => {
    const page = await browser.newPage()
    await page.goto(URL, { waitUntil: 'networkidle0' })
    const results = await page.evaluate(() => {
      /* global window:false */
      try {
        if (window.isFinished && window.isFinished()) {
          return window.results
        }
      }
      catch (err) {
        process.stderr.write(`Failed ${err}\n`)
      }
    })
    process.stdout.write('Comparing in Chrome\n')
    process.stdout.write('Comparison Test Results:\n')
    await browser.close()
    if (results) {
      let success = true
      const successes = []
      const failures = []
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.success) {
          successes.push(result.name)
        }
        else {
          failures.push(result.name)
        }
        success = success && result.success
      }
      process.stdout.write(`Success: ${successes.join(', ')}\n`)
      if (failures.length) {
        process.stdout.write(`Failure: ${failures.join(', ')}\n`)
        if (failures.length > 10) {
          process.stderr.write('failures higher than expected\n')
          process.exitCode = 1
        }
      }
    }
    else {
      process.exitCode = 1
    }
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    closeServer()
  })
