/**
 * Cheap, worklet-safe image metrics.
 *
 * Every function here is marked `'worklet'` so it can run inside the
 * VisionCamera Frame Output / AsyncRunner runtime (on the parallel JS worklet
 * thread) as well as on the regular JS thread.  They operate on a small,
 * down-scaled **interleaved RGB `Uint8Array`** (e.g. 128x128x3) produced by the
 * `react-native-vision-camera-resizer`, so the whole evaluation costs only a
 * few tens of thousands of integer ops per frame.
 *
 * No allocations survive the call, no native/JS-only APIs are used — keep it
 * that way so it stays safe to call from a worklet.
 */

export type FrameMetrics = {
  /** Mean luminance, 0 (black) .. 255 (white). */
  brightness: number;
  /**
   * Focus / sharpness score: mean squared luminance gradient.  Higher = more
   * high-frequency detail (in-focus, steady).  Motion blur and out-of-focus
   * frames collapse toward 0.  Roughly 0..~4000 for typical camera frames.
   */
  sharpness: number;
};

/** BT.601 luma from 8-bit RGB. */
function luma(r: number, g: number, b: number): number {
  "worklet";
  // Integer-ish weights (77,150,29)/256 to avoid floats in the hot loop.
  return (r * 77 + g * 150 + b * 29) >> 8;
}

/**
 * Computes brightness + sharpness from an interleaved RGB buffer.
 *
 * @param pixels Interleaved RGB bytes, length must be `width * height * 3`.
 * @param width  Buffer width in pixels.
 * @param height Buffer height in pixels.
 */
export function computeFrameMetrics(
  pixels: Uint8Array,
  width: number,
  height: number,
): FrameMetrics {
  "worklet";

  const n = width * height;
  if (n <= 0 || pixels.length < n * 3) {
    return { brightness: 0, sharpness: 0 };
  }

  // Pass 1: luma plane + mean brightness.
  const lumaPlane = new Uint8Array(n);
  let sum = 0;
  for (let i = 0, p = 0; i < n; i++, p += 3) {
    const l = luma(pixels[p], pixels[p + 1], pixels[p + 2]);
    lumaPlane[i] = l;
    sum += l;
  }
  const brightness = sum / n;

  // Pass 2: squared gradient (right + down neighbour).  Skips the last row/col.
  let gradSum = 0;
  let gradCount = 0;
  for (let y = 0; y < height - 1; y++) {
    const row = y * width;
    const nextRow = row + width;
    for (let x = 0; x < width - 1; x++) {
      const c = lumaPlane[row + x];
      const dx = lumaPlane[row + x + 1] - c;
      const dy = lumaPlane[nextRow + x] - c;
      gradSum += dx * dx + dy * dy;
      gradCount++;
    }
  }
  const sharpness = gradCount > 0 ? gradSum / gradCount : 0;

  return { brightness, sharpness };
}
