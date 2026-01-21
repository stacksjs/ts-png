# PNG Decoding

pngx provides robust PNG decoding with support for all standard PNG formats and color types.

## Basic Decoding

### Synchronous Decoding

```typescript
import { PNG } from 'pngx'
import { readFileSync } from 'fs'

// Read file to buffer
const buffer = readFileSync('image.png')

// Decode PNG
const png = PNG.sync.read(buffer)

// Access image properties
console.log(`Dimensions: ${png.width}x${png.height}`)
console.log(`Color Type: ${png.colorType}`)
console.log(`Bit Depth: ${png.depth}`)
console.log(`Interlaced: ${png.interlace}`)

// Access pixel data
console.log(`Data size: ${png.data.length} bytes`)
```

### Asynchronous Decoding

```typescript
import { PNG } from 'pngx'
import { createReadStream } from 'fs'

const png = new PNG()

createReadStream('image.png')
  .pipe(png)
  .on('metadata', (metadata) => {
    console.log('Image metadata:', metadata)
  })
  .on('parsed', function() {
    console.log(`Loaded: ${this.width}x${this.height}`)
    // Process pixel data
  })
  .on('error', (error) => {
    console.error('Decode error:', error)
  })
```

## Decoding Options

### CRC Checking

```typescript
// With CRC validation (default, slower)
const validated = PNG.sync.read(buffer, {
  checkCRC: true,
})

// Skip CRC validation (faster)
const fast = PNG.sync.read(buffer, {
  checkCRC: false,
})
```

## Accessing Image Data

### Metadata Properties

```typescript
const png = PNG.sync.read(buffer)

// Image dimensions
const width = png.width   // Width in pixels
const height = png.height // Height in pixels

// Color information
const colorType = png.colorType // 0, 2, 3, 4, or 6
const bitDepth = png.depth      // 1, 2, 4, 8, or 16

// Additional metadata
const interlaced = png.interlace // Adam7 interlacing
const gamma = png.gamma          // Gamma value (if set)
const palette = png.palette      // Palette colors (type 3)
```

### Color Type Details

| colorType | Description | Channels |
|-----------|-------------|----------|
| 0 | Grayscale | 1 |
| 2 | RGB | 3 |
| 3 | Indexed (Palette) | 1 |
| 4 | Grayscale + Alpha | 2 |
| 6 | RGBA | 4 |

### Pixel Data Access

```typescript
const png = PNG.sync.read(buffer)

// For RGBA images (colorType 6)
function getPixel(png: PNG, x: number, y: number) {
  const idx = (png.width * y + x) * 4
  return {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
    a: png.data[idx + 3],
  }
}

// Get specific pixel
const pixel = getPixel(png, 10, 20)
console.log(`RGBA: ${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a}`)
```

## Handling Different Color Types

### Grayscale

```typescript
function decodeGrayscale(png: PNG) {
  if (png.colorType !== 0) {
    throw new Error('Not a grayscale image')
  }

  const pixels = []
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = y * png.width + x
      pixels.push(png.data[idx])
    }
  }
  return pixels
}
```

### Indexed (Palette)

```typescript
function decodePalette(png: PNG) {
  if (png.colorType !== 3) {
    throw new Error('Not a palette image')
  }

  const palette = png.palette // Array of [R, G, B, A]
  const pixels = []

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = y * png.width + x
      const paletteIndex = png.data[idx]
      const color = palette[paletteIndex]
      pixels.push(color)
    }
  }

  return pixels
}
```

### Converting to RGBA

```typescript
function toRGBA(png: PNG): Buffer {
  const rgba = Buffer.alloc(png.width * png.height * 4)

  switch (png.colorType) {
    case 0: // Grayscale
      for (let i = 0; i < png.data.length; i++) {
        const idx = i * 4
        rgba[idx] = png.data[i]
        rgba[idx + 1] = png.data[i]
        rgba[idx + 2] = png.data[i]
        rgba[idx + 3] = 255
      }
      break

    case 2: // RGB
      for (let i = 0; i < png.data.length / 3; i++) {
        const srcIdx = i * 3
        const dstIdx = i * 4
        rgba[dstIdx] = png.data[srcIdx]
        rgba[dstIdx + 1] = png.data[srcIdx + 1]
        rgba[dstIdx + 2] = png.data[srcIdx + 2]
        rgba[dstIdx + 3] = 255
      }
      break

    case 6: // RGBA
      png.data.copy(rgba)
      break
  }

  return rgba
}
```

