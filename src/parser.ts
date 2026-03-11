import { Buffer } from 'node:buffer'
import {
  COLORTYPE_ALPHA,
  COLORTYPE_COLOR,
  COLORTYPE_GRAYSCALE,
  COLORTYPE_PALETTE,
  COLORTYPE_PALETTE_COLOR,
  COLORTYPE_TO_BPP_MAP,
  GAMMA_DIVISION,
  PNG_SIGNATURE,
  TYPE_gAMA,
  TYPE_IDAT,
  TYPE_IEND,
  TYPE_IHDR,
  TYPE_PLTE,
  TYPE_tRNS,
} from './constants'
import { CrcCalculator } from './crc'

interface ParserOptions {
  checkCRC?: boolean
}

interface ParserDependencies {
  read: (length: number, callback: (data: Buffer) => void) => void
  error: (error: Error) => void
  metadata: (metadata: MetaData) => void
  gamma: (gamma: number) => void
  transColor: (colors: number[]) => void
  palette: (palette: Color[]) => void
  parsed?: (data: Buffer) => void
  inflateData: (data: Buffer) => void
  finished: () => void
  simpleTransparency: () => void
  headersFinished?: () => void
}

interface MetaData {
  width: number
  height: number
  depth: number
  interlace: boolean
  palette: boolean
  color: boolean
  alpha: boolean
  bpp: number
  colorType: number
}

type Color = [number, number, number, number]
type ChunkHandler = (_length: number) => void

export class Parser {
  private readonly _options: ParserOptions
  private _hasIHDR: boolean = false
  private _hasIEND: boolean = false
  private _emittedHeadersFinished: boolean = false
  private _palette: Color[] = []
  private _colorType: number = 0
  private _crc!: CrcCalculator
  private readonly _chunks: Record<number, ChunkHandler>

  // Dependencies
  private readonly read: ParserDependencies['read']
  private readonly error: ParserDependencies['error']
  private readonly metadata: ParserDependencies['metadata']
  private readonly gamma: ParserDependencies['gamma']
  private readonly transColor: ParserDependencies['transColor']
  private readonly palette: ParserDependencies['palette']
  private readonly parsed?: ParserDependencies['parsed']
  private readonly inflateData: ParserDependencies['inflateData']
  private readonly finished: ParserDependencies['finished']
  private readonly simpleTransparency: ParserDependencies['simpleTransparency']
  private readonly headersFinished: Required<ParserDependencies>['headersFinished']

  constructor(options: ParserOptions | undefined, dependencies: ParserDependencies) {
    this._options = {
      checkCRC: options?.checkCRC !== false,
      ...options,
    }

    // Initialize dependencies
    this.read = dependencies.read
    this.error = dependencies.error
    this.metadata = dependencies.metadata
    this.gamma = dependencies.gamma
    this.transColor = dependencies.transColor
    this.palette = dependencies.palette
    this.parsed = dependencies.parsed
    this.inflateData = dependencies.inflateData
    this.finished = dependencies.finished
    this.simpleTransparency = dependencies.simpleTransparency
    this.headersFinished = dependencies.headersFinished || (() => { })

    // Initialize chunk handlers
    this._chunks = {
      [TYPE_IHDR]: this._handleIHDR.bind(this),
      [TYPE_IEND]: this._handleIEND.bind(this),
      [TYPE_IDAT]: this._handleIDAT.bind(this),
      [TYPE_PLTE]: this._handlePLTE.bind(this),
      [TYPE_tRNS]: this._handleTRNS.bind(this),
      [TYPE_gAMA]: this._handleGAMA.bind(this),
    }
  }

  public start(): void {
    this.read(PNG_SIGNATURE.length, this._parseSignature.bind(this))
  }

  private _parseSignature(data: Buffer): void {
    const signature = PNG_SIGNATURE

    for (let i = 0; i < signature.length; i++) {
      if (data[i] !== signature[i]) {
        this.error(new Error('Invalid file signature'))
        return
      }
    }
    this.read(8, this._parseChunkBegin.bind(this))
  }

  private _parseChunkBegin(data: Buffer): void {
    // chunk content length
    const length = data.readUInt32BE(0)

    // chunk type
    const type = data.readUInt32BE(4)
    let name = ''
    for (let i = 4; i < 8; i++) {
      const charCode = data[i]
      if (charCode < 65 || charCode > 122 || (charCode > 90 && charCode < 97)) {
        this.error(new Error('Invalid chunk type'))
        return
      }
      name += String.fromCharCode(charCode)
    }

    // chunk flags
    const ancillary = Boolean(data[4] & 0x20) // or critical

    if (!this._hasIHDR && type !== TYPE_IHDR) {
      this.error(new Error('Expected IHDR to be first chunk'))
      return
    }

    this._crc = new CrcCalculator()
    this._crc.write(Buffer.from(name))

    if (this._chunks[type]) {
      return this._chunks[type](length)
    }

    if (!ancillary) {
      this.error(new Error(`Unsupported critical chunk type ${name}`))
      return
    }

    this.read(length + 4, this._skipChunk.bind(this))
  }

