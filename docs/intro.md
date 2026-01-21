# Introduction

pngx is a performant TypeScript PNG encoder and decoder built for modern JavaScript runtimes. It provides a pure TypeScript implementation for reading and writing PNG images with full support for various color types, bit depths, and compression levels.

## What is pngx?

pngx is a comprehensive PNG library that allows you to:

- **Encode Images**: Convert raw pixel data to PNG format
- **Decode Images**: Parse PNG files and extract pixel data
- **Handle Metadata**: Read and write PNG metadata chunks
- **Control Compression**: Fine-tune compression for size vs. speed tradeoffs

## Key Features

- **Pure TypeScript**: No native dependencies, works everywhere
- **Full PNG Support**: All color types, bit depths, and interlacing
- **Streaming API**: Process large images efficiently
- **Sync and Async**: Both synchronous and asynchronous APIs
- **Configurable Compression**: Multiple compression levels and strategies
- **Type Safe**: Full TypeScript types for excellent DX

## Supported Color Types

pngx supports all standard PNG color types:

| Color Type | Description | Bits Per Pixel |
|------------|-------------|----------------|
| Grayscale | Single channel | 1, 2, 4, 8, 16 |
| RGB | Red, Green, Blue | 8, 16 per channel |
| Indexed | Palette-based | 1, 2, 4, 8 |
| Grayscale + Alpha | Gray with transparency | 8, 16 per channel |
| RGBA | RGB with transparency | 8, 16 per channel |

## Quick Example

### Encoding

```typescript
import { PNG } from 'pngx'

// Create a new PNG
const png = new PNG({
  width: 100,
  height: 100,
  colorType: 6, // RGBA
})

// Set pixel data
for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2

    // Red gradient
    png.data[idx] = (x / png.width) * 255
    png.data[idx + 1] = 0
    png.data[idx + 2] = 0
    png.data[idx + 3] = 255
  }
}

// Write to buffer
const buffer = PNG.sync.write(png)
```

### Decoding

```typescript
import { PNG } from 'pngx'
import { readFileSync } from 'fs'

// Read PNG file
const buffer = readFileSync('image.png')

// Parse PNG
const png = PNG.sync.read(buffer)

console.log(`Size: ${png.width}x${png.height}`)
console.log(`Color Type: ${png.colorType}`)
console.log(`Bit Depth: ${png.depth}`)

// Access pixel data
const firstPixel = {
  r: png.data[0],
  g: png.data[1],
  b: png.data[2],
  a: png.data[3],
}
```

## Why pngx?

### Compared to Other Libraries

- **No Native Dependencies**: Unlike `sharp` or `canvas`, pngx works without compilation
- **TypeScript First**: Written in TypeScript with full type definitions
- **Lightweight**: Minimal bundle size for frontend and serverless use
- **Bun Optimized**: Designed for optimal performance with Bun runtime

### Use Cases

- **Image Processing**: Resize, crop, and manipulate PNG images
- **Thumbnail Generation**: Create thumbnails for uploaded images
- **Data Visualization**: Generate charts and graphs as PNG
- **Testing**: Create test images programmatically
- **Serverless**: Process images in edge functions

## Architecture

pngx follows the PNG specification (RFC 2083) and implements:

- **Parser**: Reads PNG chunks and validates structure
- **Packer**: Creates PNG chunks with proper CRC
- **Filters**: Implements all PNG filter types (None, Sub, Up, Average, Paeth)
- **Compression**: Uses zlib deflate/inflate for data compression

## Next Steps

- [Installation](/install) - Get pngx installed
- [Usage](/usage) - Learn the basic API
- [Configuration](/config) - Customize encoding options
- [PNG Encoding](/features/png-encoding) - Deep dive into encoding
