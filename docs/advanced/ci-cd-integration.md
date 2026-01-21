# CI/CD Integration

Integrate pngx into your CI/CD pipelines for automated image processing, testing, and optimization.

## GitHub Actions

### Basic Image Processing

```yaml
# .github/workflows/process-images.yml
name: Process Images

on:
  push:
    paths:
      - 'images/**'

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Process images
        run: bun run process-images.ts

      - name: Upload processed images
        uses: actions/upload-artifact@v3
        with:
          name: processed-images
          path: output/
```

### Image Optimization Pipeline

```yaml
# .github/workflows/optimize.yml
name: Optimize PNG Images

on:
  pull_request:
    paths:
      - '**/*.png'

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install pngx
        run: bun add pngx

      - name: Optimize PNGs
        run: |
          bun run << 'EOF'
          import { PNG } from 'pngx'
          import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
          import { join } from 'path'

          function optimizePNG(path) {
            const buffer = readFileSync(path)
            const png = PNG.sync.read(buffer)

            const optimized = PNG.sync.write(new PNG({
              width: png.width,
              height: png.height,
              deflateLevel: 9,
              filterType: -1,
            }))

            writeFileSync(path, optimized)
            return { original: buffer.length, optimized: optimized.length }
          }

          function findPNGs(dir) {
            const files = []
            for (const entry of readdirSync(dir)) {
              const path = join(dir, entry)
              if (statSync(path).isDirectory()) {
                files.push(...findPNGs(path))
              } else if (entry.endsWith('.png')) {
                files.push(path)
              }
            }
            return files
          }

          const pngs = findPNGs('.')
          let totalSaved = 0

          for (const png of pngs) {
            const { original, optimized } = optimizePNG(png)
            totalSaved += original - optimized
            console.log(`${png}: ${original} -> ${optimized} (${((1 - optimized/original) * 100).toFixed(1)}% reduction)`)
          }

          console.log(`Total saved: ${(totalSaved / 1024).toFixed(2)} KB`)
          EOF

      - name: Commit optimized images
        run: |
          git config user.name "GitHub Action"
          git config user.email "action@github.com"
          git add -A
          git commit -m "Optimize PNG images" || exit 0
          git push
```

### Visual Regression Testing

```yaml
# .github/workflows/visual-test.yml
name: Visual Regression

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run visual tests
        run: bun run visual-test.ts

      - name: Upload diff images
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diffs
          path: test-output/diffs/
```

## GitLab CI

```yaml
# .gitlab-ci.yml
image: oven/bun:latest

stages:
  - process
  - test
  - deploy

process-images:
  stage: process
  script:
    - bun install
    - bun run process-images.ts
  artifacts:
    paths:
      - output/
    expire_in: 1 week

test-images:
  stage: test
  script:
    - bun install
    - bun run test-images.ts
  artifacts:
    paths:
      - test-output/
    when: on_failure

deploy-images:
  stage: deploy
  script:
    - bun run deploy-images.ts
  only:
    - main
```

## Processing Scripts

### Batch Optimization

```typescript
// process-images.ts
import { PNG } from 'pngx'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { glob } from 'glob'
import { basename, join } from 'path'

interface ProcessResult {
  file: string
  original: number
  optimized: number
  saved: number
}

async function processImages(): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []
  const inputDir = process.env.INPUT_DIR || 'images'
  const outputDir = process.env.OUTPUT_DIR || 'output'

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const files = await glob(`${inputDir}/**/*.png`)

  for (const file of files) {
    const buffer = readFileSync(file)
    const png = PNG.sync.read(buffer)

    const optimizedPng = new PNG({
      width: png.width,
      height: png.height,
      deflateLevel: 9,
      deflateStrategy: 3,
      filterType: -1,
    })

    png.data.copy(optimizedPng.data)
    const optimized = PNG.sync.write(optimizedPng)

    const outputPath = join(outputDir, basename(file))
    writeFileSync(outputPath, optimized)

    results.push({
      file,
      original: buffer.length,
      optimized: optimized.length,
      saved: buffer.length - optimized.length,
    })
  }

  return results
}

const results = await processImages()

// Generate report
const totalOriginal = results.reduce((sum, r) => sum + r.original, 0)
const totalOptimized = results.reduce((sum, r) => sum + r.optimized, 0)

console.log('Processing complete!')
console.log(`Files: ${results.length}`)
console.log(`Original size: ${(totalOriginal / 1024).toFixed(2)} KB`)
console.log(`Optimized size: ${(totalOptimized / 1024).toFixed(2)} KB`)
console.log(`Saved: ${((totalOriginal - totalOptimized) / 1024).toFixed(2)} KB (${((1 - totalOptimized / totalOriginal) * 100).toFixed(1)}%)`)
```

### Visual Comparison Testing

