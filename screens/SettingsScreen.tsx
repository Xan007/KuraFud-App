import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import {
  Colors,
  Spacing,
  withOpacity,
} from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { AppText } from "@/components/ui/Text";
import { LoadingState } from "@/components/ui/LoadingState";
import { DateTimePickerSheet } from "@/components/DateTimePickerSheet";
import { showToast } from "@/helpers/toast";
import {
  notificationSettingsRepository,
  reminderRepository,
  aiSettingsRepository,
} from "@/db/repositories";
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  rebuildAllReminders,
} from "@/services/notifications";
import { formatOffsetLabel } from "@/services/notifications";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { getAPIKey } from "@/services/ai/keychain";
import { getProviderById } from "@/services/ai/registry";

type NotificationOffset = {
  id: number;
  days: number;
  enabled: boolean;
};

function formatTime(hour: number, minute: number): string {
  const h = hour.toString().padStart(2, "0");
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function SettingsScreen() {
  const { t, currentLanguage } = useAppTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "denied" | "granted" | "unknown"
  >("unknown");
  const [reminderHour, setReminderHour] = useState(6);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [offsets, setOffsets] = useState<NotificationOffset[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiSettings, setAiSettings] = useState<{
    provider: string;
    providerId: string;
    model: string;
    maxTokens: number | null;
    apiKey: string;
    customApiUrl: string;
  } | null>(null);

  const pickerDate = useMemo(() => {
    const d = new Date();
    d.setHours(reminderHour, reminderMinute, 0, 0);
    return d;
  }, [reminderHour, reminderMinute]);

  useEffect(() => {
    const load = async () => {
      try {
        const settings =
          await notificationSettingsRepository.getNotificationSettings();
        setEnabled(settings.enabled);
        setReminderHour(settings.reminderHour);
        setReminderMinute(settings.reminderMinute);

        const offsetsData = await reminderRepository.getReminderOffsets();
        setOffsets(offsetsData);

        const perm = await getNotificationPermissionStatus();
        setPermissionStatus(
          perm === "granted"
            ? "granted"
            : perm === "denied"
              ? "denied"
              : "unknown",
        );

        const aiConfig = await aiSettingsRepository.getAISettings();
        if (aiConfig.provider && aiConfig.model) {
          const apiKey = await getAPIKey(aiConfig.provider);
          const provider = getProviderById(aiConfig.provider);
          setAiSettings({
            provider: provider?.name || aiConfig.provider,
            providerId: aiConfig.provider,
            model: aiConfig.model,
            maxTokens: aiConfig.maxTokens,
            apiKey: apiKey || "",
            customApiUrl: aiConfig.customApiUrl || "",
          });
        }
      } catch (e) {
        console.error("Error cargando ajustes:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggleEnabled = useCallback(
    async (value: boolean) => {
      if (value && permissionStatus !== "granted") {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setPermissionStatus("denied");
          showToast(t("messages.permissionDenied"));
          return;
        }
        setPermissionStatus("granted");
      }

      setEnabled(value);
      await notificationSettingsRepository.saveNotificationSettings({
        enabled: value,
      });
      if (value) {
        await rebuildAllReminders();
      }
    },
    [permissionStatus],
  );

  const handleTimeChange = useCallback(
    async (date: Date) => {
      const h = date.getHours();
      const m = date.getMinutes();
      setReminderHour(h);
      setReminderMinute(m);
      await notificationSettingsRepository.saveNotificationSettings({
        reminderHour: h,
        reminderMinute: m,
      });
      if (enabled) {
        await rebuildAllReminders();
      }
    },
    [enabled],
  );

  const handleOffsetToggle = useCallback(
    async (id: number, newEnabled: boolean) => {
      await reminderRepository.setReminderOffsetEnabled(id, newEnabled);
      setOffsets((prev) =>
        prev.map((o) => (o.id === id ? { ...o, enabled: newEnabled } : o)),
      );
      if (enabled) {
        await rebuildAllReminders();
      }
    },
    [enabled],
  );

  const handleDeleteOffset = useCallback(
    async (id: number) => {
      await reminderRepository.deleteReminderOffset(id);
      setOffsets((prev) => prev.filter((o) => o.id !== id));
      if (enabled) {
        await rebuildAllReminders();
      }
    },
    [enabled],
  );

  const handleRequestPermissionAgain = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermissionStatus("granted");
      setEnabled(true);
      await notificationSettingsRepository.saveNotificationSettings({
        enabled: true,
      });
      await rebuildAllReminders();
      showToast(t("messages.permissionGranted"));
    }
  }, []);

  const languageLabel =
    currentLanguage === "es" ? t("settings.languageEs") : t("settings.languageEn");

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title={t("settings.title")} />
        <LoadingState message={t("common.loading")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title={t("settings.title")} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* ─── NOTIFICATIONS ─── */}
        <View style={styles.section}>
          <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
            {t("settings.sectionNotifications")}
          </AppText>

          <View style={styles.settingRow}>
            <AppText variant="body">{t("settings.expiryReminders")}</AppText>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{
                false: Colors.border,
                true: withOpacity(Colors.primary, 0.3),
              }}
              thumbColor={enabled ? Colors.primary : Colors.textSecondary}
            />
          </View>

          {enabled && (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.settingRow,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <View>
                  <AppText variant="body">{t("settings.reminderTime")}</AppText>
                  <AppText variant="caption" color={Colors.textSecondary} style={{ marginTop: 2 }}>
                    {formatTime(reminderHour, reminderMinute)}
                  </AppText>
                </View>
                <SymbolView
                  name={{ ios: "chevron.right", android: "chevron_right" }}
                  size={14}
                  tintColor={Colors.textSecondary}
                />
              </Pressable>

              <View style={styles.reminderRulesSection}>
                <View style={styles.settingRow}>
                  <AppText variant="body">{t("settings.reminderRules")}</AppText>
                </View>

                {offsets.map((offset) => (
                  <View key={offset.id} style={styles.reminderRuleRow}>
                    <AppText variant="body" style={{ flex: 1 }}>
                      {formatOffsetLabel(offset.days)}
                    </AppText>
                    <View style={styles.reminderRuleActions}>
                      <Switch
                        value={offset.enabled}
                        onValueChange={(value) =>
                          handleOffsetToggle(offset.id, value)
                        }
                        trackColor={{
                          false: Colors.border,
                          true: withOpacity(Colors.primary, 0.3),
                        }}
                        thumbColor={
                          offset.enabled
                            ? Colors.primary
                            : Colors.textSecondary
                        }
                      />
                      <Pressable
                        onPress={() => handleDeleteOffset(offset.id)}
                        hitSlop={12}
                        style={{ marginLeft: Spacing.md }}
                      >
                        <SymbolView
                          name={{
                            ios: "trash",
                            android: "delete",
                          }}
                          size={16}
                          tintColor={Colors.textSecondary}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}

                <Pressable
                  style={({ pressed }) => [
                    styles.addReminderRow,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => router.push("/settings/add-reminder")}
                >
                  <SymbolView
                    name={{ ios: "plus.circle.fill", android: "add_circle" }}
                    size={18}
                    tintColor={Colors.primary}
                  />
                  <AppText variant="body" color={Colors.primary} style={{ marginLeft: Spacing.sm }}>
                    {t("settings.addReminder")}
                  </AppText>
                </Pressable>
              </View>
            </>
          )}

          {enabled === false && permissionStatus === "denied" && (
            <View style={styles.permissionBanner}>
              <AppText variant="caption" color={Colors.textSecondary}>
                {t("settings.permissionRequired")}
              </AppText>
              <Pressable onPress={handleRequestPermissionAgain}>
                <AppText variant="button" color={Colors.primary}>
                  {t("settings.grantPermission")}
                </AppText>
              </Pressable>
            </View>
          )}
        </View>

        {/* ─── AI ─── */}
        <View style={styles.section}>
          <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
            {t("settings.sectionAi")}
          </AppText>

          <Pressable
            style={({ pressed }) => [
              styles.settingRow,
              pressed && styles.rowPressed,
            ]}
            onPress={() => router.push("/settings/ai")}
          >
            <View>
              <AppText variant="body">{t("settings.aiProvider")}</AppText>
              <AppText
                variant="caption"
                color={
                  aiSettings ? Colors.text : Colors.textSecondary
                }
                style={{ marginTop: 2 }}
              >
                {aiSettings
                  ? aiSettings.providerId === "custom"
                    ? `${aiSettings.customApiUrl || "—"} · ${aiSettings.model}`
                    : `${aiSettings.provider} · ${aiSettings.model}`
                  : t("settings.notConfigured")}
              </AppText>
            </View>
            <SymbolView
              name={{ ios: "chevron.right", android: "chevron_right" }}
              size={14}
              tintColor={Colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* ─── GENERAL ─── */}
        <View style={styles.section}>
          <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
            {t("settings.sectionGeneral")}
          </AppText>

          <Pressable
            style={({ pressed }) => [
              styles.settingRow,
              pressed && styles.rowPressed,
            ]}
            onPress={() => router.push("/settings/language")}
          >
            <AppText variant="body">{t("settings.language")}</AppText>
            <View style={styles.settingValue}>
              <AppText variant="body" color={Colors.textSecondary}>
                {languageLabel}
              </AppText>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right" }}
                size={14}
                tintColor={Colors.textSecondary}
              />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <DateTimePickerSheet
        visible={showTimePicker}
        mode="time"
        value={pickerDate}
        onChange={handleTimeChange}
        onCancel={() => setShowTimePicker(false)}
        onConfirm={() => setShowTimePicker(false)}
      />
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
  section: {
    marginBottom: Spacing.xl + 8,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
    fontWeight: "700",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xs,
  },
  rowPressed: {
    opacity: 0.6,
  },
  settingValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reminderRulesSection: {
    marginTop: Spacing.xs,
  },
  reminderRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.xs,
    gap: Spacing.md,
  },
  reminderRuleActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  addReminderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.xs,
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
