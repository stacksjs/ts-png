import type { Inflate } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { createInflate } from 'node:zlib'

// Z_MIN_CHUNK is 64 in zlib - hardcode for Bun compatibility
const Z_MIN_CHUNK = 64
import { dataToBitMap } from './bitmapper'
import { ChunkStream } from './chunkstream'
import { FilterAsync } from './filter-parse-async'
import formatNormalizer from './format-normalizer'
import { Parser } from './parser'

interface ParserAsyncOptions {
  skipRescale?: boolean
  checkCRC?: boolean
}

interface BitmapInfo {
  width: number
  height: number
  depth: 1 | 2 | 4 | 8 | 16
  bpp: 1 | 2 | 3 | 4
  interlace: boolean
  colorType: number
  palette?: Color[]
  transColor?: number[]
  alpha?: boolean
}

interface ParserMetadata {
  width: number
  height: number
  depth: number
  interlace: boolean
  colorType: number
  bpp: number
  palette: boolean
  color: boolean
  alpha: boolean
}

type Color = [number, number, number, number]

interface ParserCallbacks {
  read: (length: number, callback: (data: Buffer) => void) => void
  error: (err: Error) => void
  metadata: (metadata: ParserMetadata) => void
  gamma: (gamma: number) => void
  palette: (palette: Color[]) => void
  transColor: (transColor: number[]) => void
  finished: () => void
  inflateData: (data: Buffer) => void
  simpleTransparency: () => void
  headersFinished: () => void
}

export class ParserAsync extends ChunkStream {
  private readonly _parser: Parser
  private readonly _options: ParserAsyncOptions
  private _inflate: Inflate | null
  private _filter: FilterAsync | null
  private _metaData!: ParserMetadata
  private _bitmapInfo!: BitmapInfo
  private errord: boolean
  public writable: boolean

  constructor(options: ParserAsyncOptions = {}) {
    super()

    this.writable = true
    this.errord = false
    this._inflate = null
    this._filter = null

    this._options = options

    const callbacks: ParserCallbacks = {
      read: this.read.bind(this),
      error: this._handleError.bind(this),
      metadata: this._handleMetaData.bind(this),
      gamma: this.emit.bind(this, 'gamma'),
      palette: this._handlePalette.bind(this),
      transColor: this._handleTransColor.bind(this),
      finished: this._finished.bind(this),
      inflateData: this._inflateData.bind(this),
      simpleTransparency: this._simpleTransparency.bind(this),
      headersFinished: this._headersFinished.bind(this),
    }

    this._parser = new Parser(options, callbacks)
    this._parser.start()
  }

  private _handleError(err: Error): void {
    this.emit('error', err)
    this.writable = false
    this.destroy()

    if (this._inflate?.destroy) {
      this._inflate.destroy()
    }

    if (this._filter) {
      this._filter.destroy()
      // For backward compatibility with Node 7 and below.
      // Suppress errors due to _inflate calling write() even after
      // it's destroy()'ed.
      this._filter.on('error', () => { })
    }

    this.errord = true
  }

  private _inflateData(data: Buffer): void {
    if (!this._inflate) {
      if (this._bitmapInfo.interlace) {
        this._inflate = createInflate()

        this._inflate.on('error', err => this.emit('error', err))
        this._filter!.on('complete', this._complete.bind(this))

        this._inflate.pipe(this._filter! as unknown as NodeJS.WritableStream)
      }
      else {
        const rowSize = ((this._bitmapInfo.width
          * this._bitmapInfo.bpp
          * this._bitmapInfo.depth + 7) >> 3) + 1
        const imageSize = rowSize * this._bitmapInfo.height
        const chunkSize = Math.max(imageSize, Z_MIN_CHUNK)

        this._inflate = createInflate({ chunkSize })
        let leftToInflate = imageSize

        this._inflate.on('error', (err: Error) => {
          if (!leftToInflate)
            return
          this.emit('error', err)
        })

        this._filter!.on('complete', this._complete.bind(this))

        const filterWrite = this._filter!.write.bind(this._filter)
        this._inflate.on('data', (chunk: Buffer) => {
          if (!leftToInflate)
            return

          if (chunk.length > leftToInflate) {
            chunk = chunk.slice(0, leftToInflate)
          }

          leftToInflate -= chunk.length
          filterWrite(chunk)
        })

        this._inflate.on('end', () => this._filter!.end())
      }
    }
    this._inflate.write(data)
  }

  private _handleMetaData(metaData: ParserMetadata): void {
    this._metaData = metaData
    this._bitmapInfo = Object.create(metaData) as BitmapInfo
    this._filter = new FilterAsync(this._bitmapInfo)
  }

  private _handleTransColor(transColor: number[]): void {
    this._bitmapInfo.transColor = transColor
  }

  private _handlePalette(palette: Color[]): void {
    this._bitmapInfo.palette = palette
  }

  private _simpleTransparency(): void {
    this._metaData.alpha = true
  }

  private _headersFinished(): void {
    // Up until this point, we don't know if we have a tRNS chunk (alpha)
    // so we can't emit metadata any earlier
    this.emit('metadata', this._metaData)
  }

  private _finished(): void {
    if (this.errord)
      return

    if (!this._inflate) {
      this.emit('error', new Error('No Inflate block'))
    }
    else {
      // no more data to inflate
      this._inflate.end()
    }
  }

  private _complete(filteredData: Buffer): void {
    if (this.errord)
      return

    try {
      const bitmapData = dataToBitMap(filteredData, this._bitmapInfo)
      const bitmapBuffer = Buffer.isBuffer(bitmapData)
        ? bitmapData
        : Buffer.from(bitmapData.buffer)
      const normalisedBitmapData = formatNormalizer(
        bitmapBuffer,
        this._bitmapInfo,
        this._options.skipRescale,
      )

      this.emit('parsed', normalisedBitmapData)
    }
    catch (ex) {
      this._handleError(ex instanceof Error ? ex : new Error(String(ex)))
    }
  }
}

export default ParserAsync
