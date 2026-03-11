<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# pngx

> A TypeScript library for encoding & decoding PNG images with comprehensive type safety and memory management.

## Features

- 📸 **Complete PNG Support**: Full implementation of PNG encoding and decoding
- 🎨 **Color Types**: Support for Grayscale, RGB, RGBA, and Palette color modes
- 🔍 **Chunk Processing**: Proper handling of all critical PNG chunks _(IHDR, IDAT, PLTE, IEND)_
- 💾 **Memory Safe**: Built-in memory management for large images
- 🎯 **Filtering**: Support for all PNG filter types _(None, Sub, Up, Average, Paeth)_
- 💪 **Type Safe**: Written in TypeScript with comprehensive type definitions
- ⚡ **Efficient**: Optimized filtering and compression algorithms
- 🛡️ **Error Handling**: Robust error handling for malformed PNG data
- 📦 **Lightweight**: Zero dependencies

<!-- - 🌐 **Universal**: Works in both Node.js and browser environments -->

## Installation

```bash
npm install pngx
# or
pnpm add pngx
# or
bun i pngx
```

## Usage

### Reading PNG Images

```ts
import { PNG } from 'pngx'

// Basic reading
const png = new PNG()
const buffer = await fs.readFile('image.png')
png.parse(buffer, (error, data) => {
  if (error)
    throw error
  console.log(`Dimensions: ${data.width}x${data.height}`)
})

// Advanced reading with options
const png = new PNG({
  filterType: 4, // Paeth filtering
  bitDepth: 8, // 8-bit depth
  colorType: 6 // RGBA color mode
})

// Access image data
png.on('parsed', function () {
  const { width, height, data, gamma } = this
  // data is a Buffer containing RGBA pixel data
})
```

### Writing PNG Images

```ts
import { PNG } from 'pngx'

// Create a new PNG with dimensions
const png = new PNG({
  width: 800,
  height: 600,
  colorType: 6, // RGBA
  bitDepth: 8
})

// Fill with pixel data
for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width _ y + x) << 2
    png.data[idx] = 255 // R
    png.data[idx + 1] = 0 // G
    png.data[idx + 2] = 0 // B
    png.data[idx + 3] = 255 // A
  }
}

// Write to file
png.pack().pipe(fs.createWriteStream('output.png'))
```

### Color Types Support

```ts
import { PNG } from 'pngx'

// Grayscale
const grayPNG = new PNG({
  colorType: 0, // Grayscale
  bitDepth: 8
})

// RGB
const rgbPNG = new PNG({
  colorType: 2, // RGB
  bitDepth: 8
})

// RGBA
const rgbaPNG = new PNG({
  colorType: 6, // RGBA
  bitDepth: 8
})

// Palette-based
const palettePNG = new PNG({
  colorType: 3, // Palette
  bitDepth: 8
})
```

### Filter Types

The library supports all standard PNG filter types:

```ts
import { PNG } from 'pngx'

// Specific filter type
const png = new PNG({
  filterType: 0 // None
  // filterType: 1  // Sub
  // filterType: 2  // Up
  // filterType: 3  // Average
  // filterType: 4  // Paeth
})

// Adaptive filtering (choose best filter per line)
const png = new PNG({
  filterType: -1 // Adaptive
})
```

### Error Handling

The library provides detailed error messages for common issues:

```ts
try {
  const png = new PNG()
  png.parse(corruptedBuffer, (error, data) => {
    if (error) {
      if (error.message.includes('signature')) {
        console.error('Invalid PNG signature')
      }
      else if (error.message.includes('IHDR')) {
        console.error('Invalid header chunk')
      }
      else {
        console.error('PNG parsing error:', error)
      }
    }
  })
}
catch (err) {
  console.error('Processing error:', err)
}
```

## TypeScript Support

Full TypeScript support with detailed type definitions:

```ts
import { Buffer } from 'node:buffer'

interface PNGOptions {
  width?: number
  height?: number
  bitDepth?: 8 | 16
  colorType?: 0 | 2 | 3 | 4 | 6
  filterType?: -1 | 0 | 1 | 2 | 3 | 4
  inputHasAlpha?: boolean
  deflateLevel?: number
  deflateStrategy?: number
}

interface BitmapData {
  width: number
  height: number
  data: Buffer
  gamma?: number
}

// Types are automatically inferred
const png = new PNG()
png.on('parsed', function (this: PNG) {
  const { width, height, data } = this
})
```

## Memory Management

The library includes built-in memory management for handling large images:

```ts
import { PNG } from 'pngx'

// Create PNG with memory constraints
const png = new PNG({
  deflateChunkSize: 32 _ 1024, // 32KB chunks
  deflateLevel: 9, // Max compression
  filterType: 4 // Paeth filtering
})

// Handle potential memory errors
png.on('error', (error) => {
  if (error.message.includes('memory')) {
    console.error('Memory allocation failed:', error)
  }
})
```

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stackjs/pngx/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/pngx/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

“Software that is free, but hopes for a postcard.” We love receiving postcards from around the world showing where `pngx` is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Credits

Many thanks to [`pngjs`](https://github.com/pngjs/pngjs) and its contributors for inspiring this project.

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/pngx?style=flat-square
[npm-version-href]: https://npmjs.com/package/pngx
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/pngx/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/pngx/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/pngx/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/pngx -->
