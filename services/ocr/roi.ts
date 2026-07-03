import type { Rect } from "./imageEnhance";

export type CameraLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GuideRect = { x: number; y: number; width: number; height: number };

export type RoiInput = {
  /** Captured photo pixel dimensions. */
  photoW: number;
  photoH: number;
  /** On-screen camera viewport (measured in window coords). */
  camLayout: CameraLayout;
  /** On-screen guide box (measured in window coords). */
  guide: GuideRect;
  /** Extra margin around the guide, as a fraction of its size (default 0.2). */
  expand?: number;
};

/**
 * Maps the on-screen date-guide box to a crop rectangle in **photo pixel**
 * space, accounting for the camera preview's `cover` scaling/overflow.
 *
 * Extracted verbatim from the previous manual `handleTakePhoto` cropping so the
 * automatic pipeline frames the exact same region the user sees.
 *
 * Returns `undefined` when inputs are degenerate (caller should OCR full frame).
 */
export function computeRoiRect(input: RoiInput): Rect | undefined {
  const { photoW, photoH, camLayout, guide, expand = 0.2 } = input;

  if (photoW <= 0 || photoH <= 0) return undefined;
  if (camLayout.width <= 0 || camLayout.height <= 0) return undefined;
  if (guide.width <= 0 || guide.height <= 0) return undefined;

  const { left: camLeft, top: camTop, width: camW, height: camH } = camLayout;
  const { x: gx, y: gy, width: gw, height: gh } = guide;

  const relGx = gx - camLeft;
  const relGy = gy - camTop;

  const coverScale = Math.max(camW / photoW, camH / photoH);
  const overflowX = Math.max(0, (photoW * coverScale - camW) / 2);
  const overflowY = Math.max(0, (photoH * coverScale - camH) / 2);

  let cropX = (relGx + overflowX) / coverScale;
  let cropY = (relGy + overflowY) / coverScale;
  let cropW = gw / coverScale;
  let cropH = gh / coverScale;

  const expandW = cropW * expand;
  const expandH = cropH * expand;
  cropX = Math.max(0, cropX - expandW);
  cropY = Math.max(0, cropY - expandH);
  cropW = Math.min(photoW - cropX, cropW + expandW * 2);
  cropH = Math.min(photoH - cropY, cropH + expandH * 2);

  return { x: cropX, y: cropY, width: cropW, height: cropH };
}
