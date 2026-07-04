# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Expirat** is a React Native mobile app (built with Expo) that helps track food expiration dates. It uses barcode scanning (Vision Camera) to identify products and automatic OCR (ML Kit Text Recognition) to detect expiration dates from product packaging. The app stores product metadata and inventory with SQLite (Drizzle ORM).

The UI is in Spanish.

## Architecture

### Directory Structure

- **`app/`**: Expo Router entry points. Three main screens:
  - `index.tsx` → Home screen
  - `scanner.tsx` → Barcode + date scanner
  - `product/[barcode].tsx` → Product detail/management
- **`screens/`**: Screen components (HomeScreen, BarcodeScannerScreen)
- **`components/`**: Reusable UI components
- **`db/`**: SQLite + Drizzle data layer
  - `schema.ts` — Two tables: `products` (barcode + metadata) and `inventory` (stock + expiration dates)
  - `repository.ts` — Query/mutation helpers
  - `client.ts` — Drizzle + SQLite initialization
  - `init.ts` — Database initialization and table creation
- **`services/`**: Business logic
  - `ocr/` — OCR pipeline (see below)
  - `productService.ts` — External API calls (OpenFoodFacts)
  - `dateDetection.ts` — Regex-based date extraction from OCR text
- **`hooks/`**: React hooks (e.g., `useAutoDateScanner`)
- **`constants/`**: App-wide constants (theme, colors)
- **`helpers/`**: Utility functions (date formatting, etc.)
- **`types/`**: TypeScript type definitions

### Data Model

**Products table** (keyed by barcode):
- Barcode, name, brand, quantity, ingredients, image URL, categories, Nutri-Score, creation timestamp

**Inventory table** (per-instance tracking):
- ID, barcode (FK), expiration date (DD/MM/YYYY), photo URI (date evidence), notes, creation timestamp
- Foreign key to products; cascade delete on product removal

### OCR Pipeline (services/ocr/)

The automatic expiration-date scanner is **fully offline** and uses a weighted voting consensus:

1. **Frame Capture & Enhancement** (`imageEnhance.ts`)
   - Camera worklet detects a good frame (quality gate) and signals to capture
   - Resizing, histogram equalization, contrast adjustment improve OCR accuracy

2. **Quality Gate** (`qualityGate.ts`)
   - Worklet-side frame scoring (laplacian variance, etc.)
   - Only good frames trigger capture

3. **ROI Extraction** (`roi.ts`)
   - Crops the image to focus on the date area

4. **Text Recognition** (`mlkitOcr.ts`)
   - ML Kit Text Recognition (installed via `@react-native-ml-kit/text-recognition`)

5. **Date Detection** (`dateDetection.ts`, root `services/`)
   - Regex patterns extract DD/MM/YYYY or DD/MM dates from OCR text

6. **Voting Consensus** (`voting.ts`)
   - `VoteBox` accumulates weighted readings across multiple frames
   - Accepts a date once the leader has `requiredVotes` (default 2.5) **and** leads the runner-up by `leadMargin` (default 1.5)
   - Prevents single misreadings (8→B) from being accepted prematurely

7. **Auto Scanner Orchestration** (`autoScanner.ts`)
   - Decoupled from React/camera: manages attempt cap, timeout, and inFlight state
   - Calls `onAccepted` once consensus is reached or `onExhausted` after max attempts
   - Used by `BarcodeScannerScreen` via `useAutoDateScanner` hook

### Navigation

Expo Router with a stack:
- **Home** (`/`): Browse products, manage inventory
- **Scanner** (`/scanner`): Barcode + date capture (automatic or manual)
- **Product Detail** (`/product/[barcode]`): Edit product info, manage inventory items

## Common Commands

```bash
# Start dev server (prompts for platform)
npm start

# Build and run on Android
npm run android

# Build and run on iOS
npm run ios

# Generate / migrate database schema (Drizzle Kit)
npm run db:generate
```

## Development Notes

- **Permissions**: Camera and photo library access required for barcode/date scanning
- **Environment**: EXPO_PUBLIC_APP_ENV can be "development" or "production" (optional)
- **Date Format**: Stored as `DD/MM/YYYY` text in the inventory table for consistency
- **Image Paths**: OCR and date photo URIs are local file paths from the device's temp/app storage
- **Worklets**: Camera frames are processed in React Native Worklets for performance; quality decisions and frame capture happen there before JS-side OCR pipeline
- **Drizzle**: Schema uses Drizzle's SQLite core. Relations defined in `db/relations.ts`

## Key Files to Know

- **BarcodeScannerScreen.tsx** — Main scanning UI, integrates barcode scanner + auto date OCR
- **autoScanner.ts** — Core OCR orchestration; decoupled from UI for testability
- **voting.ts** — Consensus logic; tunable via `VotingConfig` (voting tests are in the modified service files)
- **repository.ts** — All database queries; single place to understand data access patterns
- **useAutoDateScanner** — React hook wrapping `AutoScanner` for the screen

## Recent Work

- Automatic OCR with voting consensus for stable date reading (services/ocr)
- Local SQLite database with Drizzle ORM
- Manual product entry fallback when barcode lookup fails
- Image enhancement and quality gating for reliable OCR
