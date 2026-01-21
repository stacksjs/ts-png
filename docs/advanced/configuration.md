# Advanced Configuration

This guide covers advanced configuration options for pngx, including programmatic configuration, custom compression settings, and integration patterns.

## Complete Configuration Reference

```typescript
import { PNG } from 'pngx'

interface PNGOptions {
  // Dimensions
  width?: number
  height?: number

  // Color Settings
  colorType?: 0 | 2 | 3 | 4 | 6
  bitDepth?: 8 | 16
  inputColorType?: 0 | 2 | 4 | 6
  inputHasAlpha?: boolean

  // Compression
  deflateLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  deflateStrategy?: 0 | 1 | 2 | 3 | 4
  deflateChunkSize?: number
  deflateFactory?: typeof createDeflate

  // Filtering
  filterType?: -1 | 0 | 1 | 2 | 3 | 4

  // Decoding
  checkCRC?: boolean
}
```

## Color Configuration

### Input Color Type Mapping

When creating a PNG, specify how your input data is formatted:

```typescript
// Input is RGBA, output is RGBA
const rgbaToRgba = new PNG({
  width: 100,
  height: 100,
  colorType: 6,
  inputColorType: 6,
  inputHasAlpha: true,
})

// Input is RGB (no alpha), output is RGB
const rgbToRgb = new PNG({
  width: 100,
  height: 100,
  colorType: 2,
  inputColorType: 2,
  inputHasAlpha: false,
})

// Input is RGBA, output is RGB (alpha stripped)
const rgbaToRgb = new PNG({
  width: 100,
  height: 100,
  colorType: 2,
  inputColorType: 6,
  inputHasAlpha: true,
})
```

### Color Type Conversion

```typescript
function createWithColorType(
  data: Buffer,
  width: number,
  height: number,
  inputType: number,
  outputType: number
) {
  const inputHasAlpha = inputType === 4 || inputType === 6

  const png = new PNG({
    width,
    height,
    colorType: outputType,
    inputColorType: inputType,
    inputHasAlpha,
  })

  data.copy(png.data)
  return PNG.sync.write(png)
}
```

## Compression Configuration

### Custom Deflate Factory

Use a custom deflate implementation:

```typescript
import { createDeflate, createDeflateRaw } from 'zlib'

// Custom deflate with specific options
function customDeflateFactory(options: any) {
  return createDeflate({
    ...options,
    memLevel: 9,       // Maximum memory for better compression
    windowBits: 15,    // Maximum window size
  })
}

const png = new PNG({
  width: 100,
  height: 100,
  deflateFactory: customDeflateFactory,
  deflateLevel: 9,
})
```

### Memory-Optimized Configuration

For memory-constrained environments:

```typescript
const memoryOptimized = new PNG({
  width: 100,
  height: 100,
  deflateChunkSize: 8 * 1024,  // Smaller chunks
  deflateLevel: 6,             // Balanced compression
  deflateStrategy: 2,          // Huffman only (less memory)
})
```

### Speed-Optimized Configuration

For fastest encoding:

```typescript
const speedOptimized = new PNG({
  width: 100,
  height: 100,
  deflateLevel: 1,
  deflateStrategy: 2,
  filterType: 0,  // No filtering
  deflateChunkSize: 64 * 1024,  // Larger chunks
})
```

## Configuration Profiles

### Profile Manager

```typescript
type ProfileName = 'web' | 'print' | 'thumbnail' | 'archive' | 'fast'

interface CompressionProfile {
  deflateLevel: number
  deflateStrategy: number
  filterType: number
  bitDepth: 8 | 16
  colorType: number
}

const profiles: Record<ProfileName, CompressionProfile> = {
  web: {
    deflateLevel: 9,
    deflateStrategy: 3,
    filterType: -1,
    bitDepth: 8,
    colorType: 6,
  },
  print: {
    deflateLevel: 9,
    deflateStrategy: 0,
    filterType: -1,
    bitDepth: 16,
    colorType: 6,
  },
  thumbnail: {
    deflateLevel: 6,
    deflateStrategy: 3,
    filterType: 0,
    bitDepth: 8,
    colorType: 6,
  },
  archive: {
    deflateLevel: 9,
    deflateStrategy: 0,
    filterType: -1,
    bitDepth: 16,
    colorType: 6,
  },
  fast: {
    deflateLevel: 1,
    deflateStrategy: 2,
    filterType: 0,
    bitDepth: 8,
    colorType: 6,
  },
}

function createPNGWithProfile(
  width: number,
  height: number,
  profile: ProfileName
): PNG {
  return new PNG({
    width,
    height,
    ...profiles[profile],
  })
}
```

