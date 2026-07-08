import { useCallback } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { Colors, Spacing } from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { AppText } from "@/components/ui/Text";
import { useAppTranslation } from "@/hooks/useAppTranslation";

const LANGUAGES: { code: "es" | "en"; labelKey: string }[] = [
  { code: "es", labelKey: "settings.languageEs" },
  { code: "en", labelKey: "settings.languageEn" },
];

export default function LanguageScreen() {
  const { t, changeLanguage, currentLanguage } = useAppTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSelect = useCallback(
    async (code: "es" | "en") => {
      await changeLanguage(code);
      router.back();
    },
    [changeLanguage, router],
  );

  return (
    <View style={styles.container}>
      <TopBar
        title={t("settings.language")}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {LANGUAGES.map((lang) => {
          const isSelected = currentLanguage === lang.code;
          return (
            <Pressable
              key={lang.code}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.rowPressed,
              ]}
              onPress={() => handleSelect(lang.code)}
            >
              <AppText
                variant="body"
                color={isSelected ? Colors.primary : Colors.text}
              >
                {t(lang.labelKey)}
              </AppText>
              {isSelected && (
                <SymbolView
                  name={{ ios: "checkmark", android: "check" }}
                  size={16}
                  tintColor={Colors.primary}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.xs,
  },
  rowPressed: {
    opacity: 0.6,
  },
});
