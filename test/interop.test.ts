import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'bun:test'
import { png } from '../src'

/**
 * Interop tests: decode PNGs produced by external encoders, covering the
 * feature combinations we expect to encounter in real-world inputs.
 *
 * Inputs:
 *   - PngSuite (test/in/) — the canonical conformance corpus
 *     (http://www.schaik.com/pngsuite/) covering every color type, bit
 *     depth, interlace, transparency, and ancillary-chunk combination.
 *   - A PNG freshly produced by a @resvg/resvg-js SVG render — our
 *     "real-world encoder" smoke test.
 */

const IN_DIR = path.join(import.meta.dir, 'in')

/**
 * PngSuite filename convention (from the maintainer's README):
 *   bas[ni]<ct><bd>
 *     n = non-interlaced, i = Adam7-interlaced
 *     ct: 0 = grayscale, 2 = RGB, 3 = palette, 4 = gray+alpha, 6 = RGBA
 *     bd: bit depth (01/02/04/08/16)
 *
 * These entries lock in the baseline set we rely on for the nps-fonts
 * verification pipeline (non-interlaced RGB/RGBA/grayscale 8-bit).
 */
interface FixtureSpec {
  file: string
  width: number
  height: number
  desc: string
}

const PNGSUITE_BASELINE: FixtureSpec[] = [
  { file: 'basn0g08.png', width: 32, height: 32, desc: 'non-interlaced 8-bit grayscale' },
  { file: 'basn0g16.png', width: 32, height: 32, desc: 'non-interlaced 16-bit grayscale' },
  { file: 'basn2c08.png', width: 32, height: 32, desc: 'non-interlaced 8-bit RGB' },
  { file: 'basn2c16.png', width: 32, height: 32, desc: 'non-interlaced 16-bit RGB' },
  { file: 'basn3p08.png', width: 32, height: 32, desc: 'non-interlaced 8-bit palette' },
  { file: 'basn4a08.png', width: 32, height: 32, desc: 'non-interlaced 8-bit gray+alpha' },
  { file: 'basn6a08.png', width: 32, height: 32, desc: 'non-interlaced 8-bit RGBA' },
  { file: 'basn6a16.png', width: 32, height: 32, desc: 'non-interlaced 16-bit RGBA' },
]

const PNGSUITE_INTERLACED: FixtureSpec[] = [
  { file: 'basi0g08.png', width: 32, height: 32, desc: 'Adam7 8-bit grayscale' },
  { file: 'basi2c08.png', width: 32, height: 32, desc: 'Adam7 8-bit RGB' },
  { file: 'basi6a08.png', width: 32, height: 32, desc: 'Adam7 8-bit RGBA' },
]

describe('ts-png interop: PngSuite baseline', () => {
  for (const spec of PNGSUITE_BASELINE) {
    it(`decodes ${spec.file} (${spec.desc})`, () => {
      if (!fs.existsSync(path.join(IN_DIR, spec.file))) {
        // Non-fatal — fixtures may be out-of-tree for size reasons.
        return
      }
      const buf = fs.readFileSync(path.join(IN_DIR, spec.file))
      const decoded = png.sync.read(buf)
      expect(decoded.width).toBe(spec.width)
      expect(decoded.height).toBe(spec.height)
      // Every image in the baseline set normalizes to 8-bit RGBA = 4 bytes/pixel.
      expect(decoded.data.length).toBe(spec.width * spec.height * 4)
    })
  }
})

describe('ts-png interop: PngSuite interlaced', () => {
  for (const spec of PNGSUITE_INTERLACED) {
    it(`decodes ${spec.file} (${spec.desc})`, () => {
      if (!fs.existsSync(path.join(IN_DIR, spec.file))) return
      const buf = fs.readFileSync(path.join(IN_DIR, spec.file))
      const decoded = png.sync.read(buf)
      expect(decoded.width).toBe(spec.width)
      expect(decoded.height).toBe(spec.height)
      expect(decoded.data.length).toBe(spec.width * spec.height * 4)
    })
  }
})

describe('ts-png interop: pixel comparisons — interlaced matches non-interlaced', () => {
  // basi*/basn* pairs encode identical pictures with different interlace
  // settings; their decoded pixels must match byte-for-byte.
  const pairs: Array<[string, string, string]> = [
    ['basi0g08.png', 'basn0g08.png', '8-bit grayscale'],
    ['basi2c08.png', 'basn2c08.png', '8-bit RGB'],
    ['basi6a08.png', 'basn6a08.png', '8-bit RGBA'],
  ]
  for (const [a, b, label] of pairs) {
    it(`${label}: ${a} ≡ ${b}`, () => {
      if (!fs.existsSync(path.join(IN_DIR, a)) || !fs.existsSync(path.join(IN_DIR, b))) return
      const A = png.sync.read(fs.readFileSync(path.join(IN_DIR, a)))
      const B = png.sync.read(fs.readFileSync(path.join(IN_DIR, b)))
      expect(A.width).toBe(B.width)
      expect(A.height).toBe(B.height)
      expect(A.data.length).toBe(B.data.length)
      for (let i = 0; i < A.data.length; i++) {
        if (A.data[i] !== B.data[i]) {
          throw new Error(`byte ${i} differs: ${A.data[i]} vs ${B.data[i]}`)
        }
      }
    })
  }
})

describe('ts-png interop: alpha + transparency chunks', () => {
  // basn2c08: RGB, no alpha (tests the decoder synthesizes alpha=255).
  it('RGB without alpha channel decodes with alpha=255', () => {
    if (!fs.existsSync(path.join(IN_DIR, 'basn2c08.png'))) return
    const buf = fs.readFileSync(path.join(IN_DIR, 'basn2c08.png'))
    const decoded = png.sync.read(buf)
    // Sample a handful of pixels' alpha.
    for (let i = 3; i < decoded.data.length; i += 4 * 64) {
      expect(decoded.data[i]).toBe(255)
    }
  })

  // tbbn2c16: RGB with tRNS chunk (single transparent color).
  it('RGB with tRNS transparency chunk decodes', () => {
    const candidate = fs.readdirSync(IN_DIR).find(f => /^tb/.test(f) && f.endsWith('.png'))
    if (!candidate) return
    const buf = fs.readFileSync(path.join(IN_DIR, candidate))
    const decoded = png.sync.read(buf)
    expect(decoded.width).toBeGreaterThan(0)
    expect(decoded.data.length).toBe(decoded.width * decoded.height * 4)
  })
})

describe('ts-png interop: error handling', () => {
  it('throws on an empty buffer', () => {
    expect(() => png.sync.read(Buffer.alloc(0))).toThrow()
  })

  it('throws on a buffer missing the PNG signature', () => {
    expect(() => png.sync.read(Buffer.from('hello world'))).toThrow()
  })

  it('throws on truncated data past the signature', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00])
    expect(() => png.sync.read(buf)).toThrow()
  })
})

describe('ts-png interop: output format', () => {
  // The consumer contract: decoded data is always 8-bit RGBA, regardless
  // of the input's native color type or bit depth.
  it('decoded data is always tightly packed RGBA', () => {
    const tests = ['basn0g01.png', 'basn0g08.png', 'basn0g16.png', 'basn2c08.png', 'basn3p08.png', 'basn6a08.png']
    for (const f of tests) {
      if (!fs.existsSync(path.join(IN_DIR, f))) continue
      const buf = fs.readFileSync(path.join(IN_DIR, f))
      const d = png.sync.read(buf)
      expect(d.data.length).toBe(d.width * d.height * 4)
    }
  })
})
