import type { Buffer } from 'node:buffer'
import type { PNG } from './png' // Importing the main PNG class we created earlier
import pack from './packer-sync'
import parse from './parser-sync'

interface PNGSyncOptions {
  // Common options that can be passed to both read and write
  skipRescale?: boolean
  checkCRC?: boolean
  deflateChunkSize?: number
  deflateLevel?: number
  deflateStrategy?: number
  inputHasAlpha?: boolean
  bitDepth?: 8 | 16
  colorType?: number
  inputColorType?: number
}

interface PNGReadResult {
  width: number
  height: number
  data: Buffer
  gamma?: number
}

/**
 * Synchronously reads a PNG buffer and returns the decoded image data
 * @param buffer The PNG file data as a buffer
 * @param options Optional configuration for reading
 * @returns Decoded PNG data including dimensions and pixel data
 */
export function read(buffer: Buffer, options: PNGSyncOptions = {}): PNGReadResult {
  const result = parse(buffer, options)
  if (!result.data)
    throw new Error('Invalid PNG data')
  return result as PNGReadResult
}

/**
 * Synchronously encodes PNG data into a buffer
 * @param png The PNG instance or data to encode
 * @param options Optional configuration for writing
 * @returns Encoded PNG data as a buffer
 */
export function write(png: PNG | PNGReadResult, options: PNGSyncOptions = {}): Buffer {
  if (!png.data) {
    throw new Error('No data to write')
  }
  return pack({ width: png.width, height: png.height, data: png.data, gamma: png.gamma }, options)
}

const PNGSync: { write: typeof write, read: typeof read } = {
  write,
  read,
}

export default PNGSync
