import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import es from "@/locales/es.json";
import en from "@/locales/en.json";

const resources = {
  es: { translation: es },
  en: { translation: en },
};

const getDeviceLanguage = (): string => {
  const locales = getLocales();
  const locale = locales[0];
  const languageCode = locale?.languageCode || "es";
  return languageCode === "es" ? "es" : "en";
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "es",
    fallbackLng: "es",
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

i18n.addResourceBundle("es", "translation", es, true, true);
i18n.addResourceBundle("en", "translation", en, true, true);

const initializeI18n = async () => {
  let savedLanguage = null;

  try {
    savedLanguage = await AsyncStorage.getItem("app-language");
  } catch (e) {
    console.error("Error reading language from storage:", e);
  }

  const languageToUse = savedLanguage || getDeviceLanguage();
  await i18n.changeLanguage(languageToUse);
};

export const setLanguage = async (language: "es" | "en") => {
  try {
    await AsyncStorage.setItem("app-language", language);
    await i18n.changeLanguage(language);
  } catch (e) {
    console.error("Error saving language:", e);
  }
};

export const getLanguage = async (): Promise<"es" | "en"> => {
  try {
    const saved = await AsyncStorage.getItem("app-language");
    if (saved === "es" || saved === "en") {
      return saved;
    }
    return getDeviceLanguage() === "es" ? "es" : "en";
  } catch (e) {
    return getDeviceLanguage() === "es" ? "es" : "en";
  }
};

export default i18n;
export { initializeI18n };