```typescript
// visual-test.ts
import { PNG } from 'pngx'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

interface CompareResult {
  match: boolean
  diffPixels: number
  diffPercent: number
}

function comparePNG(png1: PNG, png2: PNG): CompareResult {
  if (png1.width !== png2.width || png1.height !== png2.height) {
    return { match: false, diffPixels: -1, diffPercent: 100 }
  }

  let diffPixels = 0
  const totalPixels = png1.width * png1.height

  for (let i = 0; i < png1.data.length; i += 4) {
    const diff =
      Math.abs(png1.data[i] - png2.data[i]) +
      Math.abs(png1.data[i + 1] - png2.data[i + 1]) +
      Math.abs(png1.data[i + 2] - png2.data[i + 2]) +
      Math.abs(png1.data[i + 3] - png2.data[i + 3])

    if (diff > 0) {
      diffPixels++
    }
  }

  return {
    match: diffPixels === 0,
    diffPixels,
    diffPercent: (diffPixels / totalPixels) * 100,
  }
}

function createDiffImage(png1: PNG, png2: PNG): PNG {
  const diff = new PNG({
    width: png1.width,
    height: png1.height,
  })

  for (let i = 0; i < png1.data.length; i += 4) {
    const pixelDiff =
      Math.abs(png1.data[i] - png2.data[i]) +
      Math.abs(png1.data[i + 1] - png2.data[i + 1]) +
      Math.abs(png1.data[i + 2] - png2.data[i + 2])

    if (pixelDiff > 0) {
      diff.data[i] = 255     // Red for differences
      diff.data[i + 1] = 0
      diff.data[i + 2] = 0
      diff.data[i + 3] = 255
    } else {
      diff.data[i] = png1.data[i]
      diff.data[i + 1] = png1.data[i + 1]
      diff.data[i + 2] = png1.data[i + 2]
      diff.data[i + 3] = 128  // Semi-transparent for matches
    }
  }

  return diff
}

// Run tests
const baselineDir = 'test/baselines'
const actualDir = 'test/actual'
const diffDir = 'test-output/diffs'

if (!existsSync(diffDir)) {
  mkdirSync(diffDir, { recursive: true })
}

let passed = 0
let failed = 0

const baselines = readdirSync(baselineDir).filter(f => f.endsWith('.png'))

for (const file of baselines) {
  const baselinePath = join(baselineDir, file)
  const actualPath = join(actualDir, file)

  if (!existsSync(actualPath)) {
    console.log(`MISSING: ${file}`)
    failed++
    continue
  }

  const baseline = PNG.sync.read(readFileSync(baselinePath))
  const actual = PNG.sync.read(readFileSync(actualPath))

  const result = comparePNG(baseline, actual)

  if (result.match) {
    console.log(`PASS: ${file}`)
    passed++
  } else {
    console.log(`FAIL: ${file} (${result.diffPercent.toFixed(2)}% different)`)

    const diffImage = createDiffImage(baseline, actual)
    writeFileSync(join(diffDir, file), PNG.sync.write(diffImage))

    failed++
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
```

## Docker Integration

### Dockerfile

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .

CMD ["bun", "run", "process-images.ts"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  image-processor:
    build: .
    volumes:
      - ./input:/app/input
      - ./output:/app/output
    environment:
      - INPUT_DIR=/app/input
      - OUTPUT_DIR=/app/output
      - COMPRESSION_LEVEL=9
```

## Environment Configuration

### Configuration Script

```typescript
// config.ts
interface Config {
  inputDir: string
  outputDir: string
  compression: {
    level: number
    strategy: number
    filter: number
  }
  skipCRC: boolean
}

export function loadConfig(): Config {
  return {
    inputDir: process.env.INPUT_DIR || 'images',
    outputDir: process.env.OUTPUT_DIR || 'output',
    compression: {
      level: Number(process.env.COMPRESSION_LEVEL) || 9,
      strategy: Number(process.env.COMPRESSION_STRATEGY) || 3,
      filter: Number(process.env.FILTER_TYPE) || -1,
    },
    skipCRC: process.env.SKIP_CRC === 'true',
  }
}
```

### Environment Variables

```bash
# .env.ci
INPUT_DIR=./images
OUTPUT_DIR=./output
COMPRESSION_LEVEL=9
COMPRESSION_STRATEGY=3
FILTER_TYPE=-1
SKIP_CRC=true
```

## Best Practices

1. **Cache Dependencies**: Cache bun/npm dependencies between runs
2. **Parallel Processing**: Use worker threads for batch operations
3. **Artifact Storage**: Store processed images as artifacts
4. **Fail Fast**: Exit early on critical errors
5. **Report Results**: Generate clear summaries

## Troubleshooting

### Out of Memory

```yaml
# Increase memory limit
- name: Process large images
  run: bun run --bun process-images.ts
  env:
    NODE_OPTIONS: --max-old-space-size=4096
```

### Timeout Issues

```yaml
# Increase timeout
- name: Long running process
  run: bun run process-images.ts
  timeout-minutes: 30
```

## Next Steps

- [Performance](/advanced/performance) - Optimize processing speed
- [Custom Profiles](/advanced/custom-profiles) - Reusable configurations
- [Configuration](/advanced/configuration) - Detailed settings
