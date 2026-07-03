/* eslint-disable @typescript-eslint/no-namespace */

/**
 * Type declarations for Expo public environment variables (EXPO_PUBLIC_*).
 *
 * Expo SDK 52+ inlines these variables via Metro at build time and
 * auto-generates an `expo-env.d.ts` file (gitignored).  This committed
 * declaration ensures the editor and TypeScript always see the types.
 *
 * The expiration-date OCR pipeline is now 100% offline (ML Kit + regex),
 * so no runtime environment variables are required.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_APP_ENV?: "development" | "production";
  }
}
