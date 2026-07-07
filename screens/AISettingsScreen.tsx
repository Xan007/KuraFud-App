import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
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

function maskApiKey(key: string): string {
  if (key.length <= 8) return key;
  const start = key.slice(0, 4);
  const end = key.slice(-4);
  return `${start}...${end}`;
}

export default function AISettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [providerId, setProviderId] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState(""); // Clave guardada anteriormente
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [maxTokens, setMaxTokens] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const providers = useMemo(() => getAllProviders(), []);
  const currentProvider = useMemo(
    () => (providerId ? getProviderById(providerId) : null),
    [providerId],
  );

  // Load settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        const settings = await aiSettingsRepository.getAISettings();
        setProviderId(settings.provider);
        setModel(settings.model);
        setMaxTokens(settings.maxTokens?.toString() || "");
        setCustomInstructions(settings.customInstructions);

        if (settings.provider) {
          const key = await getAPIKey(settings.provider);
          if (key) {
            setSavedApiKey(key);
            setApiKey(key);
          }
        }
      } catch (e) {
        console.error("Error loading AI settings:", e);
        showToast("Error");
      } finally {
        setLoading(false);
      }
    };
    load();
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
      // Save API key to keychain
      await setAPIKey(providerId, apiKey);
      setSavedApiKey(apiKey);
      setIsEditingApiKey(false);

      // Save settings to SQLite
      await aiSettingsRepository.saveAISettings({
        provider: providerId,
        model,
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : null,
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
    setMaxTokens("");
    setCustomInstructions("");
  }, [providerId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title="Proveedor de IA" />
        <LoadingState message="Cargando..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title="Proveedor de IA" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* Provider Selection */}
        <View style={styles.section}>
          <AppText
            variant="body"
            color={Colors.textSecondary}
            style={styles.label}
          >
            Proveedor
          </AppText>

          <Pressable
            style={styles.dropdown}
            onPress={() => setShowProviderPicker(!showProviderPicker)}
          >
            <AppText variant="body">
              {currentProvider?.name || "Selecciona un proveedor"}
            </AppText>
            <SymbolView
              name={{
                ios: showProviderPicker ? "chevron.up" : "chevron.down",
                android: "expand_more",
              }}
              size={20}
              tintColor={Colors.textSecondary}
            />
          </Pressable>

          {showProviderPicker && (
            <View style={styles.pickerList}>
              {providers.map((provider) => (
                <Pressable
                  key={provider.id}
                  style={styles.pickerItem}
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
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Model Selection/Input */}
        {currentProvider && (
          <View style={styles.section}>
            <AppText
              variant="body"
              color={Colors.textSecondary}
              style={styles.label}
            >
              Modelo
            </AppText>

            <TextInput
              style={styles.input}
              placeholder="Ingresa el ID del modelo"
              placeholderTextColor={Colors.textSecondary}
              value={model}
              onChangeText={setModel}
            />

            {/* Suggested Models (if any) */}
            {currentProvider.models.length > 0 && (
              <View style={styles.suggestedModels}>
                <AppText
                  variant="body"
                  color={Colors.textSecondary}
                  style={{ fontSize: 12 }}
                >
                  Modelos disponibles:
                </AppText>
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
                        variant="body"
                        color={
                          model === modelOption.id
                            ? Colors.primary
                            : Colors.text
                        }
                        style={{ fontSize: 12 }}
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

        {/* API Key */}
        <View style={styles.section}>
          <AppText
            variant="body"
            color={Colors.textSecondary}
            style={styles.label}
          >
            Clave API
          </AppText>
          {savedApiKey && !isEditingApiKey ? (
            <Pressable
              style={styles.dropdown}
              onPress={() => setIsEditingApiKey(true)}
            >
              <AppText variant="body">{maskApiKey(savedApiKey)}</AppText>
              <AppText
                variant="body"
                color={Colors.primary}
                style={{ fontSize: 12 }}
              >
                Tocar para editar
              </AppText>
            </Pressable>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu clave API"
              placeholderTextColor={Colors.textSecondary}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              editable={!saving && !testing}
            />
          )}
        </View>

        {/* Max Tokens (conditional) */}
        {currentProvider &&
          currentProvider.models.some((m) => m.supportsMaxTokens) && (
            <View style={styles.section}>
              <AppText
                variant="body"
                color={Colors.textSecondary}
                style={styles.label}
              >
                Máximo de tokens (opcional)
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

        {/* Test Connection Button */}
        <View style={styles.section}>
          <Button
            variant="outline"
            size="md"
            onPress={handleTestConnection}
            disabled={!providerId || !model || !apiKey || testing || saving}
          >
            {testing ? "Probando conexión..." : "Probar conexión"}
          </Button>
          {testing && (
            <ActivityIndicator
              color={Colors.primary}
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </View>

        {/* Custom Instructions */}
        <View style={styles.section}>
          <AppText variant="subheading" style={styles.label}>
            Instrucciones de IA personalizadas
          </AppText>
          <AppText
            variant="body"
            color={Colors.textSecondary}
            style={styles.hint}
          >
            Contexto opcional. Escribe cualquier información que consideres
            importante para personalizar las respuestas de la IA.
          </AppText>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Escribe cualquier contexto importante..."
            placeholderTextColor={Colors.textSecondary}
            value={customInstructions}
            onChangeText={setCustomInstructions}
            multiline
            numberOfLines={4}
            editable={!saving && !testing}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            size="md"
            onPress={() => router.back()}
            disabled={saving || testing}
            style={{ flex: 1 }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onPress={handleSave}
            disabled={!providerId || !model || !apiKey || saving || testing}
            style={{ flex: 1 }}
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </View>

        {providerId && (
          <Pressable
            onPress={handleClear}
            disabled={saving || testing}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <AppText color={Colors.error} variant="body">
              Limpiar configuración
            </AppText>
          </Pressable>
        )}
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
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  hint: {
    fontSize: FontSize.sm,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
  },
  input: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
  pickerList: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    marginTop: -Spacing.sm,
    overflow: "hidden",
  },
  pickerItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  clearButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  suggestedModels: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  modelChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  modelChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    borderCurve: "continuous",
  },
  modelChipSelected: {
    backgroundColor: withOpacity(Colors.primary, 0.1),
    borderColor: Colors.primary,
  },
});
