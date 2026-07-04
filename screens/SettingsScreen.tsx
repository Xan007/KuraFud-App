import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFocusEffect } from "expo-router";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { Colors, FontSize, Spacing, BorderRadius, withOpacity } from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { LoadingState } from "@/components/ui/LoadingState";
import { DateTimePickerSheet } from "@/components/DateTimePickerSheet";
import { showToast } from "@/helpers/toast";
import {
  notificationSettingsRepository,
  reminderRepository,
} from "@/db/repositories";
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  rebuildAllReminders,
  QUICK_ADD_OFFSETS,
  formatOffsetLabel,
} from "@/services/notifications";
import { formatDateString } from "@/helpers/format";
import { useAppTranslation } from "@/hooks/useAppTranslation";

type NotificationOffset = {
  id: number;
  days: number;
  enabled: boolean;
};

export default function SettingsScreen() {
  const { t, changeLanguage, currentLanguage } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "denied" | "granted" | "unknown"
  >("unknown");
  const [reminderHour, setReminderHour] = useState(6);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [offsets, setOffsets] = useState<NotificationOffset[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newOffsetDays, setNewOffsetDays] = useState("");
  const [loading, setLoading] = useState(true);
  const [showOffsets, setShowOffsets] = useState(false);

  const pickerDate = useMemo(() => {
    const d = new Date();
    d.setHours(reminderHour, reminderMinute, 0, 0);
    return d;
  }, [reminderHour, reminderMinute]);

  // Cargar ajustes al montar
  useEffect(() => {
    const load = async () => {
      try {
        const settings = await notificationSettingsRepository.getNotificationSettings();
        setEnabled(settings.enabled);
        setReminderHour(settings.reminderHour);
        setReminderMinute(settings.reminderMinute);

        const offsetsData = await reminderRepository.getReminderOffsets();
        setOffsets(offsetsData);

        const perm = await getNotificationPermissionStatus();
        setPermissionStatus(perm === "granted" ? "granted" : perm === "denied" ? "denied" : "unknown");
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
          showToast("Permiso de notificaciones denegado");
          return;
        }
        setPermissionStatus("granted");
      }

      setEnabled(value);
      await notificationSettingsRepository.saveNotificationSettings({ enabled: value });
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
      await notificationSettingsRepository.saveNotificationSettings({ reminderHour: h, reminderMinute: m });
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
        prev.map((o) => (o.id === id ? { ...o, enabled: newEnabled } : o))
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

  const handleAddQuickOffset = useCallback(
    async (days: number) => {
      if (offsets.some((o) => o.days === days)) {
        showToast(`Ya existe un recordatorio para ${days} días`);
        return;
      }
      try {
        const newOffset = await reminderRepository.addReminderOffset(days);
        setOffsets((prev) => [...prev, newOffset].sort((a, b) => a.days - b.days));
        if (enabled) {
          await rebuildAllReminders();
        }
      } catch (e) {
        showToast("Error al agregar el recordatorio");
      }
    },
    [offsets, enabled],
  );

  const handleAddCustomOffset = useCallback(async () => {
    const days = parseInt(newOffsetDays, 10);
    if (isNaN(days) || days < 0) {
      showToast("Ingresa un número válido");
      return;
    }
    if (offsets.some((o) => o.days === days)) {
      showToast(`Ya existe un recordatorio para ${days} días`);
      return;
    }
    try {
      const newOffset = await reminderRepository.addReminderOffset(days);
      setOffsets((prev) => [...prev, newOffset].sort((a, b) => a.days - b.days));
      setNewOffsetDays("");
      if (enabled) {
        await rebuildAllReminders();
      }
    } catch (e) {
      showToast("Error al agregar el recordatorio");
    }
  }, [newOffsetDays, offsets, enabled]);

  const handleRequestPermissionAgain = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermissionStatus("granted");
      setEnabled(true);
      await notificationSettingsRepository.saveNotificationSettings({ enabled: true });
      await rebuildAllReminders();
      showToast("Permiso concedido");
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title={t('settings.title')} />
        <LoadingState message={t('common.loading')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title={t('settings.title')} />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}>
        {/* Notifications Toggle */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <AppText variant="subheading">{t('settings.expiryReminders')}</AppText>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggleEnabled}
            trackColor={{ false: Colors.border, true: withOpacity(Colors.primary, 0.3) }}
            thumbColor={enabled ? Colors.primary : Colors.textSecondary}
          />
        </View>

        {/* Permission Error */}
        {enabled === false && permissionStatus === "denied" && (
          <View style={styles.errorCard}>
            <AppText variant="body" color={Colors.errorTextStrong}>
              {t('settings.permissionRequired')}
            </AppText>
            <View style={styles.errorButtons}>
              <Button
                variant="danger"
                size="sm"
                onPress={handleRequestPermissionAgain}
              >
                {t('settings.grantPermission')}
              </Button>
            </View>
          </View>
        )}

        {/* Notification Settings Collapsed */}
        {enabled && (
          <>
            {/* Time Setting */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <AppText variant="body">{t('settings.reminderTime')}</AppText>
                <AppText variant="body" color={Colors.primary} style={{ fontSize: 16, fontWeight: '600' }}>
                  {String(reminderHour).padStart(2, "0")}:{String(reminderMinute).padStart(2, "0")}
                </AppText>
              </View>
              <Pressable onPress={() => setShowTimePicker(true)}>
                <AppText color={Colors.primary} style={{ fontSize: 14 }}>
                  {t('settings.changeTime')}
                </AppText>
              </Pressable>
            </View>

            {/* Custom Reminders Collapsible */}
            <Pressable style={styles.settingItem} onPress={() => setShowOffsets(!showOffsets)}>
              <View style={styles.settingInfo}>
                <AppText variant="subheading">{t('settings.customReminders')}</AppText>
                {offsets.length > 0 && (
                  <AppText variant="body" color={Colors.textSecondary}>
                    {offsets.length} {offsets.length === 1 ? 'recordatorio' : 'recordatorios'}
                  </AppText>
                )}
              </View>
              <SymbolView
                name={{ ios: showOffsets ? "chevron.up" : "chevron.down", android: "expand_more" }}
                size={20}
                tintColor={Colors.textSecondary}
              />
            </Pressable>

            {showOffsets && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                exiting={FadeOut.duration(200)}
              >
                {offsets.length > 0 && (
                  <View style={styles.offsetsList}>
                    {offsets.map((offset) => (
                      <View key={offset.id} style={styles.offsetRow}>
                        <View style={{ flex: 1 }}>
                          <AppText variant="body">{formatOffsetLabel(offset.days)}</AppText>
                        </View>
                        <Switch
                          value={offset.enabled}
                          onValueChange={(value) => handleOffsetToggle(offset.id, value)}
                          trackColor={{ false: Colors.border, true: withOpacity(Colors.primary, 0.3) }}
                          thumbColor={offset.enabled ? Colors.primary : Colors.textSecondary}
                        />
                        <Pressable
                          onPress={() => handleDeleteOffset(offset.id)}
                          style={{ marginLeft: Spacing.md }}
                          hitSlop={12}
                        >
                          <SymbolView
                            name={{ ios: "xmark.circle.fill", android: "cancel" }}
                            size={18}
                            tintColor={Colors.error}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* Quick Add */}
                <View style={styles.quickAddSection}>
                  <View style={styles.chipRow}>
                    {QUICK_ADD_OFFSETS.map((days) => (
                      <Chip
                        key={days}
                        label={formatOffsetLabel(days)}
                        selected={offsets.some((o) => o.days === days)}
                        disabled={offsets.some((o) => o.days === days)}
                        onPress={() => handleAddQuickOffset(days)}
                      />
                    ))}
                  </View>
                </View>

                {/* Custom Add */}
                <View style={styles.customAddRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder={t('settings.customDays')}
                    placeholderTextColor={Colors.textSecondary}
                    value={newOffsetDays}
                    onChangeText={setNewOffsetDays}
                    keyboardType="number-pad"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={handleAddCustomOffset}
                  >
                    {t('settings.add')}
                  </Button>
                </View>
              </Animated.View>
            )}
          </>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Language Section */}
        <AppText variant="body" color={Colors.textSecondary} style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
          {t('settings.language')}
        </AppText>

        <View style={styles.languageOptionsContainer}>
          <LanguageOption
            label={t('settings.spanish')}
            selected={currentLanguage === 'es'}
            onPress={() => changeLanguage('es')}
          />
          <LanguageOption
            label={t('settings.english')}
            selected={currentLanguage === 'en'}
            onPress={() => changeLanguage('en')}
          />
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

const LanguageOption = ({ label, selected, onPress }: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.languageOption,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.languageRadio, selected && styles.languageRadioSelected]}>
        {selected && <View style={styles.languageRadioDot} />}
      </View>
      <AppText variant="body">{label}</AppText>
    </Pressable>
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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  errorCard: {
    backgroundColor: Colors.errorSurface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  errorButtons: {
    marginTop: Spacing.sm,
  },
  offsetsList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: withOpacity(Colors.primary, 0.05),
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
  },
  offsetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  quickAddSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  customAddRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  customInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  languageOptionsContainer: {
    gap: Spacing.xs,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  languageRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  languageRadioSelected: {
    borderColor: Colors.primary,
    backgroundColor: withOpacity(Colors.primary, 0.1),
  },
  languageRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
});
