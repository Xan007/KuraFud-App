export type Rect = { x: number; y: number; width: number; height: number };

export type CameraLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GuideRect = { x: number; y: number; width: number; height: number };

export type RoiInput = {
  photoW: number;
  photoH: number;
  camLayout: CameraLayout;
  guide: GuideRect;
  expand?: number;
};

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
