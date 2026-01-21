# Metadata Handling

pngx supports reading and handling various PNG metadata chunks, including gamma, palette, and transparency information.

## PNG Chunks Overview

PNG files contain multiple chunks of data:

| Chunk | Type | Description |
|-------|------|-------------|
| IHDR | Critical | Image header (dimensions, color type) |
| PLTE | Critical* | Palette for indexed color images |
| IDAT | Critical | Image data (compressed pixels) |
| IEND | Critical | Image end marker |
| gAMA | Ancillary | Gamma correction value |
| tRNS | Ancillary | Transparency information |

## Reading Metadata

### Basic Metadata

```typescript
import { PNG } from 'pngx'
import { readFileSync } from 'fs'

const buffer = readFileSync('image.png')
const png = PNG.sync.read(buffer)

// Basic metadata from IHDR chunk
const metadata = {
  width: png.width,
  height: png.height,
  bitDepth: png.depth,
  colorType: png.colorType,
  interlace: png.interlace,
}

console.log('Image metadata:', metadata)
```

### Color Type Information

```typescript
function getColorTypeInfo(colorType: number) {
  const types: Record<number, { name: string, channels: number, hasAlpha: boolean }> = {
    0: { name: 'Grayscale', channels: 1, hasAlpha: false },
    2: { name: 'RGB', channels: 3, hasAlpha: false },
    3: { name: 'Indexed', channels: 1, hasAlpha: false },
    4: { name: 'Grayscale+Alpha', channels: 2, hasAlpha: true },
    6: { name: 'RGBA', channels: 4, hasAlpha: true },
  }

  return types[colorType] || { name: 'Unknown', channels: 0, hasAlpha: false }
}

const info = getColorTypeInfo(png.colorType)
console.log(`Format: ${info.name} (${info.channels} channels)`)
```

## Gamma Handling

### Reading Gamma

```typescript
const png = PNG.sync.read(buffer)

if (png.gamma) {
  console.log(`Gamma value: ${png.gamma}`)

  // Apply gamma correction
  const correctedData = applyGammaCorrection(png.data, png.gamma)
}
```

### Gamma Correction

```typescript
function applyGammaCorrection(data: Buffer, gamma: number): Buffer {
  const corrected = Buffer.alloc(data.length)
  const invGamma = 1 / gamma

  for (let i = 0; i < data.length; i += 4) {
    // Apply gamma to RGB, not alpha
    corrected[i] = Math.pow(data[i] / 255, invGamma) * 255
    corrected[i + 1] = Math.pow(data[i + 1] / 255, invGamma) * 255
    corrected[i + 2] = Math.pow(data[i + 2] / 255, invGamma) * 255
    corrected[i + 3] = data[i + 3] // Keep alpha unchanged
  }

  return corrected
}
```

### Writing Gamma

```typescript
import { PNG } from 'pngx'

const png = new PNG({ width: 100, height: 100 })

// Set gamma value
png.gamma = 2.2 // Standard sRGB gamma

// Fill data...
const buffer = PNG.sync.write(png)
```

## Palette Handling

### Reading Palette

```typescript
const png = PNG.sync.read(buffer)

if (png.colorType === 3 && png.palette) {
  console.log(`Palette size: ${png.palette.length} colors`)

  // Each palette entry is [R, G, B, A]
  png.palette.forEach((color, index) => {
    console.log(`Color ${index}: rgba(${color.join(', ')})`)
  })
}
```

### Converting Indexed to RGBA

```typescript
function paletteToRGBA(png: PNG): Buffer {
  if (png.colorType !== 3 || !png.palette) {
    throw new Error('Not an indexed color image')
  }

  const rgba = Buffer.alloc(png.width * png.height * 4)

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const srcIdx = y * png.width + x
      const dstIdx = srcIdx * 4
      const paletteIdx = png.data[srcIdx]
      const color = png.palette[paletteIdx]

      rgba[dstIdx] = color[0]     // R
      rgba[dstIdx + 1] = color[1] // G
      rgba[dstIdx + 2] = color[2] // B
      rgba[dstIdx + 3] = color[3] // A
    }
  }

  return rgba
}
```

## Transparency Handling

### Simple Transparency

For non-alpha images, transparency can be specified for specific colors:

