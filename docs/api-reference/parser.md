# Parser

The Parser module provides low-level utilities for parsing PNG files. It's used internally by the PNG class but can also be used directly for custom parsing needs.

## Constants

### Color Types

```typescript
const COLOR_TYPES = {
  GRAYSCALE: 0,
  RGB: 2,
  PALETTE: 3,
  GRAYSCALE_ALPHA: 4,
  RGBA: 6
} as const
```

### Filter Types

```typescript
const FILTER_TYPES = {
  NONE: 0,
  SUB: 1,
  UP: 2,
  AVERAGE: 3,
  PAETH: 4
} as const
```

## Functions

### parseSignature(buffer: Buffer): boolean

Checks if a buffer starts with a valid PNG signature.

```typescript
import { parseSignature } from 'pngx/parser'
import { Buffer } from 'node:buffer'

const buffer = readFileSync('image.png')
if (parseSignature(buffer)) {
  console.log('Valid PNG file')
}
```

### parseIHDR(buffer: Buffer, offset: number): IHDRData

Parses the IHDR chunk of a PNG file.

```typescript
import { Buffer } from 'node:buffer'

interface IHDRData {
  width: number
  height: number
  depth: number
  colorType: number
  compression: number
  filter: number
  interlace: number
}

const ihdr = parseIHDR(buffer, 8) // Skip PNG signature
console.log('Image dimensions:', ihdr.width, 'x', ihdr.height)
```

### parseChunk(buffer: Buffer, offset: number): ChunkData

Parses a PNG chunk at the specified offset.

```typescript
import { Buffer } from 'node:buffer'

interface ChunkData {
  length: number
  type: string
  data: Buffer
  crc: number
}

const chunk = parseChunk(buffer, offset)
console.log('Chunk type:', chunk.type)
```

### parsePalette(buffer: Buffer): number[]

Parses the PLTE chunk into a color palette.

```typescript
import { Buffer } from 'node:buffer'

const palette = parsePalette(buffer)
// palette is an array of RGB values
```

### parseTransparency(buffer: Buffer, colorType: number): number[]

Parses the tRNS chunk for transparency information.

```typescript
import { Buffer } from 'node:buffer'

const transparency = parseTransparency(buffer, COLOR_TYPES.PALETTE)
```

### parseGamma(buffer: Buffer): number

Parses the gAMA chunk for gamma information.

```typescript
import { Buffer } from 'node:buffer'

const gamma = parseGamma(buffer)
console.log('Image gamma:', gamma)
```

## Example Usage

### Custom PNG Parser

```typescript
import { Buffer } from 'node:buffer'
import {
  parseChunk,
  parseGamma,
  parseIHDR,
  parsePalette,
  parseSignature,
  parseTransparency
} from 'pngx/parser'

function parsePNG(buffer: Buffer) {
  // Check PNG signature
  if (!parseSignature(buffer)) {
    throw new Error('Invalid PNG file')
  }

  // Parse IHDR
  const ihdr = parseIHDR(buffer, 8)
  console.log('Image dimensions:', ihdr.width, 'x', ihdr.height)
  console.log('Color type:', ihdr.colorType)
  console.log('Bit depth:', ihdr.depth)

  // Parse chunks
  let offset = 33 // After IHDR
  const chunks: ChunkData[] = []

  while (offset < buffer.length) {
    const chunk = parseChunk(buffer, offset)
    chunks.push(chunk)

    // Handle specific chunks
    switch (chunk.type) {
      case 'PLTE':
        const palette = parsePalette(chunk.data)
        console.log('Palette size:', palette.length / 3)
        break

      case 'tRNS':
        const transparency = parseTransparency(chunk.data, ihdr.colorType)
        console.log('Transparency data:', transparency)
        break

      case 'gAMA':
        const gamma = parseGamma(chunk.data)
        console.log('Gamma:', gamma)
        break
    }

    offset += 12 + chunk.length // 12 = 4 (length) + 4 (type) + 4 (crc)
  }

  return {
    ihdr,
    chunks
  }
}
```

### Reading Image Data

```typescript
import { Buffer } from 'node:buffer'

function readImageData(buffer: Buffer, ihdr: IHDRData): Buffer {
  const bytesPerPixel = getBytesPerPixel(ihdr.colorType, ihdr.depth)
  const rowSize = ihdr.width _ bytesPerPixel
  const imageData = Buffer.alloc(ihdr.width _ ihdr.height _ bytesPerPixel)

  let offset = 0
  let row = 0

  while (row < ihdr.height) {
    const filterType = buffer[offset++]
    const rowData = buffer.slice(offset, offset + rowSize)

    // Apply filter
    const filteredData = applyFilter(rowData, filterType, bytesPerPixel)

    // Copy to image data
    filteredData.copy(imageData, row _ rowSize)

    offset += rowSize
    row++
  }

  return imageData
}

function getBytesPerPixel(colorType: number, depth: number): number {
  switch (colorType) {
    case COLOR_TYPES.GRAYSCALE:
      return depth === 16 ? 2 : 1
    case COLOR_TYPES.RGB:
      return depth === 16 ? 6 : 3
    case COLOR_TYPES.PALETTE:
      return 1
    case COLOR_TYPES.GRAYSCALE_ALPHA:
      return depth === 16 ? 4 : 2
    case COLOR_TYPES.RGBA:
      return depth === 16 ? 8 : 4
    default:
      throw new Error('Invalid color type')
  }
}
```

## Best Practices

1. **Error Handling**: Always check for valid PNG signature
2. **Memory Management**: Be careful with buffer allocations
3. **Chunk Order**: Respect PNG chunk ordering rules
4. **CRC Checking**: Verify chunk CRCs for data integrity

## Performance Considerations

1. **Buffer Slices**: Use buffer slices instead of copying
2. **Memory Usage**: Be mindful of memory usage with large images
3. **Streaming**: Consider streaming for large files
4. **Chunk Processing**: Process chunks as they are read

## Next Steps

- Learn about the [Packer](/api-reference/packer)
- Explore the [PNG Class](/api-reference/png)
- Check out [Advanced Topics](/advanced/buffer-management)
