import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import process from 'node:process'
import Packer from './packer-async'
import Parser from './parser-async'
import PNGSync from './png-sync'

interface PNGOptions {
  width?: number
  height?: number
  fill?: boolean
  skipRescale?: boolean
  checkCRC?: boolean
  deflateChunkSize?: number
  deflateLevel?: number
  deflateStrategy?: number
  inputHasAlpha?: boolean
  bitDepth?: 8 | 16
  colorType?: number
  inputColorType?: number
  filterType?: number
}

interface PNGMetadata {
  width: number
  height: number
}

export class PNG extends EventEmitter {
  public width: number
  public height: number
  public data: Buffer | null
  public gamma: number
  public readable: boolean
  public writable: boolean

  private readonly _parser: Parser
  private readonly _packer: Packer

  static sync: typeof PNGSync = PNGSync

  constructor(options: PNGOptions = {}) {
    super()

    // Coerce pixel dimensions to integers (also coerces undefined -> 0)
    this.width = options.width || 0
    this.height = options.height || 0

    this.data = this.width > 0 && this.height > 0
      ? Buffer.alloc(4 * this.width * this.height)
      : null

    if (options.fill && this.data) {
      this.data.fill(0)
    }

    this.gamma = 0
    this.readable = true
    this.writable = true

    this._parser = new Parser(options)
    this._packer = new Packer(options)

    this._setupEventListeners()
  }

  private _setupEventListeners(): void {
    // Parser events
    this._parser.on('error', (error: Error) => this.emit('error', error))
    this._parser.on('close', () => this._handleClose())
    this._parser.on('metadata', (metadata: PNGMetadata) => this._metadata(metadata))
    this._parser.on('gamma', (gamma: number) => this._gamma(gamma))
    this._parser.on('parsed', (data: Buffer) => {
      this.data = data
      this.emit('parsed', data)
    })

    // Packer events
    this._packer.on('data', (data: Buffer) => this.emit('data', data))
    this._packer.on('end', () => this.emit('end'))
    this._packer.on('error', (error: Error) => this.emit('error', error))
  }

  public pack(): this {
    if (!this.data?.length) {
      this.emit('error', new Error('No data provided'))
      return this
    }

    process.nextTick(() => {
      this._packer.pack(this.data!, this.width, this.height, this.gamma)
    })

    return this
  }

  public parse(data: Buffer, callback?: (err: Error | null, png: PNG | null) => void): this {
    if (callback) {
      function handleError(this: PNG, err: Error) {
        this.removeListener('parsed', handleParsed)
        if (callback)
          callback(err, null)
      }

      function handleParsed(this: PNG, parsedData: Buffer) {
        this.removeListener('error', handleError)
        this.data = parsedData
        if (callback)
          callback(null, this)
      }

      this.once('parsed', handleParsed)
      this.once('error', handleError)
    }

    this.end(data)
    return this
  }

  public write(data: Buffer): boolean {
    this._parser.write(data)
    return true
  }

  public end(data?: Buffer): void {
    this._parser.end(data)
  }

  private _metadata(metadata: PNGMetadata): void {
    this.width = metadata.width
    this.height = metadata.height
    this.emit('metadata', metadata)
  }

  private _gamma(gamma: number): void {
    this.gamma = gamma
  }

  private _handleClose(): void {
    if (!this._parser.writable && !this._packer.readable) {
      this.emit('close')
    }
  }

  static bitblt(
    src: PNG,
    dst: PNG,
    srcX: number,
    srcY: number,
    width: number,
    height: number,
    deltaX: number,
    deltaY: number,
  ): void {
    // Coerce pixel dimensions to integers
    srcX |= 0
    srcY |= 0
    width |= 0
    height |= 0
    deltaX |= 0
    deltaY |= 0

    if (
      srcX > src.width
      || srcY > src.height
      || srcX + width > src.width
      || srcY + height > src.height
    ) {
      throw new Error('bitblt reading outside image')
    }

    if (
      deltaX > dst.width
      || deltaY > dst.height
      || deltaX + width > dst.width
      || deltaY + height > dst.height
    ) {
      throw new Error('bitblt writing outside image')
    }

    if (!src.data || !dst.data) {
      throw new Error('Source or destination data is null')
    }

    for (let y = 0; y < height; y++) {
      src.data.copy(
        dst.data,
        ((deltaY + y) * dst.width + deltaX) << 2,
        ((srcY + y) * src.width + srcX) << 2,
        ((srcY + y) * src.width + srcX + width) << 2,
      )
    }
  }

  public bitblt(
    dst: PNG,
    srcX: number,
    srcY: number,
    width: number,
    height: number,
    deltaX: number,
    deltaY: number,
  ): this {
    PNG.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY)
    return this
  }

  static adjustGamma(src: PNG): void {
    if (src.gamma && src.data) {
      for (let y = 0; y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
          const idx = (src.width * y + x) << 2

          for (let i = 0; i < 3; i++) {
            let sample = src.data[idx + i] / 255
            sample = sample ** (1 / 2.2 / src.gamma)
            src.data[idx + i] = Math.round(sample * 255)
          }
        }
      }
      src.gamma = 0
    }
  }

  public adjustGamma(): void {
    PNG.adjustGamma(this)
  }
}

export default PNG
