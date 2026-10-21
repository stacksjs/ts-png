import { constants } from 'node:buffer'
import { getImagePasses } from './interlace'

export interface DecodeOptions {
  /** Maximum bytes in the inflated scanlines or decoded RGBA buffer. Default: 256 MiB. */
  maxDecodedBytes?: number
}

interface ImageInfo {
  width: number
  height: number
  bpp: number
  depth: number
  interlace: boolean
}

/** Validate arithmetic and allocations before inflation or pixel allocation. */
export function inflatedByteLength(info: ImageInfo, options: DecodeOptions): number {
  const limit = options.maxDecodedBytes === undefined ? 256 * 1024 * 1024 : options.maxDecodedBytes
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > constants.MAX_LENGTH)
    throw new Error('PNG decode byte budget must be a positive safe buffer length')
  if (!Number.isSafeInteger(info.width) || !Number.isSafeInteger(info.height) || info.width <= 0 || info.height <= 0
    || info.width > 0x7fffffff || info.height > 0x7fffffff)
    throw new Error('PNG dimensions must be positive 31-bit integers')
  // The bitmapper allocates four channels, including a Uint16Array for 16-bit input.
  const bitmapBytes = info.width * info.height * 4 * (info.depth === 16 ? 2 : 1)
  if (!Number.isSafeInteger(bitmapBytes) || bitmapBytes > limit)
    throw new Error('PNG decode byte budget exceeded by decoded pixels')
  const passes = info.interlace ? getImagePasses(info.width, info.height) : [info]
  let bytes = 0
  for (const pass of passes) {
    // Each packed scanline is padded to a byte and starts with one filter byte.
    bytes += (Math.ceil(pass.width * info.bpp * info.depth / 8) + 1) * pass.height
    if (!Number.isSafeInteger(bytes) || bytes > limit)
      throw new Error('PNG decode byte budget exceeded by inflated scanlines')
  }
  return bytes
}
