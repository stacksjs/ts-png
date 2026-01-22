import { Buffer } from 'node:buffer'
import { inflateSync as zlibInflateSync } from 'node:zlib'
import { dataToBitMap } from './bitmapper'
import FilterSync from './filter-parse-sync'
import formatNormalizer from './format-normalizer'
import { Parser } from './parser'
import { SyncReader } from './sync-reader'

interface ParserSyncOptions {
  skipRescale?: boolean
}

interface MetaData {
  width: number
  height: number
  depth: 1 | 2 | 4 | 8 | 16
  bpp: 1 | 2 | 4 | 3
  interlace: boolean
  color?: boolean
  colorType: number
  alpha?: boolean
  data?: Buffer
  gamma?: number
  palette?: Color[] // Change from Buffer to Color array
  transColor?: number[]
}

interface ParserCallbacks {
  read: () => Buffer
  error: (err: Error) => void
  metadata: (metadata: MetaData) => void
  gamma: (gamma: number) => void
  palette: (palette: Buffer) => void
  transColor: (transColor: number[]) => void
  inflateData: (data: Buffer) => void
  simpleTransparency: () => void
}

/**
 * Synchronously parse a PNG buffer
 * @param buffer The PNG file data as a buffer
 * @param options Parser options
 * @returns Parsed PNG metadata including pixel data
 */
export function parseSync(buffer: Buffer, options: ParserSyncOptions = {}): MetaData {
  let err: Error | null = null
  let metaData: MetaData | null = null
  let gamma: number | null = null
  const inflateDataList: Buffer[] = []

  const callbacks: ParserCallbacks = {
    read(): Buffer {
      return Buffer.alloc(0) // Will be overridden by reader.read
    },

    error(_err: Error): void {
      err = _err
    },

    metadata(_metaData: MetaData): void {
      metaData = _metaData
    },

    gamma(_gamma: number): void {
      gamma = _gamma
    },

    palette(palette: Buffer): void {
      if (metaData) {
        metaData.palette = palette
      }
    },

    transColor(transColor: number[]): void {
      if (metaData) {
        metaData.transColor = transColor
      }
    },

    inflateData(inflatedData: Buffer): void {
      inflateDataList.push(inflatedData)
    },

    simpleTransparency(): void {
      if (metaData) {
        metaData.alpha = true
      }
    },
  }

  const reader = new SyncReader(buffer)
  callbacks.read = reader.read.bind(reader)

  const parser = new Parser(options, callbacks)

  parser.start()
  reader.process()

  if (err)
    throw err

  if (!metaData)
    throw new Error('PNG parsing failed - no metadata available')

  // Join together the inflate data
  const inflateData = Buffer.concat(inflateDataList)
  inflateDataList.length = 0

  // Add type guard to help TypeScript narrow the type
  const validatedMeta: MetaData = metaData

  // Use Node.js zlib for decompression (Bun compatible)
  const inflatedData = zlibInflateSync(inflateData)

  if (!inflatedData?.length) {
    throw new Error('Bad PNG - invalid inflate data response')
  }

  const unfilteredData = FilterSync(inflatedData, validatedMeta)
  const bitmapData = dataToBitMap(unfilteredData, validatedMeta)
  const normalizedBitmapData = formatNormalizer(
    Buffer.from(bitmapData.buffer),
    validatedMeta,
    options.skipRescale,
  )

  validatedMeta.data = normalizedBitmapData
  validatedMeta.gamma = gamma || 0

  return metaData
}

export default parseSync