## Image Analysis

### Get Image Statistics

```typescript
function analyzeImage(png: PNG) {
  let minR = 255, maxR = 0
  let minG = 255, maxG = 0
  let minB = 255, maxB = 0
  let totalR = 0, totalG = 0, totalB = 0

  const pixelCount = png.width * png.height

  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i]
    const g = png.data[i + 1]
    const b = png.data[i + 2]

    minR = Math.min(minR, r)
    maxR = Math.max(maxR, r)
    minG = Math.min(minG, g)
    maxG = Math.max(maxG, g)
    minB = Math.min(minB, b)
    maxB = Math.max(maxB, b)

    totalR += r
    totalG += g
    totalB += b
  }

  return {
    dimensions: { width: png.width, height: png.height },
    range: {
      r: { min: minR, max: maxR },
      g: { min: minG, max: maxG },
      b: { min: minB, max: maxB },
    },
    average: {
      r: Math.round(totalR / pixelCount),
      g: Math.round(totalG / pixelCount),
      b: Math.round(totalB / pixelCount),
    },
  }
}
```

### Check Transparency

```typescript
function hasTransparency(png: PNG): boolean {
  if (png.colorType !== 4 && png.colorType !== 6) {
    return false // No alpha channel
  }

  const step = png.colorType === 4 ? 2 : 4
  const alphaOffset = step - 1

  for (let i = alphaOffset; i < png.data.length; i += step) {
    if (png.data[i] < 255) {
      return true
    }
  }

  return false
}
```

## Validation

### Validate PNG Structure

```typescript
function validatePNG(buffer: Buffer): { valid: boolean, error?: string } {
  try {
    const png = PNG.sync.read(buffer, { checkCRC: true })

    // Basic validation
    if (png.width <= 0 || png.height <= 0) {
      return { valid: false, error: 'Invalid dimensions' }
    }

    if (![0, 2, 3, 4, 6].includes(png.colorType)) {
      return { valid: false, error: 'Invalid color type' }
    }

    if (![1, 2, 4, 8, 16].includes(png.depth)) {
      return { valid: false, error: 'Invalid bit depth' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}
```

### Check File Signature

```typescript
function isPNG(buffer: Buffer): boolean {
  const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]

  if (buffer.length < signature.length) {
    return false
  }

  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false
    }
  }

  return true
}
```

## Error Handling

```typescript
import { PNG } from 'pngx'

function safeRead(buffer: Buffer) {
  try {
    return {
      success: true,
      png: PNG.sync.read(buffer),
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}

// Usage
const result = safeRead(buffer)
if (result.success) {
  console.log(`Image: ${result.png.width}x${result.png.height}`)
} else {
  console.error(`Failed to decode: ${result.error}`)
}
```

## Batch Decoding

```typescript
import { PNG } from 'pngx'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

function decodeDirectory(dir: string) {
  const files = readdirSync(dir).filter(f => f.endsWith('.png'))
  const results = []

  for (const file of files) {
    const path = join(dir, file)
    const buffer = readFileSync(path)

    try {
      const png = PNG.sync.read(buffer)
      results.push({
        file,
        width: png.width,
        height: png.height,
        colorType: png.colorType,
        size: buffer.length,
      })
    } catch (error) {
      results.push({
        file,
        error: error.message,
      })
    }
  }

  return results
}
```

## Best Practices

1. **Skip CRC in Production**: Use `checkCRC: false` for trusted sources
2. **Handle All Color Types**: Support different formats for flexibility
3. **Validate Before Processing**: Check dimensions and format before manipulation
4. **Use Streaming for Large Files**: Avoid memory issues with large images
5. **Cache Decoded Images**: Reuse decoded data when possible

## Next Steps

- [Compression Levels](/features/compression-levels) - Understand compression
- [Metadata Handling](/features/metadata-handling) - Work with PNG metadata
- [Performance](/advanced/performance) - Optimize decoding speed
