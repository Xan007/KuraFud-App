import type {
  ProductInfo,
  LookupResult,
  ProductSearchHit,
  SearchResult,
} from "types";


export type LookupOptions = {
  preferLanguage?: string;
};


export type SearchOptions = {
  langs?: string[];
  pageSize?: number;
  page?: number;
  sortBy?: string;
  preferLanguage?: string;
};

export interface ProductLookupAdapter {

  lookup(barcode: string, options?: LookupOptions): Promise<LookupResult>;

  search(query: string, options?: SearchOptions): Promise<SearchResult>;
}
