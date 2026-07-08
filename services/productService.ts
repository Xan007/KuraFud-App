import type { ProductInfo } from "types";
import { productRepository } from "@/db/repositories";
import { OpenFoodFactsAdapter } from "@/services/adapters/openFoodFacts";

const productCache = new Map<string, ProductInfo>();
const apiAdapter = new OpenFoodFactsAdapter();

/**
 * Looks up a product by its barcode.
 *
 * Priority order (fastest first):
 *   1. In-memory Map (session-scoped, zero I/O)
 *   2. SQLite `dataJson` (persists between sessions)
 *   3. Open Food Facts API via adapter (network)
 *
 * When the API returns a result, it is saved to both the in-memory cache AND
 * persisted to SQLite (main columns + `dataJson`) so future lookups
 * (even after app restart) are instant without a network call.
 *
 * @param barcode - The scanned barcode string.
 * @returns The parsed `ProductInfo`, or `null` when the product is not found.
 */
export async function lookupProduct(
  barcode: string,
): Promise<ProductInfo | null> {
  // 1. In-memory cache (session-scoped, zero I/O)
  const cached = productCache.get(barcode);
  if (cached) return cached;

  const variants = [barcode];
  if (/^\d{12}$/.test(barcode)) variants.push(`0${barcode}`);
  if (/^0\d{12}$/.test(barcode)) variants.push(barcode.slice(1));

  for (const v of variants) {
    const hit = productCache.get(v);
    if (hit) {
      productCache.set(barcode, hit);
      return hit;
    }
  }

  // 2. SQLite via getProductInfo (reads dataJson)
  for (const v of [barcode, ...variants]) {
    const fromDb = await productRepository.getProductInfo(v);
    if (fromDb) {
      productCache.set(v, fromDb);
      productCache.set(barcode, fromDb);
      return fromDb;
    }
  }

  // 3. Open Food Facts API via adapter (network)
  const parsed = await apiAdapter.lookup(barcode);
  if (!parsed) return null;

  productCache.set(parsed.barcode, parsed);
  productCache.set(barcode, parsed);

  // Persist to SQLite (main columns + dataJson) for future sessions
  try {
    await productRepository.upsertProduct({
      barcode: parsed.barcode,
      name: parsed.name,
      brand: parsed.brand,
      quantity: parsed.quantity,
      ingredients: parsed.ingredients,
      imageFrontUrl: parsed.imageFrontUrl,
      categories: parsed.categories,
      nutriscore: parsed.nutriscore,
      dataJson: JSON.stringify(parsed),
      createdAt: new Date(),
    });
  } catch {
    // Non-critical: don't block the response
  }

  return parsed;
}
