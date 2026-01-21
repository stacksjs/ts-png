# Custom Profiles

Create reusable configuration profiles for different use cases and image types.

## Profile System

### Basic Profile Structure

```typescript
interface PNGProfile {
  name: string
  description: string
  options: {
    colorType: number
    bitDepth: 8 | 16
    deflateLevel: number
    deflateStrategy: number
    filterType: number
    deflateChunkSize?: number
  }
}
```

### Profile Registry

```typescript
class ProfileRegistry {
  private profiles = new Map<string, PNGProfile>()

  register(profile: PNGProfile) {
    this.profiles.set(profile.name, profile)
  }

  get(name: string): PNGProfile | undefined {
    return this.profiles.get(name)
  }

  list(): string[] {
    return Array.from(this.profiles.keys())
  }
}

const registry = new ProfileRegistry()
```

## Built-in Profiles

### Web Optimized

```typescript
const webProfile: PNGProfile = {
  name: 'web',
  description: 'Optimized for web delivery with small file sizes',
  options: {
    colorType: 6,
    bitDepth: 8,
    deflateLevel: 9,
    deflateStrategy: 3,
    filterType: -1,
  },
}
```

### Print Quality

```typescript
const printProfile: PNGProfile = {
  name: 'print',
  description: 'High quality for print production',
  options: {
    colorType: 6,
    bitDepth: 16,
    deflateLevel: 9,
    deflateStrategy: 0,
    filterType: -1,
  },
}
```

### Thumbnail

```typescript
const thumbnailProfile: PNGProfile = {
  name: 'thumbnail',
  description: 'Fast encoding for preview images',
  options: {
    colorType: 6,
    bitDepth: 8,
    deflateLevel: 6,
    deflateStrategy: 2,
    filterType: 0,
  },
}
```

### Archive

```typescript
const archiveProfile: PNGProfile = {
  name: 'archive',
  description: 'Maximum quality for long-term storage',
  options: {
    colorType: 6,
    bitDepth: 16,
    deflateLevel: 9,
    deflateStrategy: 0,
    filterType: -1,
  },
}
```

### Fast Processing

```typescript
const fastProfile: PNGProfile = {
  name: 'fast',
  description: 'Fastest encoding for development',
  options: {
    colorType: 6,
    bitDepth: 8,
    deflateLevel: 1,
    deflateStrategy: 2,
    filterType: 0,
    deflateChunkSize: 64 * 1024,
  },
}
```

## Content-Specific Profiles

### Screenshot Profile

```typescript
const screenshotProfile: PNGProfile = {
  name: 'screenshot',
  description: 'Optimized for screenshots and UI captures',
  options: {
    colorType: 6,
    bitDepth: 8,
    deflateLevel: 9,
    deflateStrategy: 3,  // RLE works well for UI
    filterType: -1,
  },
}
```

### Photo Profile

```typescript
const photoProfile: PNGProfile = {
  name: 'photo',
  description: 'Optimized for photographic images',
  options: {
    colorType: 6,
    bitDepth: 8,
    deflateLevel: 9,
    deflateStrategy: 0,
    filterType: 4,  // Paeth filter for photos
  },
}
```

### Icon Profile

```typescript
const iconProfile: PNGProfile = {
  name: 'icon',
  description: 'Optimized for icons and small images',
  options: {
    colorType: 6,  // Keep alpha for icons
    bitDepth: 8,
    deflateLevel: 9,
    deflateStrategy: 3,
    filterType: -1,
  },
}
```

### Chart Profile

```typescript
const chartProfile: PNGProfile = {
  name: 'chart',
  description: 'Optimized for charts and graphs',
  options: {
    colorType: 2,  // RGB without alpha
    bitDepth: 8,
    deflateLevel: 9,
    deflateStrategy: 3,
    filterType: 1,  // Sub filter for horizontal lines
  },
}
```

## Profile Manager

### Complete Implementation

```typescript
import { PNG } from 'pngx'

class PNGProfileManager {
  private profiles = new Map<string, PNGProfile>()

  constructor() {
    // Register default profiles
    this.register(webProfile)
    this.register(printProfile)
    this.register(thumbnailProfile)
    this.register(archiveProfile)
    this.register(fastProfile)
    this.register(screenshotProfile)
    this.register(photoProfile)
    this.register(iconProfile)
    this.register(chartProfile)
  }

  register(profile: PNGProfile): void {
    this.profiles.set(profile.name, profile)
  }

  get(name: string): PNGProfile {
    const profile = this.profiles.get(name)
    if (!profile) {
      throw new Error(`Profile not found: ${name}`)
    }
    return profile
  }

  list(): PNGProfile[] {
    return Array.from(this.profiles.values())
  }

  createPNG(width: number, height: number, profileName: string): PNG {
    const profile = this.get(profileName)
    return new PNG({
      width,
      height,
      ...profile.options,
    })
  }

  encode(
    data: Buffer,
    width: number,
    height: number,
    profileName: string
  ): Buffer {
    const png = this.createPNG(width, height, profileName)
    data.copy(png.data)
    return PNG.sync.write(png)
  }
}

export const profiles = new PNGProfileManager()
```

