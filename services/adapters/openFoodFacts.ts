import type {
  ProductInfo,
  Nutriments,
  LookupResult,
  ProductSearchHit,
  SearchResult,
} from "types";
import type {
  ProductLookupAdapter,
  LookupOptions,
  SearchOptions,
} from "./types";


const PRODUCTION_URL = "https://world.openfoodfacts.org";
const STAGING_URL = "https://world.openfoodfacts.net";
const SEARCH_URL = "https://search.openfoodfacts.org/search";

const USER_AGENT = "Expirat/1.0 (https://github.com/expirat) react-native";


const useStaging = typeof __DEV__ !== "undefined" && __DEV__;
const STAGING_AUTH = "Basic " + btoa("off:off");

function apiBase(): string {
  return useStaging ? STAGING_URL : PRODUCTION_URL;
}

function needsAuth(url: string): boolean {
  return useStaging && url.startsWith(STAGING_URL);
}

const LOOKUP_TIMEOUT_MS = 12000;
const SEARCH_TIMEOUT_MS = 15000;


let searchAliciousDegraded = false;
let lastSalAttempt = 0;
const SAL_RETRY_MS = 300000;


const LOOKUP_FIELDS = [
  "code",
  "product_name",
  "generic_name",
  "brands",
  "quantity",
  "ingredients_text",
  "image_front_url",
  "image_front_small_url",
  "image_back_url",
  "image_packaging_url",
  "image_nutrition_url",
  "image_ingredients_url",
  "categories",
  "nutriscore_grade",
  "ecoscore_grade",
  "nova_group",
  "nova_groups",
  "nutriments",
  "serving_size",
  "serving_quantity",
  "no_servings",
  "servings_per_container",
  "allergens",
  "allergens_tags",
  "traces",
  "traces_tags",
  "labels",
  "labels_tags",
  "conservation_conditions",
  "completeness",
  "unique_scans_n",
  "scans_n",
  "languages_codes",
  "language",
  "lc",
].join(",");

export class OpenFoodFactsAdapter implements ProductLookupAdapter {
  async lookup(
    barcode: string,
    options?: LookupOptions,
  ): Promise<LookupResult> {
    const preferLang = (options?.preferLanguage || "en").slice(0, 2);
    const variants = buildVariants(barcode);
    const tried = new Set<string>();

    for (const code of variants) {
      if (tried.has(code)) continue;
      tried.add(code);

      const res = await safeFetch(
        `${apiBase()}/api/v2/product/${code}.json?fields=${encodeURIComponent(LOOKUP_FIELDS)}`,
        LOOKUP_TIMEOUT_MS,
      );

      if (res.kind === "offline") {

        if (variants.length === 1) return { kind: "offline" };
        continue;
      }

      const data = res.data;
      if (data && data.status === 1 && data.product) {
        return { kind: "found", product: parseProduct(data, code, preferLang) };
      }

    }


    return { kind: "not_found" };
  }

  static buildSearchParams(
    trimmed: string,
    options: { preferLang: string; langs: string[]; pageSize: number; page: number; sortBy?: string },
  ) {
    const fields = [
      "code",
      "product_name",
      "product_name_en",
      "brands",
      "quantity",
      "image_front_small_url",
      "image_front_thumb_url",
      "image_front_url",
      "nutriscore_grade",
      "ecoscore_grade",
      "nova_group",
      "nova_groups",
      "unique_scans_n",
      "categories",
    ].join(",");

    const salParams = new URLSearchParams();
    salParams.set("q", trimmed);
    salParams.set("langs", options.langs.join(","));
    salParams.set("page_size", String(options.pageSize));
    salParams.set("page", String(options.page));
    salParams.set("fields", fields);
    if (options.sortBy) salParams.set("sort_by", options.sortBy);

    const legacyParams = new URLSearchParams();
    legacyParams.set("search_simple", "1");
    legacyParams.set("action", "process");
    legacyParams.set("json", "1");
    legacyParams.set("search_terms", trimmed);
    legacyParams.set("page", String(options.page));
    legacyParams.set("page_size", String(options.pageSize));
    legacyParams.set("lc", options.preferLang);
    legacyParams.set("fields", fields);
    if (options.sortBy) legacyParams.set("sort_by", options.sortBy);

    return { salParams, legacyParams };
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { kind: "ok", hits: [], totalCount: 0 };
    }

    const preferLang = (options?.preferLanguage || "en").slice(0, 2);
    const langs = options?.langs && options.langs.length > 0
      ? options.langs
      : [preferLang, "en"];
    const pageSize = clamp(options?.pageSize ?? 20, 1, 50);
    const page = clamp(options?.page ?? 1, 1, 100);
    const sortBy = options?.sortBy;

