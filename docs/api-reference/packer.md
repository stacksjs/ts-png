# Packer

The Packer module provides low-level utilities for creating PNG files. It's used internally by the PNG class but can also be used directly for custom packing needs.

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

### createSignature(): Buffer

Creates a PNG signature buffer.

```typescript
import { createSignature } from 'pngx/packer'
import { Buffer } from 'node:buffer'

const signature = createSignature()
// Returns: <Buffer 89 50 4e 47 0d 0a 1a 0a>
```

### createIHDR(width: number, height: number, depth: number, colorType: number): Buffer

Creates an IHDR chunk buffer.

```typescript
import { Buffer } from 'node:buffer'

const ihdr = createIHDR(100, 100, 8, COLOR_TYPES.RGBA)
```

### createChunk(type: string, data: Buffer): Buffer

Creates a PNG chunk with the specified type and data.

```typescript
import { Buffer } from 'node:buffer'

const chunk = createChunk('tEXt', Buffer.from('key\0value'))
```

### createPLTE(palette: number[]): Buffer

Creates a PLTE chunk from a color palette.

```typescript
import { Buffer } from 'node:buffer'

const palette = [255, 0, 0, 0, 255, 0, 0, 0, 255] // RGB values
const plte = createPLTE(palette)
```

### createTRNS(transparency: number[], colorType: number): Buffer

Creates a tRNS chunk for transparency information.

```typescript
import { Buffer } from 'node:buffer'

const transparency = [0, 255] // For grayscale
const trns = createTRNS(transparency, COLOR_TYPES.GRAYSCALE)
```

### createGAMA(gamma: number): Buffer

Creates a gAMA chunk with the specified gamma value.

```typescript
import { Buffer } from 'node:buffer'

const gama = createGAMA(0.45455) // Standard sRGB gamma
```

### createIDAT(data: Buffer, width: number, height: number, options: PackOptions): Buffer

Creates an IDAT chunk from image data.

```typescript
import { Buffer } from 'node:buffer'

interface PackOptions {
  deflateLevel?: number
  deflateStrategy?: number
  filterType?: number | number[]
}

const idat = createIDAT(imageData, 100, 100, {
  deflateLevel: 9,
  filterType: FILTER_TYPES.PAETH
})
```

## Example Usage

### Custom PNG Packer

```typescript
import { Buffer } from 'node:buffer'
import {
  createChunk,
  createGAMA,
  createIDAT,
  createIHDR,
  createPLTE,
  createSignature,
  createTRNS
} from 'pngx/packer'

function packPNG(imageData: Buffer, options: PackOptions): Buffer {
  const chunks: Buffer[] = []

  // Add PNG signature
  chunks.push(createSignature())

  // Add IHDR
  chunks.push(createIHDR(
    options.width,
    options.height,
    options.depth,
    options.colorType
  ))

  // Add palette if needed
  if (options.palette) {
    chunks.push(createPLTE(options.palette))
  }

  // Add transparency if needed
  if (options.transparency) {
    chunks.push(createTRNS(options.transparency, options.colorType))
  }

  // Add gamma if specified
  if (options.gamma) {
    chunks.push(createGAMA(options.gamma))
  }

  // Add image data
  chunks.push(createIDAT(imageData, options.width, options.height, {
    deflateLevel: options.deflateLevel,
    deflateStrategy: options.deflateStrategy,
    filterType: options.filterType
  }))

  // Add IEND
  chunks.push(createChunk('IEND', Buffer.alloc(0)))

  // Combine all chunks
  return Buffer.concat(chunks)
}
```

### Creating a Simple PNG

```typescript
import { Buffer } from 'node:buffer'

function createSimplePNG(width: number, height: number): Buffer {
  // Create image data (RGBA)
  const imageData = Buffer.alloc(width _ height _ 4)

  // Fill with a gradient
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y _ width + x) _ 4
      imageData[idx] = x // Red
      imageData[idx + 1] = y // Green
      imageData[idx + 2] = 0 // Blue
      imageData[idx + 3] = 255 // Alpha
    }
  }

  // Pack the PNG
  return packPNG(imageData, {
    width,
    height,
    depth: 8,
    colorType: COLOR_TYPES.RGBA,
    deflateLevel: 9,
    filterType: FILTER_TYPES.PAETH
  })
}
```

### Creating a Paletted PNG

```typescript
import { Buffer } from 'node:buffer'

function createPalettedPNG(width: number, height: number): Buffer {
  // Create a simple palette (RGB)
  const palette = [
    255,
    0,
    0, // Red
    0,
    255,
    0, // Green
    0,
    0,
    255 // Blue
  ]

  // Create image data (1 byte per pixel)
  const imageData = Buffer.alloc(width * height)

  // Fill with a pattern
  for (let i = 0; i < imageData.length; i++) {
    imageData[i] = i % 3 // Index into palette
  }

  // Pack the PNG
  return packPNG(imageData, {
    width,
    height,
    depth: 8,
    colorType: COLOR_TYPES.PALETTE,
    palette,
    deflateLevel: 9,
    filterType: FILTER_TYPES.PAETH
  })
}
```

## Best Practices

1. **Chunk Order**: Follow PNG chunk ordering rules
2. **Memory Management**: Be careful with buffer allocations
3. **Compression**: Use appropriate compression settings
4. **Filtering**: Choose appropriate filter types

## Performance Considerations

1. **Buffer Allocation**: Pre-allocate buffers when possible
2. **Compression Level**: Balance compression ratio and speed
3. **Filter Selection**: Choose filters based on image content
4. **Memory Usage**: Be mindful of memory usage with large images

## Next Steps

- Learn about the [Parser](/api-reference/parser)
- Explore the [PNG Class](/api-reference/png)
- Check out [Advanced Topics](/advanced/buffer-management)
