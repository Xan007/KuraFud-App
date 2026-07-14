<div align="center">
  <img src="assets/icon.png" alt="KuraFud Logo" width="120" height="120" />
  <h1 align="center">KuraFud</h1>

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![React Native](https://img.shields.io/badge/React%20Native-0.76-blue.svg)](https://reactnative.dev)
  [![Expo SDK](https://img.shields.io/badge/Expo%20SDK-56-purple.svg)](https://expo.dev)
  [![Platform iOS](https://img.shields.io/badge/iOS-13%2B-green.svg)]()
  [![Platform Android](https://img.shields.io/badge/Android-8%2B-green.svg)]()
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org)

  <p align="center">
    Never waste food again. Scan barcodes, track expiration dates, and manage your pantry effortlessly.
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#screenshots">Screenshots</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#license">License</a>
  </p>
</div>

---

## Features

- **Barcode Scanning** — Instantly identify products using your camera (powered by Vision Camera + Open Food Facts API)
- **Automatic Date Detection** — OCR-powered expiration date extraction from packaging using ML Kit Text Recognition with a weighted voting consensus for accuracy
- **Receipt Scanning** — AI-powered receipt analysis to batch-add items (supports OpenAI-compatible, Gemini, and Anthropic providers)
- **Manual Entry** — Add products by hand when barcode lookup fails or for pre-existing items
- **Inventory Management** — Sort, filter, and manage your food stock with expiration tracking
- **Expiration Reminders** — Get notified before your food expires with configurable reminder offsets
- **Dark Mode** — Automatic system theme support with a clean, native-feeling UI
- **Multilingual** — English and Spanish interfaces via i18next
- **100% Offline OCR** — Date detection runs entirely on-device — no internet required for scanning

## Screenshots

<p align="center">
  <i>Screenshots coming soon</i>
</p>

## Getting Started

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (macOS) or Android Emulator

### Install

```bash
git clone https://github.com/Xan007/kurafud.git
cd kurafud
npm install
```

### Run

```bash
npm start
```

For a specific platform:

```bash
npm run android
npm run ios
```

### Database

Generate and apply schema migrations:

```bash
npm run db:generate
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Expo](https://expo.dev) SDK 56 |
| **Language** | TypeScript |
| **Navigation** | Expo Router |
| **Database** | SQLite via [Drizzle ORM](https://orm.drizzle.team) |
| **Camera** | [Vision Camera](https://github.com/mrousavy/react-native-vision-camera) v5 |
| **Barcode** | Vision Camera Barcode Scanner |
| **OCR** | ML Kit Text Recognition (on-device) |
| **AI Providers** | OpenAI-compatible, Gemini, Anthropic |
| **Product Data** | [Open Food Facts](https://world.openfoodfacts.org) API |
| **Notifications** | Expo Notifications |
| **Animations** | React Native Reanimated |
| **Icons** | SF Symbols (iOS) / Material Symbols (Android) via expo-symbols |
| **i18n** | i18next + react-i18next |

## Architecture

```
app/                    — Expo Router entry points (routes)
  _layout.tsx           — Root layout with tabs
  scanner.tsx           — Barcode + date scanner
  add-product.tsx       — Manual product entry
  product/[barcode]/    — Product detail & inventory management
screens/                — Screen components
components/             — Reusable UI components
db/                     — SQLite + Drizzle data layer
  schema.ts             — Database schema (products, inventory, notifications, AI settings)
  repositories/         — Query/mutation helpers
  client.ts             — Database initialization
services/               — Business logic
  adapters/             — Open Food Facts API adapter
  ocr/                  — Date detection OCR pipeline (voting, ROI, quality gate)
  ai/                   — AI provider abstraction (OpenAI, Gemini, Anthropic)
  notifications/        — Expiration reminder scheduling
  productService.ts     — Product lookup with caching
helpers/                — Utility functions (date formatting, barcode, manual products)
hooks/                  — Custom React hooks
constants/              — Theme, colors, spacing
types/                  — Shared TypeScript definitions
```

The **OCR pipeline** runs fully offline:

1. Quality gate evaluates each camera frame
2. ROI extraction crops to the date area
3. ML Kit recognizes text
4. Regex patterns extract dates
5. Weighted voting consensus prevents false positives

## License

Distributed under the MIT License. See `LICENSE` for more information.
