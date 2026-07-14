export enum Screen {
  Home = "Home",
  BarcodeScanner = "BarcodeScanner",
}

export type NavigationState = {
  screen: Screen;
  params?: Record<string, unknown>;
};

export type Nutriments = {
  energyKcal100g: number | null;
  energyKj100g: number | null;
  fat100g: number | null;
  saturatedFat100g: number | null;
  transFat100g: number | null;
  carbohydrates100g: number | null;
  sugars100g: number | null;
  addedSugars100g: number | null;
  fiber100g: number | null;
  proteins100g: number | null;
  salt100g: number | null;
  sodium100g: number | null;
};


export type LocalizedInfo = {

  lang: string;

  name: string;

  ingredients: string;
};

export type ProductInfo = {
  barcode: string;
  name: string;
  brand: string;

  genericName: string;
  quantity: string;
  ingredients: string;
  imageFrontUrl: string;
  imageBackUrl: string;
  imagePackagingUrl: string;
  imageNutritionUrl: string;
  imageIngredientsUrl: string;
  categories: string;
  nutriscore: string;
  nutriments: Nutriments;

  servingSize: string;

  servingQuantity: number | null;

  servingsPerContainer: string | null;

  ecoscore: string;

  novaGroup: number | null;

  allergens: string;

  traces: string;

  labels: string;

  conservationConditions: string;

  completeness: number | null;

  uniqueScansN: number | null;

  sourceLanguage: string;

  availableLanguages: string[];

  localizedNames: Record<string, string>;

  localizedIngredients: Record<string, string>;
};

export const emptyProduct: ProductInfo = {
  barcode: "",
  name: "",
  brand: "",
  genericName: "",
  quantity: "",
  ingredients: "",
  imageFrontUrl: "",
  imageBackUrl: "",
  imagePackagingUrl: "",
  imageNutritionUrl: "",
  imageIngredientsUrl: "",
  categories: "",
  nutriscore: "",
  nutriments: {
    energyKcal100g: null,
    energyKj100g: null,
    fat100g: null,
    saturatedFat100g: null,
    transFat100g: null,
    carbohydrates100g: null,
    sugars100g: null,
    addedSugars100g: null,
    fiber100g: null,
    proteins100g: null,
    salt100g: null,
    sodium100g: null,
  },
  servingSize: "",
  servingQuantity: null,
  servingsPerContainer: null,
  ecoscore: "",
  novaGroup: null,
  allergens: "",
  traces: "",
  labels: "",
  conservationConditions: "",
  completeness: null,
  uniqueScansN: null,
  sourceLanguage: "en",
  availableLanguages: [],
  localizedNames: {},
  localizedIngredients: {},
};


export type ProductSearchHit = {
  barcode: string;
  name: string;
  brand: string;
  quantity: string;
  imageUrl: string;
  nutriscore: string;
  ecoscore: string;
  novaGroup: number | null;

  uniqueScansN: number | null;
  categories: string;
};


export type LookupResult =
  | { kind: "found"; product: ProductInfo }
  | { kind: "not_found" }
  | { kind: "offline" };


export type SearchResult =
  | { kind: "ok"; hits: ProductSearchHit[]; totalCount: number | null }
  | { kind: "offline" };
