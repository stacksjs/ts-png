import { Buffer } from 'node:buffer'
import { inflateSync as zlibInflateSync } from 'node:zlib'
import { dataToBitMap } from './bitmapper'
import type { DecodeOptions } from './decode-budget'
import { inflatedByteLength } from './decode-budget'
import FilterSync from './filter-parse-sync'
import formatNormalizer from './format-normalizer'
import { Parser } from './parser'
import { SyncReader } from './sync-reader'

type Color = [number, number, number, number]

interface ParserSyncOptions extends DecodeOptions {
  skipRescale?: boolean
  checkCRC?: boolean
}

interface ParseResult {
  width: number
  height: number
  depth: number
  bpp: number
  interlace: boolean
  color?: boolean
  colorType: number
  alpha?: boolean
  data?: Buffer
  gamma?: number
  palette?: Color[]
  transColor?: number[]
}

/**
 * Synchronously parse a PNG buffer
 * @param buffer The PNG file data as a buffer
 * @param options Parser options
 * @returns Parsed PNG metadata including pixel data
 */
export function parseSync(buffer: Buffer, options: ParserSyncOptions = {}): ParseResult {
  let err: Error | null = null
  let result: ParseResult | null = null
  let gamma: number | null = null
  const inflateDataList: Buffer[] = []

  const reader = new SyncReader(buffer)

  const parser = new Parser(options, {
    read: reader.read.bind(reader),

    error(_err: Error): void {
      err = _err
    },

    metadata(metaData): void {
      const { palette: _hasPalette, ...rest } = metaData
      result = {
        ...rest,
      }
    },

    gamma(_gamma: number): void {
      gamma = _gamma
    },

    palette(palette: Color[]): void {
      if (result) {
        result.palette = palette
      }
    },

    transColor(transColor: number[]): void {
      if (result) {
        result.transColor = transColor
      }
    },

    inflateData(inflatedData: Buffer): void {
      inflateDataList.push(inflatedData)
    },

    finished(): void {
      // No-op for sync parsing
    },

    simpleTransparency(): void {
      if (result) {
        result.alpha = true
      }
    },
  })

  parser.start()
  reader.process()

  if (err)
    throw err

  if (!result)
    throw new Error('PNG parsing failed - no metadata available')

  // Join together the inflate data
  const inflateData = Buffer.concat(inflateDataList)
  inflateDataList.length = 0

  // Add type guard to help TypeScript narrow the type
  const validatedMeta: ParseResult = result
  const expectedBytes = inflatedByteLength(validatedMeta, options)

  // Enforce the exact scanline bound during decompression, before allocation grows.
  let inflatedData: Buffer
  try {
    inflatedData = zlibInflateSync(inflateData, { maxOutputLength: expectedBytes })
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE')
      throw new Error('PNG inflated data exceeds the declared scanline length', { cause: error })
    throw error
  }

  if (inflatedData.length !== expectedBytes)
    throw new Error('PNG inflated data length does not match the declared scanlines')

  const unfilteredData = FilterSync(inflatedData, validatedMeta as Parameters<typeof FilterSync>[1])
  const bitmapData = dataToBitMap(unfilteredData, validatedMeta as Parameters<typeof dataToBitMap>[1])
  const normalizedBitmapData = formatNormalizer(
    Buffer.from(bitmapData.buffer),
    validatedMeta,
    options.skipRescale,
  )

  validatedMeta.data = normalizedBitmapData
  validatedMeta.gamma = gamma || 0

  return result
}

export default parseSync
