# PNG Encoding

pngx provides powerful PNG encoding capabilities with full control over compression, color types, and output quality.

## Basic Encoding

### Create and Encode

```typescript
import { PNG } from 'pngx'
import { writeFileSync } from 'fs'

// Create PNG with dimensions
const png = new PNG({
  width: 200,
  height: 100,
})

// Fill with data
for (let i = 0; i < png.data.length; i += 4) {
  png.data[i] = 255     // Red
  png.data[i + 1] = 128 // Green
  png.data[i + 2] = 64  // Blue
  png.data[i + 3] = 255 // Alpha
}

// Synchronous encoding
const buffer = PNG.sync.write(png)
writeFileSync('output.png', buffer)
```

### Streaming Encoding

```typescript
import { PNG } from 'pngx'
import { createWriteStream } from 'fs'

const png = new PNG({ width: 100, height: 100 })

// Fill pixel data
for (let i = 0; i < png.data.length; i += 4) {
  png.data[i] = Math.random() * 255
  png.data[i + 1] = Math.random() * 255
  png.data[i + 2] = Math.random() * 255
  png.data[i + 3] = 255
}

// Stream to file
png.pack().pipe(createWriteStream('random.png'))
```

## Color Type Options

### Grayscale (Type 0)

```typescript
const grayscale = new PNG({
  width: 100,
  height: 100,
  colorType: 0, // Grayscale
  inputColorType: 0,
  inputHasAlpha: false,
})

// Single channel per pixel
for (let y = 0; y < 100; y++) {
  for (let x = 0; x < 100; x++) {
    const idx = y * 100 + x
    grayscale.data[idx] = (x + y) % 256
  }
}
```

### RGB (Type 2)

```typescript
const rgb = new PNG({
  width: 100,
  height: 100,
  colorType: 2, // RGB
  inputColorType: 2,
  inputHasAlpha: false,
})

// Three channels per pixel
for (let y = 0; y < 100; y++) {
  for (let x = 0; x < 100; x++) {
    const idx = (y * 100 + x) * 3
    rgb.data[idx] = x % 256     // R
    rgb.data[idx + 1] = y % 256 // G
    rgb.data[idx + 2] = 128     // B
  }
}
```

### RGBA (Type 6)

```typescript
const rgba = new PNG({
  width: 100,
  height: 100,
  colorType: 6, // RGBA (default)
})

// Four channels per pixel
for (let y = 0; y < 100; y++) {
  for (let x = 0; x < 100; x++) {
    const idx = (y * 100 + x) * 4
    rgba.data[idx] = x % 256     // R
    rgba.data[idx + 1] = y % 256 // G
    rgba.data[idx + 2] = 128     // B
    rgba.data[idx + 3] = 255     // A
  }
}
```

### Grayscale with Alpha (Type 4)

```typescript
const grayAlpha = new PNG({
  width: 100,
  height: 100,
  colorType: 4, // Grayscale + Alpha
  inputColorType: 4,
  inputHasAlpha: true,
})

// Two channels per pixel
for (let y = 0; y < 100; y++) {
  for (let x = 0; x < 100; x++) {
    const idx = (y * 100 + x) * 2
    grayAlpha.data[idx] = (x + y) % 256     // Gray
    grayAlpha.data[idx + 1] = 255 - x % 256 // Alpha
  }
}
```

## Bit Depth

### 8-bit Encoding

```typescript
const png8 = new PNG({
  width: 100,
  height: 100,
  bitDepth: 8, // 0-255 per channel
})

// Values 0-255
png8.data[0] = 128
```

### 16-bit Encoding

```typescript
const png16 = new PNG({
  width: 100,
  height: 100,
  bitDepth: 16, // 0-65535 per channel
})

// Higher precision values
// Data is stored as 16-bit values
for (let i = 0; i < png16.data.length; i += 8) {
  // Each channel is 2 bytes
  png16.data.writeUInt16BE(32768, i)     // R
  png16.data.writeUInt16BE(32768, i + 2) // G
  png16.data.writeUInt16BE(32768, i + 4) // B
  png16.data.writeUInt16BE(65535, i + 6) // A
}
```

## Compression Control

### Maximum Compression

