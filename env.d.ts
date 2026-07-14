declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_APP_ENV?: "development" | "production";
  }
}
