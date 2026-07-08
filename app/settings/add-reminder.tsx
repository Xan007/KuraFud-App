import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import {
  Colors,
  FontSize,
  Spacing,
  BorderRadius,
} from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { showToast } from "@/helpers/toast";
import { reminderRepository } from "@/db/repositories";
import {
  QUICK_ADD_OFFSETS,
  formatOffsetLabel,
} from "@/services/notifications";
import { useAppTranslation } from "@/hooks/useAppTranslation";

type ReminderOffset = {
  id: number;
  days: number;
  enabled: boolean;
};

export default function AddReminderScreen() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [existingOffsets, setExistingOffsets] = useState<ReminderOffset[]>([]);
  const [loading, setLoading] = useState(true);
  const [customDays, setCustomDays] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const offsets = await reminderRepository.getReminderOffsets();
        setExistingOffsets(offsets);
      } catch (e) {
        console.error("Error loading offsets:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const existingDays = existingOffsets.map((o) => o.days);

  const handleAddOffset = useCallback(
    async (days: number) => {
      try {
        await reminderRepository.addReminderOffset(days);
        showToast(formatOffsetLabel(days) + " añadido");
        router.back();
      } catch (e) {
        showToast(t("messages.errorAddingReminder"));
      }
    },
    [router],
  );

  const handleAddCustom = useCallback(async () => {
    const days = parseInt(customDays, 10);
    if (isNaN(days) || days < 0) {
      showToast(t("messages.invalidNumber"));
      return;
    }
    if (existingDays.includes(days)) {
      showToast(t("settings.alreadyExists", { label: formatOffsetLabel(days) }));
      return;
    }
    await handleAddOffset(days);
  }, [customDays, existingDays, handleAddOffset]);

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title={t("settings.addReminderTitle")} showBack onBack={() => router.back()} />
        <LoadingState message={t("common.loading")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar
        title={t("settings.addReminderTitle")}
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
        <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
          {t("settings.addReminderPredefined")}
        </AppText>

        {QUICK_ADD_OFFSETS.map((days) => {
          const alreadyExists = existingDays.includes(days);
          return (
            <Pressable
              key={days}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && !alreadyExists && styles.rowPressed,
                alreadyExists && styles.optionDisabled,
              ]}
              onPress={() => !alreadyExists && handleAddOffset(days)}
              disabled={alreadyExists}
            >
              <AppText
                variant="body"
                color={alreadyExists ? Colors.textSecondary : Colors.text}
              >
                {formatOffsetLabel(days)}
              </AppText>
              {alreadyExists && (
                <AppText variant="caption" color={Colors.textSecondary}>
                  {t("settings.alreadyAdded")}
                </AppText>
              )}
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
          {t("settings.addReminderCustom")}
        </AppText>

        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            placeholder={t("settings.customDaysPlaceholder")}
            placeholderTextColor={Colors.textSecondary}
            value={customDays}
            onChangeText={setCustomDays}
            keyboardType="number-pad"
          />
          <Button
            variant="primary"
            size="sm"
            onPress={handleAddCustom}
            disabled={!customDays}
          >
            {t("common.add")}
          </Button>
        </View>
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
  sectionTitle: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  rowPressed: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xl,
  },
  customRow: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
  },
  customInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