```typescript
const compressed = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 9,      // Maximum compression
  deflateStrategy: 3,   // RLE strategy
  filterType: -1,       // Auto-select filters
})
```

### Fast Encoding

```typescript
const fast = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 1,      // Minimal compression
  deflateStrategy: 2,   // Huffman only
  filterType: 0,        // No filtering
})
```

### Custom Compression

```typescript
import { createDeflate } from 'zlib'

const custom = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 6,
  deflateStrategy: 1,
  deflateChunkSize: 64 * 1024, // Larger chunks
  deflateFactory: createDeflate, // Custom deflate implementation
})
```

## Filter Types

Filters improve compression by preprocessing pixel data:

```typescript
// No filter (fastest, worst compression)
const noFilter = new PNG({
  width: 100,
  height: 100,
  filterType: 0,
})

// Sub filter (good for horizontal patterns)
const subFilter = new PNG({
  width: 100,
  height: 100,
  filterType: 1,
})

// Up filter (good for vertical patterns)
const upFilter = new PNG({
  width: 100,
  height: 100,
  filterType: 2,
})

// Average filter (balanced)
const avgFilter = new PNG({
  width: 100,
  height: 100,
  filterType: 3,
})

// Paeth filter (best for photos)
const paethFilter = new PNG({
  width: 100,
  height: 100,
  filterType: 4,
})

// Auto-select (best results, slowest)
const autoFilter = new PNG({
  width: 100,
  height: 100,
  filterType: -1,
})
```

## Image Generation Examples

### Checkerboard Pattern

```typescript
import { PNG } from 'pngx'

function createCheckerboard(size: number, squareSize: number) {
  const png = new PNG({ width: size, height: size })

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const isWhite = ((Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2) === 0

      png.data[idx] = isWhite ? 255 : 0
      png.data[idx + 1] = isWhite ? 255 : 0
      png.data[idx + 2] = isWhite ? 255 : 0
      png.data[idx + 3] = 255
    }
  }

  return PNG.sync.write(png)
}
```

### Color Wheel

```typescript
import { PNG } from 'pngx'

function createColorWheel(size: number) {
  const png = new PNG({ width: size, height: size })
  const center = size / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - center
      const dy = y - center
      const distance = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)

      if (distance <= center) {
        // HSL to RGB conversion
        const hue = (angle + Math.PI) / (2 * Math.PI)
        const saturation = distance / center
        const lightness = 0.5

        const [r, g, b] = hslToRgb(hue, saturation, lightness)
        png.data[idx] = r
        png.data[idx + 1] = g
        png.data[idx + 2] = b
        png.data[idx + 3] = 255
      } else {
        // Transparent outside circle
        png.data[idx + 3] = 0
      }
    }
  }

  return PNG.sync.write(png)
}
```

### Noise Texture

```typescript
import { PNG } from 'pngx'

function createNoise(width: number, height: number) {
  const png = new PNG({ width, height })

  for (let i = 0; i < png.data.length; i += 4) {
    const value = Math.floor(Math.random() * 256)
    png.data[i] = value
    png.data[i + 1] = value
    png.data[i + 2] = value
    png.data[i + 3] = 255
  }

  return PNG.sync.write(png)
}
```

## Batch Encoding

```typescript
import { PNG } from 'pngx'
import { writeFileSync } from 'fs'

async function encodeMultiple(images: Array<{ name: string, data: Buffer, width: number, height: number }>) {
  const results = []

  for (const image of images) {
    const png = new PNG({ width: image.width, height: image.height })
    image.data.copy(png.data)

    const buffer = PNG.sync.write(png)
    writeFileSync(image.name, buffer)

    results.push({
      name: image.name,
      size: buffer.length,
    })
  }

  return results
}
```

## Best Practices

1. **Choose Appropriate Color Type**: Use grayscale for single-channel images
2. **Use Auto Filtering**: Let pngx select optimal filters with `filterType: -1`
3. **Balance Compression**: Use level 6 for good balance, 9 for smallest files
4. **Stream Large Images**: Use streaming API for images > 10MB
5. **Profile First**: Test different settings to find optimal configuration

## Next Steps

- [PNG Decoding](/features/png-decoding) - Read and parse PNG files
- [Compression Levels](/features/compression-levels) - Optimize file size
- [Performance](/advanced/performance) - Speed optimization