### Environment-Based Configuration

```typescript
function getConfig() {
  const isProd = process.env.NODE_ENV === 'production'
  const isCI = process.env.CI === 'true'

  return {
    deflateLevel: isProd ? 9 : 1,
    deflateStrategy: isProd ? 3 : 0,
    filterType: isProd ? -1 : 0,
    checkCRC: !isCI, // Skip CRC in CI for speed
  }
}
```

## Decoding Configuration

### CRC Validation

```typescript
// Strict mode (default)
const strict = PNG.sync.read(buffer, {
  checkCRC: true,
})

// Lenient mode (faster, trusts input)
const lenient = PNG.sync.read(buffer, {
  checkCRC: false,
})

// Conditional based on source
function readPNG(buffer: Buffer, trusted: boolean) {
  return PNG.sync.read(buffer, {
    checkCRC: !trusted,
  })
}
```

## Dynamic Configuration

### Based on Image Properties

```typescript
function getOptimalConfig(width: number, height: number) {
  const pixelCount = width * height
  const megapixels = pixelCount / 1_000_000

  if (megapixels > 10) {
    // Large image: prioritize memory
    return {
      deflateLevel: 6,
      deflateChunkSize: 16 * 1024,
      filterType: 0,
    }
  }

  if (megapixels < 0.1) {
    // Small image: prioritize compression
    return {
      deflateLevel: 9,
      deflateStrategy: 3,
      filterType: -1,
    }
  }

  // Medium image: balanced
  return {
    deflateLevel: 9,
    deflateStrategy: 3,
    filterType: -1,
  }
}
```

### Based on Content Analysis

```typescript
function analyzeAndConfigure(data: Buffer, width: number, height: number) {
  const hasTransparency = checkTransparency(data)
  const isPhotographic = detectPhotographic(data, width, height)
  const hasLargeUniformAreas = detectUniformAreas(data, width, height)

  return {
    colorType: hasTransparency ? 6 : 2,
    filterType: isPhotographic ? 4 : -1,
    deflateStrategy: hasLargeUniformAreas ? 3 : 0,
    deflateLevel: 9,
  }
}

function checkTransparency(data: Buffer): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

function detectPhotographic(data: Buffer, width: number, height: number): boolean {
  // Simple heuristic: check color variance
  let variance = 0
  for (let i = 4; i < Math.min(data.length, 10000); i += 4) {
    variance += Math.abs(data[i] - data[i - 4])
  }
  return variance / (Math.min(data.length, 10000) / 4) > 10
}

function detectUniformAreas(data: Buffer, width: number, height: number): boolean {
  let runs = 0
  let currentRun = 0

  for (let i = 0; i < data.length - 4; i += 4) {
    if (
      data[i] === data[i + 4] &&
      data[i + 1] === data[i + 5] &&
      data[i + 2] === data[i + 6]
    ) {
      currentRun++
    } else {
      if (currentRun > 10) runs++
      currentRun = 0
    }
  }

  return runs > (width * height) / 100
}
```

## Configuration Validation

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function validateConfig(options: PNGOptions): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate dimensions
  if (options.width !== undefined && options.width <= 0) {
    errors.push('Width must be positive')
  }
  if (options.height !== undefined && options.height <= 0) {
    errors.push('Height must be positive')
  }

  // Validate color type
  const validColorTypes = [0, 2, 3, 4, 6]
  if (options.colorType !== undefined && !validColorTypes.includes(options.colorType)) {
    errors.push(`Invalid color type: ${options.colorType}`)
  }

  // Validate bit depth
  if (options.bitDepth !== undefined && ![8, 16].includes(options.bitDepth)) {
    errors.push(`Invalid bit depth: ${options.bitDepth}`)
  }

  // Validate deflate level
  if (options.deflateLevel !== undefined && (options.deflateLevel < 0 || options.deflateLevel > 9)) {
    errors.push(`Invalid deflate level: ${options.deflateLevel}`)
  }

  // Warnings
  if (options.deflateLevel === 0) {
    warnings.push('No compression enabled, files will be larger')
  }

  if (options.bitDepth === 16 && options.colorType === 6) {
    warnings.push('16-bit RGBA produces large files')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
```

## Next Steps

- [Custom Profiles](/advanced/custom-profiles) - Create reusable configurations
- [Performance](/advanced/performance) - Optimization techniques
- [CI/CD Integration](/advanced/ci-cd-integration) - Automated workflows
