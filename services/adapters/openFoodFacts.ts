import type { ProductInfo, Nutriments } from "types";
import type { ProductLookupAdapter } from "./types";

const BASE_URL = "https://world.openfoodfacts.org/api/v0/product";

export class OpenFoodFactsAdapter implements ProductLookupAdapter {
  async lookup(barcode: string): Promise<ProductInfo | null> {
    const variants = this.buildVariants(barcode);
    const tried = new Set<string>();

    for (const code of variants) {
      if (tried.has(code)) continue;
      tried.add(code);

      try {
        const res = await fetch(`${BASE_URL}/${code}.json`);
        const data = await res.json();

        if (data.status === 1 && data.product) {
          return parseProduct(data, code);
        }
      } catch {
        /* try the next variant */
      }
    }

    return null;
  }

  private buildVariants(barcode: string): string[] {
    const variants = [barcode];
    if (/^\d{12}$/.test(barcode)) variants.push(`0${barcode}`);
    if (/^0\d{12}$/.test(barcode)) variants.push(barcode.slice(1));
    return variants;
  }
}

function parseProduct(data: any, barcode: string): ProductInfo {
  const p = data.product;
  const n = p.nutriments || {};

  const imageFrontUrl = p.image_front_url || p.image_front_small_url || "";
  const imageBackUrl = p.image_back_url || "";
  const imagePackagingUrl = p.image_packaging_url || "";
  const imageNutritionUrl = p.image_nutrition_url || "";
  const imageIngredientsUrl = p.image_ingredients_url || "";
  const servingQty = p.serving_quantity ? Number(p.serving_quantity) : null;

  let servingsPerContainer: string | null = null;
  if (p.no_servings || p.servings_per_container) {
    servingsPerContainer = String(p.no_servings || p.servings_per_container);
  }

  const nutriments: Nutriments = {
    energyKcal100g: n["energy-kcal_100g"] ?? null,
    energyKj100g: n["energy-kj_100g"] ?? null,
    fat100g: n.fat_100g ?? null,
    saturatedFat100g: n["saturated-fat_100g"] ?? null,
    transFat100g: n["trans-fat_100g"] ?? null,
    carbohydrates100g: n.carbohydrates_100g ?? null,
    sugars100g: n.sugars_100g ?? null,
    addedSugars100g: n["added-sugars_100g"] ?? null,
    fiber100g: n.fiber_100g ?? null,
    proteins100g: n.proteins_100g ?? null,
    salt100g: n.salt_100g ?? null,
    sodium100g: n.sodium_100g ?? null,
  };

  return {
    barcode: data.code || barcode,
    name: p.product_name || p.generic_name || "Producto sin nombre",
    brand: p.brands || "",
    quantity: p.quantity || "",
    ingredients: p.ingredients_text || "",
    imageFrontUrl,
    imageBackUrl,
    imagePackagingUrl,
    imageNutritionUrl,
    imageIngredientsUrl,
    categories: p.categories || "",
    nutriscore: p.nutriscore_grade || "",
    servingSize: p.serving_size || "",
    servingQuantity: servingQty && servingQty > 0 ? servingQty : null,
    servingsPerContainer,
    nutriments,
  };
}
