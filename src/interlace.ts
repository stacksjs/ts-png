/**
 * Implementation of the Adam7 interlacing algorithm for PNG images.
 * The Adam7 algorithm splits the image into 7 passes, each covering different pixels
 * in an 8x8 pattern. The pattern for each pass is shown below:
 *
 *   0 1 2 3 4 5 6 7
 * 0 1 6 4 6 2 6 4 6  // Numbers indicate the pass (1-7) that handles each pixel
 * 1 7 7 7 7 7 7 7 7
 * 2 5 6 5 6 5 6 5 6
 * 3 7 7 7 7 7 7 7 7
 * 4 3 6 4 6 3 6 4 6
 * 5 7 7 7 7 7 7 7 7
 * 6 5 6 5 6 5 6 5 6
 * 7 7 7 7 7 7 7 7 7
 */

interface InterlacePass {
  readonly x: readonly number[]
  readonly y: readonly number[]
}

interface PassDimensions {
  width: number
  height: number
  index: number
}

type InterlaceIterator = (_x: number, _y: number, _pass: number) => number

/**
 * The seven passes of the Adam7 interlacing algorithm.
 * Each pass specifies which x and y coordinates it handles in an 8x8 block.
 */
export const imagePasses: readonly InterlacePass[] = [
  { // pass 1 - 1px
    x: [0],
    y: [0],
  },
  { // pass 2 - 1px
    x: [4],
    y: [0],
  },
  { // pass 3 - 2px
    x: [0, 4],
    y: [4],
  },
  { // pass 4 - 4px
    x: [2, 6],
    y: [0, 4],
  },
  { // pass 5 - 8px
    x: [0, 2, 4, 6],
    y: [2, 6],
  },
  { // pass 6 - 16px
    x: [1, 3, 5, 7],
    y: [0, 2, 4, 6],
  },
  { // pass 7 - 32px
    x: [0, 1, 2, 3, 4, 5, 6, 7],
    y: [1, 3, 5, 7],
  },
] as const

/**
 * Calculates the dimensions of each pass for a given image size
 * @param width - The width of the image
 * @param height - The height of the image
 * @returns Array of pass dimensions, including width, height, and pass index
 */
export function getImagePasses(width: number, height: number): PassDimensions[] {
  const images: PassDimensions[] = []

  const xLeftOver = width % 8
  const yLeftOver = height % 8
  const xRepeats = (width - xLeftOver) / 8
  const yRepeats = (height - yLeftOver) / 8

  for (let i = 0; i < imagePasses.length; i++) {
    const pass = imagePasses[i]
    let passWidth = xRepeats * pass.x.length
    let passHeight = yRepeats * pass.y.length

    // Handle partial blocks at the right edge
    for (let j = 0; j < pass.x.length; j++) {
      if (pass.x[j] < xLeftOver) {
        passWidth++
      }
      else {
        break
      }
    }

    // Handle partial blocks at the bottom edge
    for (let j = 0; j < pass.y.length; j++) {
      if (pass.y[j] < yLeftOver) {
        passHeight++
      }
      else {
        break
      }
    }

    // Only include passes that have actual pixels
    if (passWidth > 0 && passHeight > 0) {
      images.push({ width: passWidth, height: passHeight, index: i })
    }
  }

  return images
}

/**
 * Creates an iterator function for interlaced pixel access
 * @param width - The width of the image
 * @returns A function that calculates the buffer index for a given x, y coordinate and pass
 */
export function getInterlaceIterator(width: number): InterlaceIterator {
  return (x: number, y: number, pass: number): number => {
    const currentPass = imagePasses[pass]

    // Calculate position within the 8x8 block
    const outerXLeftOver = x % currentPass.x.length
    const outerYLeftOver = y % currentPass.y.length

    // Calculate actual pixel coordinates
    const outerX = ((x - outerXLeftOver) / currentPass.x.length) * 8
      + currentPass.x[outerXLeftOver]
    const outerY = ((y - outerYLeftOver) / currentPass.y.length) * 8
      + currentPass.y[outerYLeftOver]

    // Convert to buffer index (assuming 4 bytes per pixel)
    return outerX * 4 + outerY * width * 4
  }
}
