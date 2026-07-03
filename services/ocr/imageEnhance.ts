import { Images } from "react-native-nitro-image";

/**
 * Offline image enhancement for OCR, powered by `react-native-nitro-image`
 * (native, new-arch, no network).
 *
 * Pipeline: load file → crop to the ROI (date guide box) → downscale to a
 * working width → grayscale → contrast stretch (percentile based) → light
 * unsharp mask → save a temporary JPEG.  The returned path feeds straight into
 * ML Kit.
 *
 * All the per-pixel work happens on a small crop (a few hundred px wide), so it
 * stays cheap and only runs on frames that already passed the quality gate.
 */

export type Rect = { x: number; y: number; width: number; height: number };

/** ROI in image-pixel space, or a resolver given the loaded image's size. */
export type RoiOption =
  | Rect
  | ((width: number, height: number) => Rect | undefined);

export type EnhanceOptions = {
  /** Region of interest in **image pixel** coordinates. Omit for full frame. */
  roi?: RoiOption;
  /** Downscale the crop so its width does not exceed this (default 900). */
  maxWidth?: number;
  /** Unsharp strength, 0 disables sharpening (default 0.6). */
  sharpenAmount?: number;
  /** Output JPEG quality 0..100 (default 92). */
  quality?: number;
};

type ChannelInfo = { channels: number; r: number; g: number; b: number };

/** Maps a nitro PixelFormat string to per-pixel channel indices. */
function channelInfo(fmt: string): ChannelInfo | null {
  const r = fmt.indexOf("R");
  const g = fmt.indexOf("G");
  const b = fmt.indexOf("B");
  if (r < 0 || g < 0 || b < 0) return null; // unknown / non-RGB layout
  return { channels: fmt.length, r, g, b };
}

/** BT.601 luma from 8-bit RGB. */
function luma(r: number, g: number, b: number): number {
  return (r * 77 + g * 150 + b * 29) >> 8;
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Turns a raw RGBA-ish buffer into a contrast-stretched, sharpened grayscale
 * buffer (written back into the same channel layout).
 */
function enhanceBuffer(
  src: Uint8Array,
  width: number,
  height: number,
  info: ChannelInfo,
  sharpenAmount: number,
): Uint8Array {
  const n = width * height;
  const { channels, r, g, b } = info;

  // 1. Grayscale plane + histogram.
  const gray = new Uint8Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; i < n; i++, p += channels) {
    const l = luma(src[p + r], src[p + g], src[p + b]);
    gray[i] = l;
    hist[l]++;
  }

  // 2. Percentile-based contrast stretch (ignore 1% tails → robust to glare).
  const lowCut = n * 0.01;
  const highCut = n * 0.99;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= lowCut) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= highCut) {
      hi = v;
      break;
    }
  }
  const span = hi - lo > 1 ? hi - lo : 1;
  const scale = 255 / span;
  for (let i = 0; i < n; i++) {
    gray[i] = clamp8((gray[i] - lo) * scale);
  }

  // 3. Light unsharp mask: out = gray + amount * (gray - blur3x3(gray)).
  const out = new Uint8Array(n);
  if (sharpenAmount > 0) {
    for (let y = 0; y < height; y++) {
      const y0 = y > 0 ? y - 1 : 0;
      const y2 = y < height - 1 ? y + 1 : height - 1;
      for (let x = 0; x < width; x++) {
        const x0 = x > 0 ? x - 1 : 0;
        const x2 = x < width - 1 ? x + 1 : width - 1;
        const rowY = y * width;
        const blur =
          (gray[y0 * width + x0] +
            gray[y0 * width + x] +
            gray[y0 * width + x2] +
            gray[rowY + x0] +
            gray[rowY + x] +
            gray[rowY + x2] +
            gray[y2 * width + x0] +
            gray[y2 * width + x] +
            gray[y2 * width + x2]) /
          9;
        const c = gray[rowY + x];
        out[rowY + x] = clamp8(c + sharpenAmount * (c - blur));
      }
    }
  } else {
    out.set(gray);
  }

  // 4. Write grayscale back into every colour channel (leave A / padding).
  const dst = new Uint8Array(src.length);
  dst.set(src);
  for (let i = 0, p = 0; i < n; i++, p += channels) {
    const v = out[i];
    dst[p + r] = v;
    dst[p + g] = v;
    dst[p + b] = v;
  }
  return dst;
}

/**
 * Enhances a photo for OCR and returns the temporary file path of the result.
 * Falls back to the original path if anything goes wrong (never throws).
 */
export async function enhanceForOcr(
  photoPath: string,
  options: EnhanceOptions = {},
): Promise<string> {
  const {
    roi,
    maxWidth = 900,
    sharpenAmount = 0.6,
    quality = 92,
  } = options;

  const rawPath = photoPath.replace(/^file:\/\//, "");

  try {
    let img = await Images.loadFromFileAsync(rawPath);

    // Resolve the ROI now that the true image size is known.
    const rect =
      typeof roi === "function" ? roi(img.width, img.height) : roi;

    // Crop to the ROI (clamped to image bounds).
    if (rect) {
      const sx = Math.max(0, Math.floor(rect.x));
      const sy = Math.max(0, Math.floor(rect.y));
      const ex = Math.min(img.width, Math.ceil(rect.x + rect.width));
      const ey = Math.min(img.height, Math.ceil(rect.y + rect.height));
      if (ex - sx > 8 && ey - sy > 8) {
        img = img.crop(sx, sy, ex, ey);
      }
    }

    // Downscale wide crops to keep the pixel loops cheap.
    if (img.width > maxWidth) {
      const h = Math.round((img.height * maxWidth) / img.width);
      img = img.resize(maxWidth, h);
    }

    const raw = img.toRawPixelData();
    const info = channelInfo(raw.pixelFormat);
    if (!info) {
      // Unknown layout — save the (cropped/resized) image without pixel ops.
      return await img.saveToTemporaryFileAsync("jpg", quality);
    }

    const enhanced = enhanceBuffer(
      new Uint8Array(raw.buffer),
      raw.width,
      raw.height,
      info,
      sharpenAmount,
    );

    const result = Images.loadFromRawPixelData({
      buffer: enhanced.buffer as ArrayBuffer,
      width: raw.width,
      height: raw.height,
      pixelFormat: raw.pixelFormat,
    });

    return await result.saveToTemporaryFileAsync("jpg", quality);
  } catch {
    return photoPath;
  }
}
