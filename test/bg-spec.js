#!/usr/bin/env node

const fs = require('node:fs')
const PNG = require('../lib/png').PNG
const bufferEqual = require('buffer-equal')
const test = require('tape')

test('outputs background, created from scratch', (t) => {
  t.timeoutAfter(1000 * 60 * 5)

  const png = new PNG({
    width: 10,
    height: 10,
    filterType: -1,
  })

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2

      const col = (x < png.width >> 1) ^ (y < png.height >> 1) ? 0xE5 : 0xFF

      png.data[idx] = col
      png.data[idx + 1] = col
      png.data[idx + 2] = col
      png.data[idx + 3] = 0xFF
    }
  }

  png
    .pack()
    .pipe(fs.createWriteStream(`${__dirname}/bg.png`))
    .on('finish', () => {
      const out = fs.readFileSync(`${__dirname}/bg.png`)
      const ref = fs.readFileSync(`${__dirname}/bg-ref.png`)

      const isBufferEqual = bufferEqual(out, ref)
      t.ok(isBufferEqual, 'compares with working file ok')

      if (!isBufferEqual) {
        process.stdout.write(`${out.length} ${ref.length}\n`)
      }

      t.end()
    })
})