### Usage

```typescript
// Create PNG with profile
const png = profiles.createPNG(800, 600, 'web')

// Fill data
// ...

// Write
const buffer = PNG.sync.write(png)

// Or encode directly
const encoded = profiles.encode(pixelData, 800, 600, 'thumbnail')
```

## Custom Profile Creation

### From Base Profile

```typescript
function extendProfile(
  base: PNGProfile,
  overrides: Partial<PNGProfile['options']>,
  newName: string,
  description?: string
): PNGProfile {
  return {
    name: newName,
    description: description || base.description,
    options: {
      ...base.options,
      ...overrides,
    },
  }
}

// Create grayscale version of web profile
const grayscaleWebProfile = extendProfile(
  webProfile,
  { colorType: 0 },
  'grayscale-web',
  'Grayscale images for web'
)
```

### Profile Builder

```typescript
class ProfileBuilder {
  private options: Partial<PNGProfile['options']> = {}
  private _name: string = 'custom'
  private _description: string = 'Custom profile'

  name(name: string): this {
    this._name = name
    return this
  }

  description(desc: string): this {
    this._description = desc
    return this
  }

  colorType(type: 0 | 2 | 3 | 4 | 6): this {
    this.options.colorType = type
    return this
  }

  bitDepth(depth: 8 | 16): this {
    this.options.bitDepth = depth
    return this
  }

  compression(level: number, strategy?: number): this {
    this.options.deflateLevel = level
    if (strategy !== undefined) {
      this.options.deflateStrategy = strategy
    }
    return this
  }

  filter(type: -1 | 0 | 1 | 2 | 3 | 4): this {
    this.options.filterType = type
    return this
  }

  chunkSize(size: number): this {
    this.options.deflateChunkSize = size
    return this
  }

  build(): PNGProfile {
    return {
      name: this._name,
      description: this._description,
      options: {
        colorType: this.options.colorType ?? 6,
        bitDepth: this.options.bitDepth ?? 8,
        deflateLevel: this.options.deflateLevel ?? 6,
        deflateStrategy: this.options.deflateStrategy ?? 0,
        filterType: this.options.filterType ?? -1,
        deflateChunkSize: this.options.deflateChunkSize,
      },
    }
  }
}

// Usage
const customProfile = new ProfileBuilder()
  .name('custom-web')
  .description('Custom web-optimized profile')
  .colorType(6)
  .bitDepth(8)
  .compression(9, 3)
  .filter(-1)
  .build()
```

## Profile Selection

### Automatic Selection

```typescript
function selectProfile(
  width: number,
  height: number,
  hasAlpha: boolean,
  purpose: 'web' | 'print' | 'archive'
): string {
  const pixels = width * height

  // Small images
  if (pixels < 10000) {
    return 'icon'
  }

  // Thumbnails
  if (pixels < 100000 && purpose === 'web') {
    return 'thumbnail'
  }

  // Based on purpose
  switch (purpose) {
    case 'print':
      return 'print'
    case 'archive':
      return 'archive'
    case 'web':
    default:
      return 'web'
  }
}
```

### Content-Based Selection

```typescript
function selectProfileByContent(
  data: Buffer,
  width: number,
  height: number
): string {
  const analysis = analyzeImage(data, width, height)

  if (analysis.isPhoto) {
    return 'photo'
  }

  if (analysis.hasLargeUniformAreas) {
    return 'screenshot'
  }

  if (width <= 128 && height <= 128) {
    return 'icon'
  }

  return 'web'
}

function analyzeImage(data: Buffer, width: number, height: number) {
  // Analyze color distribution, patterns, etc.
  return {
    isPhoto: false,
    hasLargeUniformAreas: false,
    colorCount: 0,
  }
}
```

## Profile Benchmarking

```typescript
interface BenchmarkResult {
  profile: string
  size: number
  encodeTime: number
  compressionRatio: number
}

async function benchmarkProfiles(
  data: Buffer,
  width: number,
  height: number
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = []
  const rawSize = width * height * 4

  for (const profile of profiles.list()) {
    const start = performance.now()
    const encoded = profiles.encode(data, width, height, profile.name)
    const encodeTime = performance.now() - start

    results.push({
      profile: profile.name,
      size: encoded.length,
      encodeTime,
      compressionRatio: rawSize / encoded.length,
    })
  }

  return results.sort((a, b) => a.size - b.size)
}
```

## Best Practices

1. **Use Profiles Consistently**: Apply same profile for similar content types
2. **Profile for Purpose**: Match profile to final use (web, print, archive)
3. **Benchmark Your Content**: Test profiles on your actual images
4. **Create Custom Profiles**: Build profiles for your specific needs
5. **Document Profiles**: Keep clear descriptions for team use

## Next Steps

- [Performance](/advanced/performance) - Optimization techniques
- [CI/CD Integration](/advanced/ci-cd-integration) - Automated workflows
- [Configuration](/advanced/configuration) - Detailed settings
