# Usage

pngx provides both synchronous and asynchronous APIs for encoding and decoding PNG images.

## Basic API

### Creating a PNG

```typescript
import { PNG } from 'pngx'

// Create a new PNG with specified dimensions
const png = new PNG({
  width: 200,
  height: 100,
})

// Access pixel data (RGBA format)
// Each pixel is 4 bytes: Red, Green, Blue, Alpha
for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2

    png.data[idx] = x % 256     // Red
    png.data[idx + 1] = y % 256 // Green
    png.data[idx + 2] = 128     // Blue
    png.data[idx + 3] = 255     // Alpha (fully opaque)
  }
}
```

### Synchronous API

```typescript
import { PNG } from 'pngx'
import { readFileSync, writeFileSync } from 'fs'

// Reading PNG synchronously
const buffer = readFileSync('input.png')
const png = PNG.sync.read(buffer)

console.log(`Dimensions: ${png.width}x${png.height}`)
console.log(`Color Type: ${png.colorType}`)
console.log(`Bit Depth: ${png.depth}`)

// Writing PNG synchronously
const outputBuffer = PNG.sync.write(png)
writeFileSync('output.png', outputBuffer)
```

### Asynchronous API

```typescript
import { PNG } from 'pngx'
import { createReadStream, createWriteStream } from 'fs'

// Reading PNG asynchronously with streams
const png = new PNG()

createReadStream('input.png')
  .pipe(png)
  .on('parsed', function() {
    console.log(`Loaded: ${this.width}x${this.height}`)

    // Modify the image
    for (let i = 0; i < this.data.length; i += 4) {
      // Invert colors
      this.data[i] = 255 - this.data[i]
      this.data[i + 1] = 255 - this.data[i + 1]
      this.data[i + 2] = 255 - this.data[i + 2]
    }

    // Write modified image
    this.pack().pipe(createWriteStream('inverted.png'))
  })
```

## Pixel Data Format

PNG pixel data is stored in RGBA format:

```typescript
// Pixel at position (x, y)
const idx = (width * y + x) * 4

const r = data[idx]     // Red: 0-255
const g = data[idx + 1] // Green: 0-255
const b = data[idx + 2] // Blue: 0-255
const a = data[idx + 3] // Alpha: 0-255 (0=transparent, 255=opaque)
```

### Setting Pixels

```typescript
function setPixel(png: PNG, x: number, y: number, r: number, g: number, b: number, a: number = 255) {
  const idx = (png.width * y + x) * 4
  png.data[idx] = r
  png.data[idx + 1] = g
  png.data[idx + 2] = b
  png.data[idx + 3] = a
}

// Usage
setPixel(png, 10, 20, 255, 0, 0)       // Red pixel
setPixel(png, 11, 20, 0, 255, 0)       // Green pixel
setPixel(png, 12, 20, 0, 0, 255, 128)  // Semi-transparent blue
```

### Getting Pixels

```typescript
function getPixel(png: PNG, x: number, y: number) {
  const idx = (png.width * y + x) * 4
  return {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
    a: png.data[idx + 3],
  }
}

// Usage
const pixel = getPixel(png, 10, 20)
console.log(`RGBA: ${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a}`)
```

## Common Operations

### Creating Solid Color Image

```typescript
import { PNG } from 'pngx'

function createSolidColor(width: number, height: number, r: number, g: number, b: number, a: number = 255) {
  const png = new PNG({ width, height })

  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = r
    png.data[i + 1] = g
    png.data[i + 2] = b
    png.data[i + 3] = a
  }

  return png
}

const redSquare = createSolidColor(100, 100, 255, 0, 0)
const buffer = PNG.sync.write(redSquare)
```

### Creating Gradient

```typescript
import { PNG } from 'pngx'

function createGradient(width: number, height: number) {
  const png = new PNG({ width, height })

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) * 4

      // Horizontal gradient: black to white
      const value = Math.floor((x / width) * 255)

      png.data[idx] = value     // R
      png.data[idx + 1] = value // G
      png.data[idx + 2] = value // B
      png.data[idx + 3] = 255   // A
    }
  }

  return png
}
```

### Copying Image Region

```typescript
function copyRegion(
  src: PNG,
  dst: PNG,
  srcX: number, srcY: number,
  dstX: number, dstY: number,
  width: number, height: number
) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (src.width * (srcY + y) + (srcX + x)) * 4
      const dstIdx = (dst.width * (dstY + y) + (dstX + x)) * 4

      dst.data[dstIdx] = src.data[srcIdx]
      dst.data[dstIdx + 1] = src.data[srcIdx + 1]
      dst.data[dstIdx + 2] = src.data[srcIdx + 2]
      dst.data[dstIdx + 3] = src.data[srcIdx + 3]
    }
  }
}
```

### Converting to Grayscale

```typescript
function toGrayscale(png: PNG) {
  for (let i = 0; i < png.data.length; i += 4) {
    // Luminosity method
    const gray = Math.floor(
      png.data[i] * 0.299 +
      png.data[i + 1] * 0.587 +
      png.data[i + 2] * 0.114
    )

    png.data[i] = gray
    png.data[i + 1] = gray
    png.data[i + 2] = gray
    // Keep alpha unchanged
  }

  return png
}
```

## Error Handling

```typescript
import { PNG } from 'pngx'

// Synchronous error handling
try {
  const png = PNG.sync.read(invalidBuffer)
} catch (error) {
  console.error('Failed to read PNG:', error.message)
}

// Asynchronous error handling
const png = new PNG()

createReadStream('image.png')
  .pipe(png)
  .on('error', (error) => {
    console.error('Stream error:', error.message)
  })
  .on('parsed', function() {
    console.log('Successfully parsed')
  })
```

## PNG Properties

After parsing, PNG objects have these properties:

```typescript
interface PNG {
  width: number        // Image width in pixels
  height: number       // Image height in pixels
  data: Buffer         // Raw pixel data (RGBA)
  depth: number        // Bit depth (1, 2, 4, 8, 16)
  colorType: number    // PNG color type
  interlace: boolean   // Adam7 interlacing
  gamma: number        // Gamma value
  palette: Color[]     // Palette colors (for indexed images)
}
```

## Next Steps

- [Configuration](/config) - Customize encoding options
- [PNG Encoding](/features/png-encoding) - Advanced encoding techniques
- [PNG Decoding](/features/png-decoding) - Advanced decoding options
- [Compression Levels](/features/compression-levels) - Optimize file size
