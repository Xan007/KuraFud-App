
export function isManualBarcode(barcode: string | null | undefined): boolean {
  if (!barcode) return true;
  return !/^\d+$/.test(barcode);
}
