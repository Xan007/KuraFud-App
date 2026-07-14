import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { aiSettingsRepository } from "@/db/repositories";
import { getAPIKey, setAPIKey, deleteAPIKey } from "@/services/ai/keychain";
import { getAllProviders, getProviderById } from "@/services/ai/registry";
import { createAIClient } from "@/services/ai/createAIClient";
import type { AIProviderDescriptor } from "@/services/ai/types";
import { useAppTranslation } from "@/hooks/useAppTranslation";

export default function AISettingsScreen() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [providerId, setProviderId] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const providers = useMemo(() => getAllProviders(), []);
  const currentProvider = useMemo(
    () => (providerId ? getProviderById(providerId) : null),
    [providerId],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const settings = await aiSettingsRepository.getAISettings();
        if (!mounted) return;
        setProviderId(settings.provider);
        setModel(settings.model);
        setMaxTokens(settings.maxTokens?.toString() || "");
        setCustomApiUrl(settings.customApiUrl || "");
        setCustomInstructions(settings.customInstructions);

        if (settings.provider) {
          const key = await getAPIKey(settings.provider);
          if (!mounted) return;
          if (key) {
            setSavedApiKey(key);
          }
        }
      } catch (e) {
        if (!mounted) return;
        console.error("Error loading AI settings:", e);
        showToast("Error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!providerId || !model || !apiKey) {
      showToast("Completa los campos");
      return;
    }

    setTesting(true);
    try {
      const client = createAIClient({
        providerId,
        model,
        apiKey,
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
        customApiUrl,
      });

      const result = await client.testConnection();

      if (result.success) {
        showToast("¡Conexión exitosa!");
      } else {
        showToast(result.error || "Error de conexión");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Error");
    } finally {
      setTesting(false);
    }
  }, [providerId, model, apiKey, maxTokens]);

  const handleSave = useCallback(async () => {
    if (!providerId || !model || !apiKey) {
      showToast("Completa todos los campos requeridos");
      return;
    }

    setSaving(true);
    try {
      await setAPIKey(providerId, apiKey || savedApiKey);

      await aiSettingsRepository.saveAISettings({
        provider: providerId,
        model,
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : null,
        customApiUrl,
        customInstructions,
      });

      showToast("Guardado");
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Error");
    } finally {
      setSaving(false);
    }
  }, [providerId, model, apiKey, maxTokens, customInstructions, router]);

  const handleClear = useCallback(async () => {
    if (providerId) {
      await deleteAPIKey(providerId);
    }
    setProviderId("");
    setModel("");
    setApiKey("");
    setSavedApiKey("");
    setMaxTokens("");
    setCustomApiUrl("");
    setCustomInstructions("");
  }, [providerId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title={t("aiSettings.title")} showBack onBack={() => router.back()} />
        <LoadingState message={t("common.loading")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar
        title={t("aiSettings.title")}
        showBack
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
        >

        <View style={styles.section}>
          <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
            {t("aiSettings.provider")}
          </AppText>

          <Pressable
            style={({ pressed }) => [
              styles.selectorRow,
              pressed && styles.rowPressed,
            ]}
            onPress={() => setShowProviderPicker(!showProviderPicker)}
          >
            <AppText
              variant="body"
              color={currentProvider ? Colors.text : Colors.textSecondary}
            >
              {currentProvider?.name || t("aiSettings.selectProvider")}
            </AppText>
            <SymbolView
              name={{
                ios: showProviderPicker ? "chevron.up" : "chevron.down",
                android: "expand_more",
              }}
              size={16}
              tintColor={Colors.textSecondary}
            />
          </Pressable>

          {showProviderPicker && (
            <View style={styles.pickerList}>
              {providers.map((provider, index) => (
                <Pressable
                  key={provider.id}
                  style={[
                    styles.pickerItem,
                    index === providers.length - 1 && styles.pickerItemLast,
                  ]}
                  onPress={() => {
                    setProviderId(provider.id);
                    setModel("");
                    setShowProviderPicker(false);
                  }}
                >
                  <AppText
                    variant="body"
                    color={
                      providerId === provider.id ? Colors.primary : Colors.text
                    }
                  >
                    {provider.name}
                  </AppText>
                  {providerId === provider.id && (
                    <SymbolView
                      name={{ ios: "checkmark", android: "check" }}
                      size={16}
                      tintColor={Colors.primary}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>


        {currentProvider && (
          <View style={styles.section}>
            <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
              {t("aiSettings.model")}
            </AppText>

            <TextInput
              style={styles.input}
              placeholder={t("aiSettings.enterModel")}
              placeholderTextColor={Colors.textSecondary}
              value={model}
              onChangeText={setModel}
            />

            {currentProvider.models.length > 0 && (
              <View style={styles.modelSection}>
                <View style={styles.modelChips}>
                  {currentProvider.models.map((modelOption) => (
                    <Pressable
                      key={modelOption.id}
                      style={[
                        styles.modelChip,
                        model === modelOption.id && styles.modelChipSelected,
                      ]}
                      onPress={() => setModel(modelOption.id)}
                    >
                      <AppText
                        variant="caption"
                        color={
                          model === modelOption.id
                            ? Colors.primary
                            : Colors.textSecondary
                        }
                      >
                        {modelOption.name}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}


        <View style={styles.section}>
          <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
            {t("aiSettings.apiKey")}
          </AppText>

          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t("aiSettings.apiKeyPlaceholder")}
              placeholderTextColor={Colors.textSecondary}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry={!showApiKey}
              editable={!saving && !testing}
            />
            <Pressable
              onPress={() => setShowApiKey((v) => !v)}
              hitSlop={8}
              style={styles.eyeButton}
            >
              <SymbolView
                name={{
                  ios: showApiKey ? "eye" : "eye.slash",
                  android: showApiKey ? "visibility" : "visibility_off",
                }}
                size={20}
                tintColor={Colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>


        {currentProvider &&
          currentProvider.models.some((m) => m.supportsMaxTokens) && (
            <View style={styles.section}>
              <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
                {t("aiSettings.maxTokens")}
              </AppText>

              <TextInput
                style={styles.input}
                placeholder="1024"
                placeholderTextColor={Colors.textSecondary}
                value={maxTokens}
                onChangeText={setMaxTokens}
                keyboardType="number-pad"
                editable={!saving && !testing}
              />
            </View>
          )}


        {currentProvider?.id === "custom" && (
          <View style={styles.section}>
            <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
              Base API URL
            </AppText>

            <TextInput
              style={styles.input}
              placeholder="https://tu-api.com/v1"
              placeholderTextColor={Colors.textSecondary}
              value={customApiUrl}
              onChangeText={setCustomApiUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!saving && !testing}
            />
          </View>
        )}


        <Button
          variant="outline"
          size="md"
          onPress={handleTestConnection}
          disabled={!providerId || !model || !apiKey || testing || saving}
          style={styles.testButton}
        >
          {testing ? t("aiSettings.testingConnection") : t("aiSettings.testConnection")}
        </Button>
        {testing && (
          <ActivityIndicator
            color={Colors.primary}
            style={{ marginTop: Spacing.sm }}
          />
        )}


        <View style={styles.section}>
          <AppText variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
            {t("aiSettings.customInstructions")}
          </AppText>

          <AppText
            variant="caption"
            color={Colors.textSecondary}
            style={{ marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs }}
          >
            {t("aiSettings.customInstructionsHint")}
          </AppText>

          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t("aiSettings.customInstructionsPlaceholder")}
            placeholderTextColor={Colors.textSecondary}
            value={customInstructions}
            onChangeText={setCustomInstructions}
            multiline
            numberOfLines={4}
            editable={!saving && !testing}
          />
        </View>


        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            size="md"
            onPress={() => router.back()}
            disabled={saving || testing}
            style={{ flex: 1 }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="md"
            onPress={handleSave}
            disabled={!providerId || !model || !apiKey || saving || testing}
            style={{ flex: 1 }}
          >
            {saving ? t("aiSettings.saving") : t("common.save")}
          </Button>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
    fontWeight: "700",
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xs,
  },
  displayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xs,
  },
  rowPressed: {
    opacity: 0.6,
  },
  input: {
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
  textarea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
  pickerList: {
    marginTop: Spacing.xs,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemLast: {
    borderBottomWidth: 0,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  clearButton: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  eyeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  testButton: {
    marginBottom: Spacing.xl,
  },
  modelSection: {
    marginTop: Spacing.sm,
  },
  modelChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  modelChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: withOpacity(Colors.primary, 0.08),
  },
});
