import { Buffer } from 'node:buffer'
import { deflateSync, inflateSync } from 'node:zlib'
import { CrcCalculator } from './crc'

/** Recompress IDAT without changing pixels, bit depth, profiles, EXIF or APNG frames. */
export function optimize(input: Uint8Array, options: { maxInflatedBytes?: number } = {}): Uint8Array {
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength)
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    throw new Error('Invalid PNG signature')
  const before: Buffer[] = [bytes.subarray(0, 8)]
  const after: Buffer[] = []
  const idat: Buffer[] = []
  let offset = 8
  let ended = false
  let idatEnded = false
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error('Truncated PNG chunk')
    const size = bytes.readUInt32BE(offset)
    const end = offset + 12 + size
    if (end > bytes.length) throw new Error('Truncated PNG chunk data')
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    if (offset === 8 && (type !== 'IHDR' || size !== 13)) throw new Error('Invalid PNG header')
    if ((CrcCalculator.crc32(bytes.subarray(offset + 4, end - 4)) >>> 0) !== bytes.readUInt32BE(end - 4))
      throw new Error(`Invalid PNG ${type} checksum`)
    if (type === 'IDAT') {
      if (idatEnded) throw new Error('Nonconsecutive PNG IDAT chunks')
      idat.push(bytes.subarray(offset + 8, end - 4))
    }
    else {
      if (idat.length) idatEnded = true
      const destination = idat.length ? after : before
      destination.push(bytes.subarray(offset, end))
    }
    offset = end
    if (type === 'IEND') {
      if (size !== 0) throw new Error('Invalid PNG end chunk')
      after.push(bytes.subarray(offset))
      ended = true
      break
    }
  }
  if (!ended || !idat.length) throw new Error('Incomplete PNG')
  const original = Buffer.concat(idat)
  const raw = inflateSync(original, { maxOutputLength: options.maxInflatedBytes ?? 256 * 1024 * 1024 })
  let smallest = original
  for (const strategy of [0, 1, 2, 3]) {
    const candidate = deflateSync(raw, { level: 9, strategy })
    if (candidate.length < smallest.length) smallest = candidate
  }
  const chunk = Buffer.alloc(smallest.length + 12)
  chunk.writeUInt32BE(smallest.length, 0)
  chunk.write('IDAT', 4)
  chunk.set(smallest, 8)
  chunk.writeUInt32BE(CrcCalculator.crc32(chunk.subarray(4, chunk.length - 4)) >>> 0, chunk.length - 4)
  const output = Buffer.concat([...before, chunk, ...after])
  return output.length < input.length ? output : input
}
