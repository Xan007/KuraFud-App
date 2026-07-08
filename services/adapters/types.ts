import type { ProductInfo } from "types";

export interface ProductLookupAdapter {
  lookup(barcode: string): Promise<ProductInfo | null>;
}
