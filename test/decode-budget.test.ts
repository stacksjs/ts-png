import { expect, test } from 'bun:test'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { png } from '../src'
import { CrcCalculator } from '../src/crc'

function chunk(type: string, bytes: Buffer): Buffer {
  const result = Buffer.alloc(bytes.length + 12)
  result.writeUInt32BE(bytes.length, 0)
  result.write(type, 4)
  bytes.copy(result, 8)
  result.writeInt32BE(CrcCalculator.crc32(result.subarray(4, -4)), result.length - 4)
  return result
}

// Actual CRC-valid PNGs. Inflation is kept small so regressions remain safe.
function image(raw: Buffer, interlace = false, width = 1, height = 1): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4)
  header[8] = 8; header[9] = 6; header[12] = Number(interlace)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

function parse(bytes: Buffer, options = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => new png(options).parse(bytes, (error, decoded) => {
    if (error) reject(error)
    else resolve(decoded!.data!)
  }))
}

test.each([false, true])('streaming rejects excess decompressed scanlines (interlaced=%s)', async (interlace) => {
  await expect(parse(image(Buffer.alloc(1024 * 1024), interlace))).rejects.toThrow('PNG inflated data exceeds')
})

test.each([false, true])('sync rejects excess decompressed scanlines (interlaced=%s)', (interlace) => {
  const bytes = image(Buffer.alloc(1024 * 1024), interlace)
  expect(() => png.sync.read(bytes)).toThrow('PNG inflated data exceeds')
})

test('an explicit decode byte budget rejects the header before allocating pixel data', async () => {
  const bytes = image(Buffer.alloc(5))
  expect(() => png.sync.read(bytes, { maxDecodedBytes: 3 })).toThrow('PNG decode byte budget')
  await expect(parse(bytes, { maxDecodedBytes: 3 })).rejects.toThrow('PNG decode byte budget')
  expect(() => png.sync.read(image(Buffer.alloc(5), false, 0x7fffffff, 0x7fffffff))).toThrow('PNG decode byte budget')
  expect(() => png.sync.read(image(Buffer.alloc(5), false, 0, 1))).toThrow('PNG dimensions')
})

test('valid packed, 16-bit and Adam7 fixtures still decode through both public interfaces', async () => {
  for (const name of ['basn0g01.png', 'basn6a16.png', 'basi0g01.png', 'basi6a16.png']) {
    const bytes = readFileSync(join(import.meta.dir, 'in', name))
    const sync = png.sync.read(bytes)
    expect(await parse(bytes)).toEqual(sync.data)
    expect(() => png.sync.read(bytes, { maxDecodedBytes: 1 })).toThrow('PNG decode byte budget')
  }
})

test('truncated scanlines fail instead of reporting a parsed image', async () => {
  const bytes = image(Buffer.alloc(4))
  expect(() => png.sync.read(bytes)).toThrow('PNG inflated data length')
  await expect(parse(bytes)).rejects.toThrow('PNG inflated data length')
})

test('streaming waits for the zlib checksum instead of publishing early pixels', async () => {
  const bytes = image(Buffer.alloc(5))
  const idatLength = bytes.readUInt32BE(33)
  bytes[41 + idatLength - 1] ^= 1
  bytes.writeInt32BE(CrcCalculator.crc32(bytes.subarray(37, 41 + idatLength)), 41 + idatLength)
  expect(() => png.sync.read(bytes)).toThrow()
  await expect(parse(bytes)).rejects.toThrow()
})

test('invalid byte budgets cannot disable the allocation limit', async () => {
  const bytes = image(Buffer.alloc(5))
  for (const maxDecodedBytes of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER, null]) {
    expect(() => Reflect.apply(png.sync.read, undefined, [bytes, { maxDecodedBytes }])).toThrow('PNG decode byte budget')
    await expect(parse(bytes, { maxDecodedBytes })).rejects.toThrow('PNG decode byte budget')
  }
})