```typescript
const png = PNG.sync.read(buffer)

// For grayscale (colorType 0) or RGB (colorType 2)
// Transparent color is stored separately

if (png.colorType === 0) {
  // Grayscale transparent value
  console.log('Transparent gray value defined')
}

if (png.colorType === 2) {
  // RGB transparent color
  console.log('Transparent RGB color defined')
}
```

### Palette Transparency

```typescript
function getPaletteWithTransparency(png: PNG) {
  if (png.colorType !== 3 || !png.palette) {
    return null
  }

  // Palette entries already include alpha from tRNS chunk
  return png.palette.map((color, index) => ({
    index,
    r: color[0],
    g: color[1],
    b: color[2],
    a: color[3],
    isTransparent: color[3] < 255,
  }))
}
```

## Image Information Summary

### Complete Metadata Function

```typescript
interface PNGMetadata {
  dimensions: { width: number, height: number }
  colorInfo: {
    type: string
    bitDepth: number
    channels: number
    hasAlpha: boolean
  }
  compression: {
    interlaced: boolean
  }
  palette?: {
    size: number
    hasTransparency: boolean
  }
  gamma?: number
  fileSize?: number
}

function getMetadata(buffer: Buffer): PNGMetadata {
  const png = PNG.sync.read(buffer)
  const colorInfo = getColorTypeInfo(png.colorType)

  const metadata: PNGMetadata = {
    dimensions: {
      width: png.width,
      height: png.height,
    },
    colorInfo: {
      type: colorInfo.name,
      bitDepth: png.depth,
      channels: colorInfo.channels,
      hasAlpha: colorInfo.hasAlpha,
    },
    compression: {
      interlaced: png.interlace,
    },
    fileSize: buffer.length,
  }

  if (png.gamma) {
    metadata.gamma = png.gamma
  }

  if (png.colorType === 3 && png.palette) {
    metadata.palette = {
      size: png.palette.length,
      hasTransparency: png.palette.some(c => c[3] < 255),
    }
  }

  return metadata
}
```

### Print Metadata

```typescript
function printMetadata(buffer: Buffer) {
  const meta = getMetadata(buffer)

  console.log('PNG Information:')
  console.log('================')
  console.log(`Dimensions: ${meta.dimensions.width} x ${meta.dimensions.height}`)
  console.log(`Color Type: ${meta.colorInfo.type}`)
  console.log(`Bit Depth: ${meta.colorInfo.bitDepth}`)
  console.log(`Channels: ${meta.colorInfo.channels}`)
  console.log(`Has Alpha: ${meta.colorInfo.hasAlpha}`)
  console.log(`Interlaced: ${meta.compression.interlaced}`)

  if (meta.gamma) {
    console.log(`Gamma: ${meta.gamma}`)
  }

  if (meta.palette) {
    console.log(`Palette: ${meta.palette.size} colors`)
    console.log(`Palette Transparency: ${meta.palette.hasTransparency}`)
  }

  console.log(`File Size: ${(meta.fileSize! / 1024).toFixed(2)} KB`)
}
```

## Streaming Metadata

Access metadata before full image is parsed:

```typescript
import { PNG } from 'pngx'
import { createReadStream } from 'fs'

const png = new PNG()

createReadStream('image.png')
  .pipe(png)
  .on('metadata', (metadata) => {
    // Called as soon as IHDR is parsed
    console.log('Early metadata:', metadata)

    // Can make decisions before full decode
    if (metadata.width > 10000 || metadata.height > 10000) {
      console.log('Image too large, aborting')
      this.destroy()
    }
  })
  .on('parsed', function() {
    // Full image data available
    console.log('Full parse complete')
  })
```

## Best Practices

1. **Check Color Type**: Always verify color type before processing
2. **Handle Gamma**: Apply gamma correction for accurate colors
3. **Preserve Metadata**: Copy metadata when transforming images
4. **Validate Palette**: Ensure palette exists for indexed images
5. **Use Streaming**: Access metadata early for large images

## Next Steps

- [PNG Encoding](/features/png-encoding) - Create PNG files
- [PNG Decoding](/features/png-decoding) - Read PNG files
- [Performance](/advanced/performance) - Optimize processing
