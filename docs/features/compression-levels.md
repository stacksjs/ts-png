# Compression Levels

pngx provides fine-grained control over PNG compression, allowing you to optimize for file size or encoding speed.

## Compression Overview

PNG compression uses the DEFLATE algorithm with optional row filtering:

```
Raw Pixels → Filter → DEFLATE → PNG File
```

Both filtering and deflate level affect final file size and encoding time.

## Deflate Levels

### Level Reference

| Level | Speed | Size | Use Case |
|-------|-------|------|----------|
| 0 | Fastest | Largest | No compression, debugging |
| 1 | Very Fast | Large | Quick previews |
| 3 | Fast | Medium-Large | Development |
| 6 | Balanced | Medium | Default, general use |
| 9 | Slowest | Smallest | Production, archival |

### Configuration

```typescript
import { PNG } from 'pngx'

// No compression (fastest, largest files)
const noCompress = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 0,
})

// Fast compression
const fast = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 1,
})

// Default compression
const balanced = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 6,
})

// Maximum compression (slowest, smallest files)
const maxCompress = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 9,
})
```

## Deflate Strategies

Strategies affect how the compressor handles data patterns:

### Strategy Reference

| Strategy | Value | Description | Best For |
|----------|-------|-------------|----------|
| Default | 0 | Balanced approach | General images |
| Filtered | 1 | Assumes filtered data | PNG with filters |
| Huffman | 2 | Huffman encoding only | Fast compression |
| RLE | 3 | Run-length encoding | Images with runs |
| Fixed | 4 | Fixed Huffman codes | Deterministic output |

### Configuration

```typescript
// Default strategy
const defaultStrategy = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 9,
  deflateStrategy: 0,
})

// RLE strategy (good for cartoons, screenshots)
const rleStrategy = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 9,
  deflateStrategy: 3,
})

// Huffman only (faster)
const huffmanStrategy = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 6,
  deflateStrategy: 2,
})
```

## Row Filters

Filters preprocess pixel data for better compression:

### Filter Types

| Filter | Value | Description | Best For |
|--------|-------|-------------|----------|
| None | 0 | No filtering | Fast encoding |
| Sub | 1 | Difference from left | Horizontal gradients |
| Up | 2 | Difference from above | Vertical gradients |
| Average | 3 | Average prediction | Mixed patterns |
| Paeth | 4 | Paeth predictor | Photos, complex images |
| Auto | -1 | Select best per row | Best compression |

### Configuration

```typescript
// No filtering (fastest)
const noFilter = new PNG({
  width: 100,
  height: 100,
  filterType: 0,
})

// Auto-select (best compression)
const autoFilter = new PNG({
  width: 100,
  height: 100,
  filterType: -1,
})

// Paeth filter (good for photos)
const paethFilter = new PNG({
  width: 100,
  height: 100,
  filterType: 4,
})
```

## Compression Profiles

### Web Optimized

```typescript
const webProfile = {
  deflateLevel: 9,
  deflateStrategy: 3,
  filterType: -1,
  colorType: 6,
  bitDepth: 8,
}

const webPng = new PNG({
  width: 100,
  height: 100,
  ...webProfile,
})
```

### Development/Preview

```typescript
const devProfile = {
  deflateLevel: 1,
  deflateStrategy: 2,
  filterType: 0,
  colorType: 6,
  bitDepth: 8,
}

const devPng = new PNG({
  width: 100,
  height: 100,
  ...devProfile,
})
```

### High Quality

```typescript
const hqProfile = {
  deflateLevel: 9,
  deflateStrategy: 0,
  filterType: -1,
  colorType: 6,
  bitDepth: 16,
}

const hqPng = new PNG({
  width: 100,
  height: 100,
  ...hqProfile,
})
```

### Archive/Minimal Size

```typescript
const archiveProfile = {
  deflateLevel: 9,
  deflateStrategy: 3,
  filterType: -1,
  deflateChunkSize: 64 * 1024,
}
```

## Benchmarking Compression

### Compare Configurations

```typescript
import { PNG } from 'pngx'

interface CompressionResult {
  level: number
  strategy: number
  filter: number
  size: number
  time: number
}

function benchmarkCompression(width: number, height: number, data: Buffer): CompressionResult[] {
  const results: CompressionResult[] = []

  const levels = [0, 1, 6, 9]
  const strategies = [0, 2, 3]
  const filters = [-1, 0, 4]

  for (const level of levels) {
    for (const strategy of strategies) {
      for (const filter of filters) {
        const png = new PNG({
          width,
          height,
          deflateLevel: level,
          deflateStrategy: strategy,
          filterType: filter,
        })

        data.copy(png.data)

        const start = performance.now()
        const buffer = PNG.sync.write(png)
        const time = performance.now() - start

        results.push({
          level,
          strategy,
          filter,
          size: buffer.length,
          time,
        })
      }
    }
  }

  return results.sort((a, b) => a.size - b.size)
}
```

### Find Optimal Settings

```typescript
function findOptimal(width: number, height: number, data: Buffer, maxTime: number) {
  const results = benchmarkCompression(width, height, data)

  // Filter by time constraint
  const acceptable = results.filter(r => r.time <= maxTime)

  // Return smallest within time budget
  return acceptable[0] || results[0]
}
```

## Compression Tips

### By Image Type

```typescript
function getProfileForImage(type: 'photo' | 'screenshot' | 'icon' | 'gradient') {
  switch (type) {
    case 'photo':
      return {
        deflateLevel: 9,
        deflateStrategy: 0,
        filterType: 4, // Paeth
      }

    case 'screenshot':
      return {
        deflateLevel: 9,
        deflateStrategy: 3, // RLE
        filterType: -1,
      }

    case 'icon':
      return {
        deflateLevel: 9,
        deflateStrategy: 3,
        filterType: -1,
        colorType: 6, // Preserve alpha
      }

    case 'gradient':
      return {
        deflateLevel: 9,
        deflateStrategy: 1, // Filtered
        filterType: 1, // Sub filter
      }
  }
}
```

### Adaptive Compression

```typescript
function adaptiveCompress(png: PNG) {
  // Analyze image content
  const hasTransparency = checkTransparency(png)
  const isPhotographic = detectPhotographic(png)
  const hasGradients = detectGradients(png)

  if (isPhotographic) {
    return { deflateLevel: 9, filterType: 4 }
  }

  if (hasGradients) {
    return { deflateLevel: 9, filterType: 1 }
  }

  // Default for graphics
  return { deflateLevel: 9, filterType: -1, deflateStrategy: 3 }
}
```

## Chunk Size

Adjust deflate chunk size for memory/speed tradeoff:

```typescript
// Smaller chunks (less memory)
const smallChunks = new PNG({
  width: 100,
  height: 100,
  deflateChunkSize: 16 * 1024, // 16KB
})

// Larger chunks (faster for large images)
const largeChunks = new PNG({
  width: 1000,
  height: 1000,
  deflateChunkSize: 64 * 1024, // 64KB
})
```

## Best Practices

1. **Use Level 9 for Production**: Maximum compression for deployed assets
2. **Use Level 1 for Development**: Fast feedback during development
3. **Enable Auto Filtering**: Usually produces best results
4. **Test Your Images**: Different images compress differently
5. **Consider Use Case**: Balance size vs. encode time for your needs

## Next Steps

- [Metadata Handling](/features/metadata-handling) - Add metadata to PNGs
- [Performance](/advanced/performance) - Optimize encoding speed
- [Custom Profiles](/advanced/custom-profiles) - Create custom configurations
