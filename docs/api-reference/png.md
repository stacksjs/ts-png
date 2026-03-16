# PNG Class

The `PNG` class is the main class for PNG image processing in the PNGX library. It provides methods for creating, reading, and manipulating PNG images.

## Constructor

```typescript
new PNG(options?: PNGOptions)
```

### Options

```typescript
interface PNGOptions {
  width?: number // Image width
  height?: number // Image height
  fill?: boolean // Whether to fill the image with zeros
  colorType?: number // Output color type
  inputColorType?: number // Input color type
  inputHasAlpha?: boolean // Whether input has alpha channel
  skipRescale?: boolean // Skip rescaling
  deflateLevel?: number // Deflate compression level (0-9)
  deflateStrategy?: number // Deflate compression strategy
  filterType?: number | number[] // Filter type(s)
  colorSpace?: string // Output color space
  inputColorSpace?: string // Input color space
  bgColor?: object // Background color
}
```

## Properties

### Instance Properties

- `width`: number - Image width
- `height`: number - Image height
- `data`: Buffer - Image data buffer
- `gamma`: number - Image gamma value
- `palette`: number[] - Color palette (if applicable)
- `colorType`: number - Color type
- `depth`: number - Bit depth
- `interlace`: boolean - Whether image is interlaced

## Methods

### parse(buffer: Buffer, callback: (err: Error or null, data: Buffer) => void): void

Parses a PNG buffer and populates the image data.

```typescript
png.parse(buffer, (err, data) => {
  if (err)
    throw err
  // Process data
})
```

### pack(): Readable

Packs the image data into a PNG buffer and returns a readable stream.

```typescript
png.pack().pipe(fs.createWriteStream('output.png'))
```

### bitblt(dst: PNG, srcX: number, srcY: number, width: number, height: number, deltaX: number, deltaY: number): void

Copies a rectangular region from this image to another image.

```typescript
source.bitblt(
  destination,
  0, // Source X
  0, // Source Y
  100, // Width
  100, // Height
  50, // Destination X
  50 // Destination Y
)
```

### adjustGamma(): void

Adjusts the gamma value of the image.

```typescript
png.adjustGamma()
```

## Events

The PNG class extends EventEmitter and emits the following events:

### metadata

Emitted when image metadata is parsed.

```typescript
png.on('metadata', (metadata: PNGMetadata) => {
  console.log('Image dimensions:', metadata.width, 'x', metadata.height)
})
```

### gamma

Emitted when gamma value is found.

```typescript
png.on('gamma', (gamma: number) => {
  console.log('Image gamma:', gamma)
})
```

### parsed

Emitted when image is fully parsed.

```typescript
png.on('parsed', () => {
  // Image is ready for processing
})
```

### error

Emitted when an error occurs.

```typescript
png.on('error', (err: Error) => {
  console.error('Error:', err)
})
```

## Example Usage

### Creating and Saving an Image

```typescript
import { createWriteStream } from 'node:fs'
import { PNG } from 'pngx'

// Create a new image
const png = new PNG({
  width: 100,
  height: 100,
  colorType: 6, // RGBA
  inputColorType: 6,
  inputHasAlpha: true
})

// Fill with a gradient
for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (y * png.width + x) * 4
    png.data[idx] = x // Red
    png.data[idx + 1] = y // Green
    png.data[idx + 2] = 0 // Blue
    png.data[idx + 3] = 255 // Alpha
  }
}

// Save the image
png.pack().pipe(createWriteStream('gradient.png'))
```

### Reading and Processing an Image

```typescript
import { readFile } from 'node:fs'
import { PNG } from 'pngx'

// Read an image
const buffer = await readFile('input.png')
const png = new PNG()

png.parse(buffer, (err, data) => {
  if (err)
    throw err

  // Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3
    data[i] = gray // Red
    data[i + 1] = gray // Green
    data[i + 2] = gray // Blue
    // Alpha remains unchanged
  }

  // Save the processed image
  png.pack().pipe(createWriteStream('grayscale.png'))
})
```

## Best Practices

1. **Memory Management**: Release image data when no longer needed
2. **Error Handling**: Always handle errors in callbacks
3. **Stream Processing**: Use streams for large images
4. **Type Safety**: Use TypeScript types for better development experience

## Next Steps

- Learn about [Synchronous Operations](/api-reference/pngsync)
- Explore the [Parser](/api-reference/parser) and [Packer](/api-reference/packer) utilities
- Check out [Advanced Topics](/advanced/buffer-management)
