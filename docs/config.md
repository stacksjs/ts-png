# Configuration

pngx provides extensive configuration options for both encoding and decoding PNG images.

## Encoding Options

Configure PNG encoding with these options:

```typescript
import { PNG } from 'pngx'

const png = new PNG({
  // Image dimensions
  width: 100,
  height: 100,

  // Color settings
  colorType: 6,        // 0=grayscale, 2=RGB, 4=grayscale+alpha, 6=RGBA
  bitDepth: 8,         // 8 or 16 bits per channel
  inputColorType: 6,   // Input data color type
  inputHasAlpha: true, // Input data has alpha channel

  // Compression settings
  deflateLevel: 9,     // 0-9 (0=none, 9=best)
  deflateStrategy: 3,  // 0-4 (zlib strategies)
  deflateChunkSize: 32 * 1024, // Chunk size for compression

  // Other options
  filterType: -1,      // Filter type (-1=auto, 0-4=specific)
})
```

## Color Types

PNG supports several color types:

```typescript
// Color type constants
const ColorType = {
  GRAYSCALE: 0,       // Grayscale (1 channel)
  RGB: 2,             // RGB (3 channels)
  INDEXED: 3,         // Palette-based
  GRAYSCALE_ALPHA: 4, // Grayscale + Alpha (2 channels)
  RGBA: 6,            // RGBA (4 channels)
}

// Examples
const grayscale = new PNG({ width: 100, height: 100, colorType: 0 })
const rgb = new PNG({ width: 100, height: 100, colorType: 2 })
const rgba = new PNG({ width: 100, height: 100, colorType: 6 })
```

## Bit Depth

Control the precision of color values:

```typescript
// 8-bit (0-255 per channel) - default
const png8 = new PNG({
  width: 100,
  height: 100,
  bitDepth: 8,
})

// 16-bit (0-65535 per channel) - higher precision
const png16 = new PNG({
  width: 100,
  height: 100,
  bitDepth: 16,
})
```

## Compression Settings

Fine-tune compression for size vs. speed:

```typescript
// Maximum compression (smallest file, slowest)
const maxCompression = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 9,
  deflateStrategy: 3,
})

// No compression (largest file, fastest)
const noCompression = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 0,
})

// Balanced compression
const balanced = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 6,
  deflateStrategy: 1,
})
```

### Deflate Levels

| Level | Description |
|-------|-------------|
| 0 | No compression |
| 1 | Fastest compression |
| 6 | Default compression |
| 9 | Best compression |

### Deflate Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| 0 | Default | General use |
| 1 | Filtered | Filtered data |
| 2 | Huffman Only | Fast compression |
| 3 | RLE | Run-length encoding |
| 4 | Fixed | Fixed Huffman codes |

## Decoding Options

Configure PNG decoding:

```typescript
import { PNG } from 'pngx'

// With CRC checking (default)
const png = PNG.sync.read(buffer, {
  checkCRC: true,
})

// Skip CRC checking (faster)
const pngFast = PNG.sync.read(buffer, {
  checkCRC: false,
})
```

## Filter Types

PNG uses row filters for better compression:

```typescript
// Auto-select best filter per row
const autoFilter = new PNG({
  width: 100,
  height: 100,
  filterType: -1, // Auto
})

// Force specific filter
const subFilter = new PNG({
  width: 100,
  height: 100,
  filterType: 1, // Sub
})
```

### Filter Options

| Filter | Value | Description |
|--------|-------|-------------|
| Auto | -1 | Select best per row |
| None | 0 | No filtering |
| Sub | 1 | Difference from left |
| Up | 2 | Difference from above |
| Average | 3 | Average of left and above |
| Paeth | 4 | Paeth predictor |

## Complete Configuration Example

```typescript
import { PNG } from 'pngx'

// Production configuration for web images
const webConfig = {
  colorType: 6,          // RGBA for transparency support
  bitDepth: 8,           // Standard 8-bit color
  deflateLevel: 9,       // Maximum compression
  deflateStrategy: 3,    // RLE for typical images
  filterType: -1,        // Auto-select filters
}

// High-quality configuration for editing
const editConfig = {
  colorType: 6,
  bitDepth: 16,          // 16-bit for precision
  deflateLevel: 6,       // Balanced compression
  filterType: -1,
}

// Fast processing configuration
const fastConfig = {
  colorType: 6,
  bitDepth: 8,
  deflateLevel: 1,       // Minimal compression
  deflateStrategy: 2,    // Huffman only
  filterType: 0,         // No filtering
}

function createPNG(width: number, height: number, profile: 'web' | 'edit' | 'fast') {
  const configs = { web: webConfig, edit: editConfig, fast: fastConfig }
  return new PNG({ width, height, ...configs[profile] })
}
```

## Environment-Based Configuration

```typescript
const isProd = process.env.NODE_ENV === 'production'

const config = {
  deflateLevel: isProd ? 9 : 1,
  deflateStrategy: isProd ? 3 : 0,
}
```

## Next Steps

- [PNG Encoding](/features/png-encoding) - Advanced encoding techniques
- [Compression Levels](/features/compression-levels) - Detailed compression guide
- [Performance](/advanced/performance) - Optimization strategies
