import { expect, test } from 'bun:test'
import { Buffer } from 'node:buffer'
import png, { optimize } from '../src'
import { CrcCalculator } from '../src/crc'

function chunk(type: string, data: Buffer): Buffer {
  const bytes = Buffer.alloc(data.length + 12)
  bytes.writeUInt32BE(data.length, 0)
  bytes.write(type, 4)
  bytes.set(data, 8)
  bytes.writeUInt32BE(CrcCalculator.crc32(bytes.subarray(4, -4)) >>> 0, bytes.length - 4)
  return bytes
}

test('recompresses with identical RGBA and preserves ancillary chunks byte for byte', () => {
  const original = png.sync.write({ width: 32, height: 32, data: Buffer.alloc(32 * 32 * 4, 255), gamma: 0 }, { deflateLevel: 0 })
  const metadata = chunk('tEXt', Buffer.from('Description\0Keep  these   spaces'))
  const input = Buffer.concat([original.subarray(0, 33), metadata, original.subarray(33)])
  const result = optimize(input)
  expect(result.length).toBeLessThan(input.length)
  expect(Buffer.from(result).includes(metadata)).toBe(true)
  expect(png.sync.read(Buffer.from(result)).data).toEqual(png.sync.read(input).data)
  expect(optimize(result)).toBe(result)
})

test('preserves APNG control and frame data', () => {
  const original = png.sync.write({ width: 1, height: 1, data: Buffer.from([255,0,0,255]), gamma: 0 }, { deflateLevel: 0 })
  const animation = chunk('acTL', Buffer.from([0,0,0,2,0,0,0,0]))
  const frame = chunk('fdAT', Buffer.from([0,0,0,1,1,2,3]))
  const input = Buffer.concat([original.subarray(0,33),animation,original.subarray(33,-12),frame,original.subarray(-12)])
  const output = Buffer.from(optimize(input))
  expect(output.includes(animation)).toBe(true)
  expect(output.includes(frame)).toBe(true)
})

test('rejects checksum errors, truncation and decompression bombs', () => {
  const original = png.sync.write({ width: 32, height: 32, data: Buffer.alloc(4096,255), gamma: 0 })
  expect(() => optimize(original, { maxInflatedBytes: 16 })).toThrow()
  expect(() => optimize(original.subarray(0,-1))).toThrow()
  const corrupt = Buffer.from(original)
  corrupt[20] ^= 1
  expect(() => optimize(corrupt)).toThrow(/checksum/)
})
