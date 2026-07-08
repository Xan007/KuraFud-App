export type FrameMetrics = {
  brightness: number;
  sharpness: number;
};

function luma(r: number, g: number, b: number): number {
  "worklet";
  return (r * 77 + g * 150 + b * 29) >> 8;
}

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

  const lumaPlane = new Uint8Array(n);
  let sum = 0;
  for (let i = 0, p = 0; i < n; i++, p += 3) {
    const l = luma(pixels[p], pixels[p + 1], pixels[p + 2]);
    lumaPlane[i] = l;
    sum += l;
  }
  const brightness = sum / n;

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