    const { salParams, legacyParams } = OpenFoodFactsAdapter.buildSearchParams(
      trimmed, { preferLang, langs, pageSize, page, sortBy },
    );


    const now = Date.now();
    if (searchAliciousDegraded && (now - lastSalAttempt < SAL_RETRY_MS)) {
      return this.searchLegacy(legacyParams, preferLang);
    }


    lastSalAttempt = now;
    const salRes = await safeFetch(
      `${SEARCH_URL}?${salParams.toString()}`,
      SEARCH_TIMEOUT_MS,
    );

    if (salRes.kind === "ok") {
      searchAliciousDegraded = false;
      const data = salRes.data as
        | { hits?: any[]; count?: number | null }
        | undefined;
      const hits = (data?.hits || []).map((h) => parseSearchHit(h, preferLang));
      const totalCount =
        typeof data?.count === "number" ? data.count : null;
      return { kind: "ok", hits, totalCount };
    }


    searchAliciousDegraded = true;
    return this.searchLegacy(legacyParams, preferLang);
  }

  async searchLegacy(
    legacyParams: URLSearchParams,
    preferLang: string,
  ): Promise<SearchResult> {
    const res = await safeFetch(
      `${apiBase()}/cgi/search.pl?${legacyParams.toString()}`,
      SEARCH_TIMEOUT_MS,
    );

    if (res.kind === "offline") {
      return { kind: "offline" };
    }

    const data = res.data as
      | { products?: any[]; count?: number | null }
      | undefined;
    const products = data?.products || [];
    const hits = products.map((p) => parseLegacySearchHit(p, preferLang));
    const totalCount =
      typeof data?.count === "number" ? data.count : null;

    return { kind: "ok", hits, totalCount };
  }


  async searchRateLimited(query: string, options?: SearchOptions): Promise<SearchResult | { kind: "rate_limited" }> {
    if (!rateLimitSearch()) {
      return { kind: "rate_limited" };
    }
    return this.search(query, options);
  }
}



type FetchOutcome =
  | { kind: "ok"; data: any }
  | { kind: "offline" };


async function safeFetch(url: string, timeoutMs: number): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { "User-Agent": USER_AGENT };
    if (needsAuth(url)) {
      headers["Authorization"] = STAGING_AUTH;
    }
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) return { kind: "offline" };
    const json = await res.json();
    return { kind: "ok", data: json };
  } catch {
    return { kind: "offline" };
  } finally {
    clearTimeout(timer);
  }
}

function buildVariants(barcode: string): string[] {
  const variants = [barcode];

  if (/^\d{12}$/.test(barcode)) variants.push(`0${barcode}`);
  if (/^0\d{12}$/.test(barcode)) variants.push(barcode.slice(1));
  return variants;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}


function pickLocalized(
  p: any,
  preferLang: string,
): {
  name: string;
  ingredients: string;
  usedLang: string;
  available: string[];
  localizedNames: Record<string, string>;
  localizedIngredients: Record<string, string>;
} {
  const lc = typeof p.lc === "string" && p.lc.length === 2 ? p.lc : "en";
  const available: string[] = [];
  const localizedNames: Record<string, string> = {};
  const localizedIngredients: Record<string, string> = {};


  for (const key of Object.keys(p)) {
    const m = /^product_name_([a-z]{2})$/.exec(key);
    if (m && typeof p[key] === "string" && p[key].trim()) {
      available.push(m[1]);
      localizedNames[m[1]] = p[key];
    }
    const mi = /^ingredients_text_([a-z]{2})$/.exec(key);
    if (mi && typeof p[mi[0]] === "string" && p[mi[0]].trim()) {
      localizedIngredients[mi[1]] = p[mi[0]];
    }
  }
  available.sort((a, b) => (a === preferLang ? -1 : b === preferLang ? 1 : 0));

  const preferNameKey = `product_name_${preferLang}`;
  const preferIngredientsKey = `ingredients_text_${preferLang}`;
  const hasPreferred =
    typeof p[preferNameKey] === "string" && p[preferNameKey].trim().length > 0;

  const name =
    (hasPreferred
      ? p[preferNameKey]
      : p.product_name || p.generic_name || "") || "";

  const ingredients =
    (hasPreferred && typeof p[preferIngredientsKey] === "string"
      ? p[preferIngredientsKey]
      : p.ingredients_text || "") || "";

  const usedLang = hasPreferred ? preferLang : lc;
  return {
    name,
    ingredients,
    usedLang,
    available,
    localizedNames,
    localizedIngredients,
  };
}

