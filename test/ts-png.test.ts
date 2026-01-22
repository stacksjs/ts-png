import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, beforeAll } from 'bun:test'
import { png } from '../src'

const FIXTURES_DIR = path.join(import.meta.dir, 'fixtures')

// Create a simple test PNG buffer programmatically
function createTestPNG(width: number, height: number, color: { r: number, g: number, b: number, a: number }): Buffer {
  // Create RGBA data
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = color.r
    data[i * 4 + 1] = color.g
    data[i * 4 + 2] = color.b
    data[i * 4 + 3] = color.a
  }

  // Encode to PNG
  return png.sync.write({ width, height, data })
}

describe('ts-png', () => {
  beforeAll(() => {
    // Ensure fixtures directory exists
    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true })
    }
  })

  describe('png.sync.read', () => {
    it('should decode a simple PNG', () => {
      const width = 10
      const height = 10
      const color = { r: 255, g: 0, b: 0, a: 255 }

      // Create and then decode a PNG
      const pngBuffer = createTestPNG(width, height, color)
      const decoded = png.sync.read(pngBuffer)

      expect(decoded.width).toBe(width)
      expect(decoded.height).toBe(height)
      expect(decoded.data.length).toBe(width * height * 4)

      // Check first pixel color
      expect(decoded.data[0]).toBe(color.r)
      expect(decoded.data[1]).toBe(color.g)
      expect(decoded.data[2]).toBe(color.b)
      expect(decoded.data[3]).toBe(color.a)
    })

    it('should decode a PNG with transparency', () => {
      const width = 5
      const height = 5
      const color = { r: 0, g: 255, b: 0, a: 128 }

      const pngBuffer = createTestPNG(width, height, color)
      const decoded = png.sync.read(pngBuffer)

      expect(decoded.width).toBe(width)
      expect(decoded.height).toBe(height)

      // Check alpha channel
      expect(decoded.data[3]).toBe(color.a)
    })

    it('should decode various PNG sizes', () => {
      const sizes = [
        { width: 1, height: 1 },
        { width: 16, height: 16 },
        { width: 100, height: 50 },
        { width: 50, height: 100 },
        { width: 256, height: 256 },
      ]

      for (const size of sizes) {
        const pngBuffer = createTestPNG(size.width, size.height, { r: 128, g: 128, b: 128, a: 255 })
        const decoded = png.sync.read(pngBuffer)

        expect(decoded.width).toBe(size.width)
        expect(decoded.height).toBe(size.height)
        expect(decoded.data.length).toBe(size.width * size.height * 4)
      }
    })

    it('should handle fully transparent PNG', () => {
      const width = 10
      const height = 10
      const color = { r: 0, g: 0, b: 0, a: 0 }

      const pngBuffer = createTestPNG(width, height, color)
      const decoded = png.sync.read(pngBuffer)

      expect(decoded.width).toBe(width)
      expect(decoded.height).toBe(height)

      // Check all pixels are transparent
      for (let i = 0; i < width * height; i++) {
        expect(decoded.data[i * 4 + 3]).toBe(0)
      }
    })
  })

  describe('png.sync.write', () => {
    it('should encode a simple PNG', () => {
      const width = 10
      const height = 10
      const data = Buffer.alloc(width * height * 4)

      // Fill with blue
      for (let i = 0; i < width * height; i++) {
        data[i * 4] = 0
        data[i * 4 + 1] = 0
        data[i * 4 + 2] = 255
        data[i * 4 + 3] = 255
      }

      const pngBuffer = png.sync.write({ width, height, data })

      // Verify it's a valid PNG (check magic bytes)
      expect(pngBuffer[0]).toBe(0x89)
      expect(pngBuffer[1]).toBe(0x50) // P
      expect(pngBuffer[2]).toBe(0x4E) // N
      expect(pngBuffer[3]).toBe(0x47) // G
      expect(pngBuffer[4]).toBe(0x0D)
      expect(pngBuffer[5]).toBe(0x0A)
      expect(pngBuffer[6]).toBe(0x1A)
      expect(pngBuffer[7]).toBe(0x0A)
    })

    it('should produce a decodable PNG', () => {
      const width = 20
      const height = 15
      const data = Buffer.alloc(width * height * 4)

      // Create gradient
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          data[i] = Math.floor((x / width) * 255)
          data[i + 1] = Math.floor((y / height) * 255)
          data[i + 2] = 128
          data[i + 3] = 255
        }
      }

      const pngBuffer = png.sync.write({ width, height, data })
      const decoded = png.sync.read(pngBuffer)

      expect(decoded.width).toBe(width)
      expect(decoded.height).toBe(height)

      // Verify pixel data matches (allowing for compression artifacts in lossless format)
      for (let i = 0; i < width * height * 4; i++) {
        expect(decoded.data[i]).toBe(data[i])
      }
    })
  })

  describe('round-trip encoding', () => {
    it('should preserve pixel data through encode/decode cycle', () => {
      const width = 32
      const height = 32
      const originalData = Buffer.alloc(width * height * 4)

      // Create a pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          originalData[i] = (x * 8) % 256
          originalData[i + 1] = (y * 8) % 256
          originalData[i + 2] = ((x + y) * 4) % 256
          originalData[i + 3] = 255
        }
      }

      // Encode
      const encoded = png.sync.write({ width, height, data: originalData })

      // Decode
      const decoded = png.sync.read(encoded)

      // Verify
      expect(decoded.width).toBe(width)
      expect(decoded.height).toBe(height)

      for (let i = 0; i < originalData.length; i++) {
        expect(decoded.data[i]).toBe(originalData[i])
      }
    })

    it('should preserve alpha channel through encode/decode cycle', () => {
      const width = 16
      const height = 16
      const originalData = Buffer.alloc(width * height * 4)

      // Create pattern with varying alpha
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          originalData[i] = 255
          originalData[i + 1] = 128
          originalData[i + 2] = 64
          originalData[i + 3] = Math.floor((x / width) * 255)
        }
      }

      const encoded = png.sync.write({ width, height, data: originalData })
      const decoded = png.sync.read(encoded)

      for (let i = 0; i < originalData.length; i++) {
        expect(decoded.data[i]).toBe(originalData[i])
      }
    })
  })

  describe('edge cases', () => {
    it('should handle 1x1 PNG', () => {
      const data = Buffer.from([255, 0, 0, 255])
      const encoded = png.sync.write({ width: 1, height: 1, data })
      const decoded = png.sync.read(encoded)

      expect(decoded.width).toBe(1)
      expect(decoded.height).toBe(1)
      expect(decoded.data[0]).toBe(255)
      expect(decoded.data[1]).toBe(0)
      expect(decoded.data[2]).toBe(0)
      expect(decoded.data[3]).toBe(255)
    })

    it('should handle wide image (1000x1)', () => {
      const width = 1000
      const height = 1
      const data = Buffer.alloc(width * height * 4, 128)

      const encoded = png.sync.write({ width, height, data })
      const decoded = png.sync.read(encoded)

      expect(decoded.width).toBe(width)
      expect(decoded.height).toBe(height)
    })

    it('should handle tall image (1x1000)', () => {
      const width = 1
      const height = 1000
      const data = Buffer.alloc(width * height * 4, 128)

      const encoded = png.sync.write({ width, height, data })
      const decoded = png.sync.read(encoded)

      expect(decoded.width).toBe(width)
      expect(decoded.height).toBe(height)
    })
  })
})
