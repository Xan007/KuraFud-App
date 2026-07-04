import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { InventoryUnitRow } from "@/components/InventoryUnitRow";
import { DateTimePickerSheet } from "@/components/DateTimePickerSheet";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  productRepository,
  inventoryRepository,
  notificationSettingsRepository,
} from "@/db/repositories";
import type { InventoryItem } from "@/db/schema";
import { showToast } from "@/helpers/toast";
import { formatDateString, parseDateString } from "@/helpers/format";
import { rebuildAllReminders } from "@/services/notifications";

function parseDateString2(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isExpired(dateStr: string): boolean {
  const expDate = parseDateString2(dateStr);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return expDate < today;
}

type InventoryWithProduct = InventoryItem & {
  productName: string;
  barcode: string;
};

export default function InventoryDetailsScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InventoryWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [productImage, setProductImage] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerConfirmed, setPickerConfirmed] = useState(false);

  useEffect(() => {
    if (!barcode) return;

    const load = async () => {
      try {
        const product = await productRepository.getProduct(barcode);
        if (product) {
          setProductName(product.name || "Producto");
          setProductBrand(product.brand || "");
          setProductImage(product.imageFrontUrl || "");
          const itemsWithName = product.inventory.map((inv) => ({
            ...inv,
            productName: product.name || "Producto",
            barcode: product.barcode,
          }));
          setItems(itemsWithName);
        }
      } catch (e) {
        console.error("Error loading inventory:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [barcode]);

  const handleGoogleSearch = () => {
    const query = `${barcode} ${productName}`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleOpenFoodFacts = () => {
    router.push(`/product/${barcode}`);
  };

  const handleDeleteInventoryItem = (itemId: number) => {
    Alert.alert(
      "Eliminar unidad",
      "¿Estás seguro de que deseas eliminar esta unidad?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await inventoryRepository.deleteInventoryItem(itemId);
              setItems((prev) => prev.filter((i) => i.id !== itemId));
              showToast("Unidad eliminada");
            } catch (e) {
              showToast("Error al eliminar la unidad");
            }
          },
        },
      ]
    );
  };

  const handleEditDate = (item: InventoryWithProduct) => {
    setPickerDate(parseDateString(item.expirationDate));
    setEditingItemId(item.id);
    setShowDatePicker(true);
  };

  const handleAddDate = () => {
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    setPickerDate(todayUTC);
    setEditingItemId(null);
    setShowDatePicker(true);
  };

  const handleDatePickerConfirm = async (date: Date) => {
    const formattedDate = formatDateString(date);

    try {
      if (editingItemId === null) {
        // Adding new item
        await inventoryRepository.addInventoryItem({
          barcode: barcode!,
          expirationDate: formattedDate,
          createdAt: new Date(),
        });
        showToast("Unidad agregada");
      } else {
        // Editing existing item
        await inventoryRepository.updateInventoryItem(editingItemId, {
          expirationDate: formattedDate,
        });
        showToast("Unidad actualizada");
      }
      setEditingItemId(null);

      // Reload items
      const product = await productRepository.getProduct(barcode!);
      if (product) {
        const itemsWithName = product.inventory.map((inv) => ({
          ...inv,
          productName: product.name || "Producto",
          barcode: product.barcode,
        }));
        setItems(itemsWithName);
      }

      // Rebuild reminders if notifications are enabled
      try {
        const settings = await notificationSettingsRepository.getNotificationSettings();
        if (settings.enabled) {
          await rebuildAllReminders();
        }
      } catch {
        // Fail silently on notification rebuild
      }
    } catch (e) {
      showToast("Error al guardar la unidad");
    } finally {
      setShowDatePicker(false);
    }
  };

  // Sort items: active non-expired → active expired → consumed
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aConsumed = a.consumedAt !== null;
      const bConsumed = b.consumedAt !== null;
      const aExpired = !aConsumed && isExpired(a.expirationDate);
      const bExpired = !bConsumed && isExpired(b.expirationDate);

      // Consumed at the end
      if (aConsumed && !bConsumed) return 1;
      if (!aConsumed && bConsumed) return -1;

      // Among active, expired at the end
      if (aExpired && !bExpired) return 1;
      if (!aExpired && bExpired) return -1;

      // Same category, sort by date
      return parseDateString2(a.expirationDate).getTime() -
             parseDateString2(b.expirationDate).getTime();
    });
  }, [items]);

  const handleConsumed = useCallback(
    (id: number) => {
      Alert.alert(
        "Marcar como consumido",
        "¿Este producto ya lo consumiste completamente?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Sí, lo consumí",
            style: "default",
            onPress: async () => {
              try {
                await inventoryRepository.markAsConsumed(id);
                setItems((prev) =>
                  prev.map((i) => (i.id === id ? { ...i, consumedAt: new Date() } : i)),
                );
                showToast("Marcado como consumido");
              } catch (e) {
                showToast("Error al actualizar");
              }
            },
          },
        ],
      );
    },
    [],
  );

  const handleUndo = useCallback(
    (id: number) => {
      Alert.alert(
        "Deshacer",
        "¿Recuperar este producto del historial?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Recuperar",
            style: "default",
            onPress: async () => {
              try {
                await inventoryRepository.undoConsumed(id);
                setItems((prev) =>
                  prev.map((i) => (i.id === id ? { ...i, consumedAt: null } : i)),
                );
                showToast("Recuperado");
              } catch (e) {
                showToast("Error al recuperar");
              }
            },
          },
        ],
      );
    },
    [],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title="Inventario" showBack onBack={() => router.back()} />
        <LoadingState message="Cargando..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar
        title="Inventario"
        showBack
        onBack={() => router.back()}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.id}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
        ListHeaderComponent={
          <View>
            {/* Header with image */}
            <View style={styles.header}>
              <View style={styles.imageContainer}>
                {productImage ? (
                  <Image
                    source={{ uri: productImage }}
                    style={styles.productImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <SymbolView
                      name={{ ios: "photo", android: "image" }}
                      size={24}
                      tintColor={Colors.textSecondary}
                    />
                  </View>
                )}
              </View>

              <View style={styles.headerText}>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle} numberOfLines={2}>
                    {productName}
                  </Text>
                  {productBrand && (
                    <Text style={styles.headerBrand}>{productBrand}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsRow}>
              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleOpenFoodFacts}
              >
                <SymbolView
                  name={{ ios: "info.circle", android: "info" }}
                  size={16}
                  tintColor="#fff"
                />
                <Text style={styles.buttonTextPrimary}>Consultar información</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleGoogleSearch}
              >
                <SymbolView
                  name={{ ios: "globe", android: "public" }}
                  size={16}
                  tintColor={Colors.primary}
                />
                <Text style={styles.buttonTextSecondary}>Buscar en internet</Text>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Fechas de vencimiento</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.dateCard}>
            <View style={styles.dateContent}>
              <View style={styles.dateIconContainer}>
                <SymbolView
                  name={{ ios: "calendar", android: "calendar_month" }}
                  size={18}
                  tintColor={Colors.primary}
                />
              </View>
              <View style={styles.dateInfo}>
                <Text style={styles.dateText}>{item.expirationDate}</Text>
                {item.notes && (
                  <Text style={styles.dateNotes} numberOfLines={1}>
                    {item.notes}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.dateActions}>
              <Pressable
                onPress={() => handleEditDate(item)}
                hitSlop={12}
              >
                <SymbolView
                  name={{ ios: "pencil", android: "edit" }}
                  size={16}
                  tintColor={Colors.primary}
                />
              </Pressable>
              <Pressable
                onPress={() => handleDeleteInventoryItem(item.id)}
                hitSlop={12}
              >
                <SymbolView
                  name={{ ios: "trash.fill", android: "delete" }}
                  size={16}
                  tintColor={Colors.error}
                />
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <SymbolView
              name={{ ios: "cube.fill", android: "inventory_2" }}
              size={40}
              tintColor={Colors.textSecondary}
            />
            <Text style={styles.emptyText}>No hay unidades registradas</Text>
          </View>
        }
        ListFooterComponent={
          <Pressable
            style={styles.addButton}
            onPress={handleAddDate}
          >
            <SymbolView
              name={{ ios: "plus", android: "add" }}
              size={18}
              tintColor="#fff"
            />
            <Text style={styles.addButtonText}>Agregar unidad</Text>
          </Pressable>
        }
      />

      {/* Date picker */}
      <DateTimePickerSheet
        visible={showDatePicker}
        mode="date"
        value={pickerDate}
        onChange={setPickerDate}
        onCancel={() => setShowDatePicker(false)}
        onConfirm={() => handleDatePickerConfirm(pickerDate)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  headerText: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitleContainer: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  headerBrand: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: 10,
    borderCurve: "continuous",
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonTextPrimary: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  buttonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonTextSecondary: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderCurve: "continuous",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  dateContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  dateIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  dateInfo: {
    flex: 1,
    gap: 2,
  },
  dateText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: "monospace",
  },
  dateNotes: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  dateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    borderCurve: "continuous",
    marginBottom: Spacing.lg,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: 8,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
