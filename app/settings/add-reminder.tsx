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
  withOpacity,
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

  const loadOffsets = useCallback(async () => {
    try {
      const offsets = await reminderRepository.getReminderOffsets();
      setExistingOffsets(offsets);
    } catch (e) {
      console.error("Error loading offsets:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffsets();
  }, [loadOffsets]);

  const handleAddOffset = useCallback(
    async (days: number) => {
      try {
        const added = await reminderRepository.addReminderOffset(days);
        setExistingOffsets((prev) => [...prev, added]);
        showToast(formatOffsetLabel(days, t));
      } catch (e) {
        showToast(t("messages.errorAddingReminder"));
      }
    },
    [t],
  );

  const handleToggleOffset = useCallback(
    async (id: number, days: number, enabled: boolean) => {
      await reminderRepository.setReminderOffsetEnabled(id, !enabled);
      setExistingOffsets((prev) =>
        prev.map((o) => (o.id === id ? { ...o, enabled: !enabled } : o)),
      );
    },
    [],
  );

  const handleAddCustom = useCallback(async () => {
    const days = parseInt(customDays, 10);
    if (isNaN(days) || days < 0) {
      showToast(t("messages.invalidNumber"));
      return;
    }
    const existing = existingOffsets.find((o) => o.days === days);
    if (existing) {
      await handleToggleOffset(existing.id, existing.days, existing.enabled);
      setCustomDays("");
      return;
    }
    await handleAddOffset(days);
    setCustomDays("");
  }, [customDays, existingOffsets, handleAddOffset, handleToggleOffset, t]);

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar
          title={t("settings.addReminderTitle")}
          showBack
          onBack={() => router.back()}
        />
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

        <View style={styles.sectionHeader}>
          <SymbolView
            name={{ ios: "star.fill", android: "star" }}
            size={14}
            tintColor={Colors.primary}
          />
          <AppText variant="label" color={Colors.textSecondary}>
            {t("settings.addReminderPredefined")}
          </AppText>
        </View>

        <View style={styles.chipGrid}>
          {QUICK_ADD_OFFSETS.map((days) => {
            const existing = existingOffsets.find((o) => o.days === days);
            const isActive = !!existing?.enabled;

            return (
              <Pressable
                key={days}
                style={({ pressed }) => [
                  styles.chip,
                  isActive && styles.chipActive,
                  pressed && styles.chipPressed,
                ]}
                onPress={() => {
                  if (existing) {
                    handleToggleOffset(
                      existing.id,
                      existing.days,
                      existing.enabled,
                    );
                  } else {
                    handleAddOffset(days);
                  }
                }}
              >
                <AppText
                  variant="bodyMedium"
                  color={isActive ? Colors.primary : Colors.text}
                  style={styles.chipLabel}
                >
                  {formatOffsetLabel(days, t)}
                </AppText>
                <SymbolView
                  name={
                    isActive
                      ? { ios: "checkmark.circle.fill", android: "check_circle" }
                      : { ios: "circle", android: "radio_button_unchecked" }
                  }
                  size={18}
                  tintColor={isActive ? Colors.primary : Colors.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>


        <View style={styles.sectionHeader}>
          <SymbolView
            name={{ ios: "slider.horizontal.3", android: "tune" }}
            size={14}
            tintColor={Colors.primary}
          />
          <AppText variant="label" color={Colors.textSecondary}>
            {t("settings.addReminderCustom")}
          </AppText>
        </View>

        <View style={styles.customCard}>
          <View style={styles.customInputRow}>
            <SymbolView
              name={{ ios: "calendar.badge.plus", android: "calendar_add_on" }}
              size={18}
              tintColor={Colors.textSecondary}
            />
            <TextInput
              style={styles.customInput}
              placeholder={t("settings.customDaysPlaceholder")}
              placeholderTextColor={Colors.textSecondary}
              value={customDays}
              onChangeText={setCustomDays}
              keyboardType="number-pad"
            />
            {customDays !== "" && (
              <Pressable
                onPress={() => setCustomDays("")}
                hitSlop={8}
                style={styles.customClearBtn}
              >
                <SymbolView
                  name={{ ios: "xmark.circle.fill", android: "cancel" }}
                  size={18}
                  tintColor={Colors.textSecondary}
                />
              </Pressable>
            )}
          </View>

          <AppText variant="caption" color={Colors.textSecondary} style={styles.customHint}>
            {t("settings.customDaysHint")}
          </AppText>

          <Button
            variant="primary"
            size="md"
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
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },


  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },


  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: withOpacity(Colors.primary, 0.08),
  },
  chipPressed: {
    opacity: 0.6,
  },
  chipLabel: {
    maxWidth: 140,
  },


  customCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderCurve: "continuous",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  customInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    padding: 0,
  },
  customClearBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  customHint: {
    paddingHorizontal: Spacing.xs,
    lineHeight: 18,
  },
});
