# Performance Tips

This guide provides best practices and techniques for optimizing PNG image processing performance.

## Memory Management

### Buffer Allocation

```typescript
import { PNG } from 'pngx'

// Pre-allocate buffers for better performance
const png = new PNG({
  width: 1000,
  height: 1000,
  fill: true // Pre-fill with zeros
})

// Reuse buffers when possible
const buffer = Buffer.alloc(1000 * 1000 * 4) // 4 bytes per pixel
```

### Memory Usage

1. **Monitor Memory**: Keep track of memory usage for large images
2. **Clean Up**: Release unused buffers
3. **Stream Processing**: Use streaming for very large images
4. **Chunk Processing**: Process images in chunks to reduce memory pressure

## Processing Optimization

### Chunked Processing

```typescript
function processImageChunked(png: PNG, chunkSize: number = 1024): void {
  const buffer = png.data
  const totalPixels = png.width * png.height

  for (let i = 0; i < totalPixels; i += chunkSize) {
    const end = Math.min(i + chunkSize, totalPixels)
    processChunk(buffer, i, end)
  }
}

function processChunk(buffer: Buffer, start: number, end: number): void {
  for (let i = start * 4; i < end * 4; i += 4) {
    // Process pixel at index i
    buffer[i] = processRed(buffer[i])
    buffer[i + 1] = processGreen(buffer[i + 1])
    buffer[i + 2] = processBlue(buffer[i + 2])
    // Alpha channel remains unchanged
  }
}
```

### Parallel Processing

```typescript
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads'

// Main thread
if (isMainThread) {
  const png = new PNG({ width: 1000, height: 1000 })
  const numWorkers = 4
  const chunkSize = Math.ceil(png.width * png.height / numWorkers)

  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker(__filename, {
      workerData: {
        start: i * chunkSize,
        end: Math.min((i + 1) * chunkSize, png.width * png.height),
        buffer: png.data
      }
    })

    worker.on('message', (processedChunk) => {
      // Handle processed chunk
    })
  }
}
// Worker thread
else {
  const { start, end, buffer } = workerData
  processChunk(buffer, start, end)
  parentPort?.postMessage({ start, end, buffer })
}
```

## I/O Optimization

### Streaming

```typescript
import { createReadStream, createWriteStream } from 'node:fs'
import { PNG } from 'pngx'

// Stream large images
const readStream = createReadStream('large.png')
const png = new PNG()

readStream
  .pipe(png)
  .on('parsed', () => {
    // Process image
    png.pack()
  })
  .pipe(createWriteStream('output.png'))
```

### Caching

```typescript
class ImageCache {
  private cache: Map<string, PNG> = new Map()

  async getImage(path: string): Promise<PNG> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!
    }

    const png = new PNG()
    await new Promise((resolve, reject) => {
      png.parse(await readFile(path), (err, data) => {
        if (err)
          reject(err)
        else resolve(data)
      })
    })

    this.cache.set(path, png)
    return png
  }
}
```

## Best Practices

1. **Use TypedArrays**: For better performance with large images
2. **Minimize Copies**: Avoid unnecessary buffer copies
3. **Batch Operations**: Group similar operations
4. **Memory Alignment**: Keep memory aligned for optimal performance
5. **Error Handling**: Implement proper error handling without impacting performance

## Performance Checklist

- [ ] Use appropriate buffer sizes
- [ ] Implement chunked processing for large images
- [ ] Consider parallel processing for CPU-intensive operations
- [ ] Use streaming for I/O operations
- [ ] Implement caching where appropriate
- [ ] Monitor memory usage
- [ ] Profile performance bottlenecks
- [ ] Use appropriate bit depths
- [ ] Optimize BitBlt operations
- [ ] Handle errors efficiently

## Example: Optimized Image Processing

```typescript
import { Worker } from 'node:worker*threads'
import { PNG } from 'pngx'

class OptimizedImageProcessor {
  private static readonly CHUNK*SIZE = 1024 * 1024 // 1MB chunks
  private static readonly NUM*WORKERS = 4

  static async processImage(inputPath: string, outputPath: string): Promise<void> {
    const png = new PNG()

    // Set up streaming
    const readStream = createReadStream(inputPath)
    const writeStream = createWriteStream(outputPath)

    // Process in chunks with workers
    const chunks: Promise<void>[] = []
    let chunkIndex = 0

    png.on('parsed', () => {
      const totalChunks = Math.ceil(png.width * png.height / this.CHUNK*SIZE)

      for (let i = 0; i < this.NUM*WORKERS; i++) {
        const worker = new Worker('./image-worker.js')

        worker.on('message', (processedChunk) => {
          // Handle processed chunk
          chunks[processedChunk.index] = Promise.resolve()

          if (chunks.every(chunk => chunk)) {
            png.pack().pipe(writeStream)
          }
        })

        // Assign chunks to worker
        while (chunkIndex < totalChunks) {
          const start = chunkIndex * this.CHUNK*SIZE
          const end = Math.min(start + this.CHUNK_SIZE, png.width * png.height)

          worker.postMessage({
            index: chunkIndex,
            start,
            end,
            buffer: png.data
          })

          chunkIndex++
        }
      }
    })

    readStream.pipe(png)
  }
}
```

## Next Steps

- Learn about [Buffer Management](/advanced/buffer-management)
- Explore [BitBlt Operations](/advanced/bitblt-operations)
- Check out [Gamma Correction](/advanced/gamma-correction)
