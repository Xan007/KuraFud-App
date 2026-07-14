import type {
  ProductInfo,
  LookupResult,
  ProductSearchHit,
  SearchResult,
} from "types";
import { productRepository } from "@/db/repositories";
import { OpenFoodFactsAdapter } from "@/services/adapters/openFoodFacts";
import i18n from "@/services/i18n";

const productCache = new Map<string, ProductInfo>();
const apiAdapter = new OpenFoodFactsAdapter();


function currentLang(): string {
  const lng = (i18n.language || "es").slice(0, 2).toLowerCase();
  return lng === "en" || lng === "es" ? lng : "es";
}


export async function lookupProduct(
  barcode: string,
): Promise<LookupResult> {

  const cached = productCache.get(barcode);
  if (cached) return { kind: "found", product: cached };

  const variants = [barcode];
  if (/^\d{12}$/.test(barcode)) variants.push(`0${barcode}`);
  if (/^0\d{12}$/.test(barcode)) variants.push(barcode.slice(1));

  for (const v of variants) {
    const hit = productCache.get(v);
    if (hit) {
      productCache.set(barcode, hit);
      return { kind: "found", product: hit };
    }
  }


  for (const v of [barcode, ...variants]) {
    const fromDb = await productRepository.getProductInfo(v);
    if (fromDb) {
      productCache.set(v, fromDb);
      productCache.set(barcode, fromDb);
      return { kind: "found", product: fromDb };
    }
  }


  const result = await apiAdapter.lookup(barcode, {
    preferLanguage: currentLang(),
  });

  if (result.kind !== "found") return result;

  const parsed = result.product;
  productCache.set(parsed.barcode, parsed);
  productCache.set(barcode, parsed);


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

  }

  return { kind: "found", product: parsed };
}


export async function lookupProductOrNull(
  barcode: string,
): Promise<ProductInfo | null> {
  const r = await lookupProduct(barcode);
  return r.kind === "found" ? r.product : null;
}

export type { ProductSearchHit };


export async function searchProducts(
  query: string,
  opts?: {
    pageSize?: number;
    page?: number;
    sortBy?: string;
    langs?: string[];
  },
): Promise<SearchResult> {
  const lang = currentLang();
  const langs = opts?.langs && opts.langs.length > 0 ? opts.langs : [lang, "en"];
  return apiAdapter.search(query, {
    preferLanguage: lang,
    langs,
    pageSize: opts?.pageSize,
    page: opts?.page,
    sortBy: opts?.sortBy,
  });
}


export function clearProductCache(): void {
  productCache.clear();
}
