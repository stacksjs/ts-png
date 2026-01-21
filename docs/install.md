# Installation

Installing pngx is straightforward. Choose your preferred package manager to get started.

## Package Managers

::: code-group

```sh [bun]
# Install as dependency
bun add pngx

# Or as dev dependency
bun add -d pngx
```

```sh [npm]
# Install as dependency
npm install pngx

# Or as dev dependency
npm install --save-dev pngx
```

```sh [pnpm]
# Install as dependency
pnpm add pngx

# Or as dev dependency
pnpm add -D pngx
```

```sh [yarn]
# Install as dependency
yarn add pngx

# Or as dev dependency
yarn add -D pngx
```

:::

## Quick Start

After installation, you can immediately start using pngx:

```typescript
import { PNG } from 'pngx'

// Create a simple red 10x10 PNG
const png = new PNG({ width: 10, height: 10 })

for (let i = 0; i < png.data.length; i += 4) {
  png.data[i] = 255     // Red
  png.data[i + 1] = 0   // Green
  png.data[i + 2] = 0   // Blue
  png.data[i + 3] = 255 // Alpha
}

const buffer = PNG.sync.write(png)
console.log('PNG created:', buffer.length, 'bytes')
```

## Verification

Verify your installation:

```typescript
import { PNG } from 'pngx'

// Check version and capabilities
console.log('pngx loaded successfully!')

// Test basic functionality
const png = new PNG({ width: 1, height: 1 })
png.data[0] = 255 // R
png.data[1] = 255 // G
png.data[2] = 255 // B
png.data[3] = 255 // A

const buffer = PNG.sync.write(png)
console.log('Test PNG size:', buffer.length, 'bytes')

// Verify roundtrip
const decoded = PNG.sync.read(buffer)
console.log('Decoded dimensions:', decoded.width, 'x', decoded.height)
```

## System Requirements

pngx has minimal requirements:

- **Bun 1.0+** (recommended) or Node.js 18+
- No native dependencies
- No build step required

## TypeScript Support

pngx is written in TypeScript and provides full type definitions:

```typescript
import { PNG } from 'pngx'
import type { PNGOptions, PNGWithMetadata } from 'pngx'

// Options are fully typed
const options: PNGOptions = {
  width: 100,
  height: 100,
  colorType: 6,
  bitDepth: 8,
  deflateLevel: 9,
}

const png: PNG = new PNG(options)
```

## CommonJS Support

pngx supports both ESM and CommonJS:

```javascript
// ESM
import { PNG } from 'pngx'

// CommonJS
const { PNG } = require('pngx')
```

## Browser Usage

pngx can be used in browsers with a bundler:

```typescript
import { PNG } from 'pngx'

async function processImage(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const png = PNG.sync.read(buffer)
  console.log(`Image: ${png.width}x${png.height}`)

  return png
}
```

## Troubleshooting

### Import Errors

If you encounter import errors, ensure your `tsconfig.json` has proper module settings:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

### Buffer Not Defined

In browser environments, you may need to polyfill Buffer:

```typescript
import { Buffer } from 'buffer'
globalThis.Buffer = Buffer
```

### Memory Issues

For large images, consider using the streaming API:

```typescript
import { PNG } from 'pngx'
import { createReadStream, createWriteStream } from 'fs'

createReadStream('large-image.png')
  .pipe(new PNG())
  .on('parsed', function() {
    // Process image
    this.pack().pipe(createWriteStream('output.png'))
  })
```

## Next Steps

- [Usage Guide](/usage) - Learn the basic API
- [Configuration](/config) - Customize encoding options
- [PNG Encoding](/features/png-encoding) - Create PNG images
- [PNG Decoding](/features/png-decoding) - Read PNG images
