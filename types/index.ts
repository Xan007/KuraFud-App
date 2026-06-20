/** Available screen identifiers for manual navigation. */
export enum Screen {
  Home = "Home",
  BarcodeScanner = "BarcodeScanner",
}

/** Serializable navigation state used by the navigation store. */
export type NavigationState = {
  screen: Screen;
  params?: Record<string, unknown>;
};

/** Nutritional values per 100 g of product.  `null` means the data is unavailable. */
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

/** Product data returned by the Open Food Facts API. */
export type ProductInfo = {
  barcode: string;
  name: string;
  brand: string;
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
  /** Human-readable serving size, e.g. "100 g" or "1 cookie (30 g)". */
  servingSize: string;
  /** Numeric serving quantity in grams. */
  servingQuantity: number | null;
  /** Number of servings per container, when available. */
  servingsPerContainer: string | null;
};

/** Default / empty product used before data is loaded. */
export const emptyProduct: ProductInfo = {
  barcode: "",
  name: "",
  brand: "",
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
};
