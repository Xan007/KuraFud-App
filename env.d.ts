/* eslint-disable @typescript-eslint/no-namespace */

/**
 * Type declarations for Expo public environment variables (EXPO_PUBLIC_*).
 *
 * Expo SDK 52+ inlines these variables via Metro at build time and
 * auto-generates an `expo-env.d.ts` file (gitignored).  This committed
 * declaration ensures the editor and TypeScript always see the types.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    /** Groq API key used for vision-based expiration-date fallback. */
    readonly EXPO_PUBLIC_GROQ_API_KEY: string;
  }
}