function parseProduct(
  data: any,
  barcode: string,
  preferLang: string,
): ProductInfo {
  const p = data.product || {};
  const n = p.nutriments || {};

  const imageFrontUrl =
    p.image_front_url || p.image_front_small_url || "";
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

  const {
    name,
    ingredients,
    usedLang,
    available,
    localizedNames,
    localizedIngredients,
  } = pickLocalized(p, preferLang);

  const novaGroup = parseNovaGroup(p.nova_group ?? p.nova_groups);

  return {
    barcode: data.code || barcode,
    name: name || "Producto sin nombre",
    brand: joinComma(p.brands),
    genericName: p.generic_name || "",
    quantity: p.quantity || "",
    ingredients,
    imageFrontUrl,
    imageBackUrl,
    imagePackagingUrl,
    imageNutritionUrl,
    imageIngredientsUrl,
    categories: p.categories || "",
    nutriscore: p.nutriscore_grade || "",
    nutriments,
    servingSize: p.serving_size || "",
    servingQuantity: servingQty && servingQty > 0 ? servingQty : null,
    servingsPerContainer,
    ecoscore: p.ecoscore_grade || "",
    novaGroup,
    allergens: joinComma(p.allergens) || tagsToComma(p.allergens_tags),
    traces: joinComma(p.traces) || tagsToComma(p.traces_tags),
    labels: joinComma(p.labels) || tagsToComma(p.labels_tags),
    conservationConditions: p.conservation_conditions || "",
    completeness: typeof p.completeness === "number" ? p.completeness : null,
    uniqueScansN:
      typeof p.unique_scans_n === "number"
        ? p.unique_scans_n
        : typeof p.scans_n === "number"
          ? p.scans_n
          : null,
    sourceLanguage: usedLang,
    availableLanguages: available,
    localizedNames,
    localizedIngredients,
  };
}

function parseSearchHit(raw: any, preferLang: string): ProductSearchHit {

  const preferKey = `product_name_${preferLang}`;
  const name =
    (typeof raw[preferKey] === "string" && raw[preferKey].trim().length > 0
      ? raw[preferKey]
      : raw.product_name || raw.generic_name || "") || "";

  const brands = Array.isArray(raw.brands) ? raw.brands.join(", ") : "";
  const imageUrl =
    raw.image_front_small_url ||
    raw.image_front_thumb_url ||
    raw.image_front_url ||
    "";

  return {
    barcode: String(raw.code || ""),
    name: name || "Producto sin nombre",
    brand: brands,
    quantity: raw.quantity || "",
    imageUrl,
    nutriscore: raw.nutriscore_grade || "",
    ecoscore: raw.ecoscore_grade || "",
    novaGroup: parseNovaGroup(raw.nova_group ?? raw.nova_groups),
    uniqueScansN:
      typeof raw.unique_scans_n === "number" ? raw.unique_scans_n : null,
    categories: raw.categories || "",
  };
}


function parseLegacySearchHit(raw: any, preferLang: string): ProductSearchHit {
  const preferKey = `product_name_${preferLang}`;
  const name =
    (typeof raw[preferKey] === "string" && raw[preferKey].trim().length > 0
      ? raw[preferKey]
      : raw.product_name || raw.generic_name || "") || "";

  const imageUrl =
    raw.image_front_small_url ||
    raw.image_front_thumb_url ||
    raw.image_front_url ||
    "";

  return {
    barcode: String(raw.code || ""),
    name: name || "Producto sin nombre",
    brand: typeof raw.brands === "string" ? raw.brands : "",
    quantity: raw.quantity || "",
    imageUrl,
    nutriscore: raw.nutriscore_grade || "",
    ecoscore: raw.ecoscore_grade || "",
    novaGroup: parseNovaGroup(raw.nova_group ?? raw.nova_groups),
    uniqueScansN:
      typeof raw.unique_scans_n === "number" ? raw.unique_scans_n : null,
    categories: raw.categories || "",
  };
}


function parseNovaGroup(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = /^(\d+)$/.exec(String(v));
  return m ? Number(m[1]) : null;
}


function joinComma(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return "";
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}


function tagsToComma(tags: unknown): string {
  if (!Array.isArray(tags)) return "";
  return tags
    .map((t) => String(t).replace(/^[a-z]{2}:/, "").replace(/-/g, " "))
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(", ");
}



const searchTimestamps: number[] = [];
const MAX_SEARCH_PER_MIN = 9;


function rateLimitSearch(): boolean {
  const now = Date.now();
  const cutoff = now - 60000;
  while (searchTimestamps.length > 0 && searchTimestamps[0] < cutoff) {
    searchTimestamps.shift();
  }
  if (searchTimestamps.length >= MAX_SEARCH_PER_MIN) {
    return false;
  }
  searchTimestamps.push(now);
  return true;
}