  private _skipChunk(_data: Buffer): void {
    this.read(8, this._parseChunkBegin.bind(this))
  }

  private _handleChunkEnd(): void {
    this.read(4, this._parseChunkEnd.bind(this))
  }

  private _parseChunkEnd(data: Buffer): void {
    const fileCrc = data.readInt32BE(0)
    const calcCrc = this._crc.crc32()

    if (this._options.checkCRC && calcCrc !== fileCrc) {
      this.error(new Error(`Crc error - ${fileCrc} - ${calcCrc}`))
      return
    }

    if (!this._hasIEND) {
      this.read(8, this._parseChunkBegin.bind(this))
    }
  }

  private _handleIHDR(length: number): void {
    this.read(length, this._parseIHDR.bind(this))
  }

  private _parseIHDR(data: Buffer): void {
    this._crc.write(data)

    const width = data.readUInt32BE(0)
    const height = data.readUInt32BE(4)
    const depth = data[8]
    const colorType = data[9] // bits: 1 palette, 2 color, 4 alpha
    const compr = data[10]
    const filter = data[11]
    const interlace = data[12]

    if (![1, 2, 4, 8, 16].includes(depth)) {
      this.error(new Error(`Unsupported bit depth ${depth}`))
      return
    }

    if (!(colorType in COLORTYPE_TO_BPP_MAP)) {
      this.error(new Error('Unsupported color type'))
      return
    }

    if (compr !== 0) {
      this.error(new Error('Unsupported compression method'))
      return
    }

    if (filter !== 0) {
      this.error(new Error('Unsupported filter method'))
      return
    }

    if (interlace !== 0 && interlace !== 1) {
      this.error(new Error('Unsupported interlace method'))
      return
    }

    this._colorType = colorType
    const bpp = COLORTYPE_TO_BPP_MAP[this._colorType]
    this._hasIHDR = true

    this.metadata({
      width,
      height,
      depth,
      interlace: Boolean(interlace),
      palette: Boolean(colorType & COLORTYPE_PALETTE),
      color: Boolean(colorType & COLORTYPE_COLOR),
      alpha: Boolean(colorType & COLORTYPE_ALPHA),
      bpp,
      colorType,
    })

    this._handleChunkEnd()
  }

  private _handlePLTE(length: number): void {
    this.read(length, this._parsePLTE.bind(this))
  }

  private _parsePLTE(data: Buffer): void {
    this._crc.write(data)
    const entries = Math.floor(data.length / 3)

    for (let i = 0; i < entries; i++) {
      this._palette.push([
        data[i * 3],
        data[i * 3 + 1],
        data[i * 3 + 2],
        0xFF,
      ])
    }

    this.palette(this._palette)
    this._handleChunkEnd()
  }

  private _handleTRNS(length: number): void {
    this.simpleTransparency()
    this.read(length, this._parseTRNS.bind(this))
  }

  private _parseTRNS(data: Buffer): void {
    this._crc.write(data)

    if (this._colorType === COLORTYPE_PALETTE_COLOR) {
      if (this._palette.length === 0) {
        this.error(new Error('Transparency chunk must be after palette'))
        return
      }
      if (data.length > this._palette.length) {
        this.error(new Error('More transparent colors than palette size'))
        return
      }
      for (let i = 0; i < data.length; i++) {
        this._palette[i][3] = data[i]
      }
      this.palette(this._palette)
    }

    if (this._colorType === COLORTYPE_GRAYSCALE) {
      this.transColor([data.readUInt16BE(0)])
    }
    if (this._colorType === COLORTYPE_COLOR) {
      this.transColor([
        data.readUInt16BE(0),
        data.readUInt16BE(2),
        data.readUInt16BE(4),
      ])
    }

    this._handleChunkEnd()
  }

  private _handleGAMA(length: number): void {
    this.read(length, this._parseGAMA.bind(this))
  }

  private _parseGAMA(data: Buffer): void {
    this._crc.write(data)
    this.gamma(data.readUInt32BE(0) / GAMMA_DIVISION)
    this._handleChunkEnd()
  }

  private _handleIDAT(length: number): void {
    if (!this._emittedHeadersFinished) {
      this._emittedHeadersFinished = true
      this.headersFinished()
    }
    this.read(-length, this._parseIDAT.bind(this, length))
  }

  private _parseIDAT(length: number, data: Buffer): void {
    this._crc.write(data)

    if (this._colorType === COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
      throw new Error('Expected palette not found')
    }

    this.inflateData(data)
    const leftOverLength = length - data.length

    if (leftOverLength > 0) {
      this._handleIDAT(leftOverLength)
    }
    else {
      this._handleChunkEnd()
    }
  }

  private _handleIEND(length: number): void {
    this.read(length, this._parseIEND.bind(this))
  }

  private _parseIEND(data: Buffer): void {
    this._crc.write(data)
    this._hasIEND = true
    this._handleChunkEnd()

    if (this.finished) {
      this.finished()
    }
  }
}
