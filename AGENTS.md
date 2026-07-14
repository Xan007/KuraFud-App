# AGENTS.md

Project-specific guidance for AI agents working on the Expirat codebase.
See also `CLAUDE.md` for the high-level architecture overview.

## Commands

The project has no lint/format scripts set up. The only verification step
is the TypeScript compiler:

```bash
# Type check the whole project (no emit). Run this after any TS/TSX change.
npx tsc --noEmit
```

Database schema migrations:

```bash
npm run db:generate   # drizzle-kit generate (creates a migration in /migrations)
```

Dev / device commands:

```bash
npm start      # Expo dev server (prompts for platform)
npm run android
npm run ios
```

## Open Food Facts integration

- `services/adapters/openFoodFacts.ts` is the canonical offline/timeout-safe
  adapter. Both `lookup()` (barcode) and `search()` (full-text via
  Search-a-licious at `search.openfoodfacts.org`) return typed results that
  distinguish "not found" from "network failure" — never `null`.
- `services/productService.ts` adds an in-memory + SQLite cache layer. Prefer
  `lookupProduct()` (returns `LookupResult`) over the legacy
  `lookupProductOrNull()` shim. Use `searchProducts()` for full-text search.
- A `User-Agent` header is mandatory on requests. When adding fields to
  `LOOKUP_FIELDS` or `parseProduct`, keep `ProductInfo` and `emptyProduct`
  in `types/index.ts` in sync (the cache layer reads them back out of `dataJson`).

## Manual vs barcode products

Products created manually (no real barcode) carry a generated key starting
with `MANUAL-...`. Use `helpers/manualProduct.ts` → `isManualBarcode()` to
detect them. Manual products can never be looked up on Open Food Facts;
UI branches must hide OFF-related affordances for them (translate button,
"Internet" search, the Info tab content, etc.).
