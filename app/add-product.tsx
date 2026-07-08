import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DateTimePickerSheet } from "@/components/DateTimePickerSheet";
import { productRepository, inventoryRepository } from "@/db/repositories";
import type { ProductWithInventory } from "@/db/schema";
import { showToast } from "@/helpers/toast";

type Phase = "choose" | "select-existing" | "new-product-form" | "add-dates";

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("choose");

  // existing product selection
  const [allProducts, setAllProducts] = useState<ProductWithInventory[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // selected product (existing or new)
  const [selectedProduct, setSelectedProduct] = useState<{
    barcode: string;
    name: string;
    imageUrl: string;
  } | null>(null);

  // new product form
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState<string | null>(null);

  // pending inventory dates
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const pickerDateRef = useRef(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (phase === "select-existing") {
      setLoadingProducts(true);
      productRepository
        .getAllProducts()
        .then(setAllProducts)
        .catch(() => showToast("Error al cargar productos"))
        .finally(() => setLoadingProducts(false));
    }
  }, [phase]);

  const filteredProducts = allProducts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      p.barcode.toLowerCase().includes(q)
    );
  });

  const handleSelectProduct = (product: ProductWithInventory) => {
    setSelectedProduct({
      barcode: product.barcode,
      name: product.name || "Producto",
      imageUrl: product.imageFrontUrl || "",
    });
    setPendingDates([]);
    setPhase("add-dates");
  };

  const handleNewProductContinue = () => {
    if (!newName.trim()) {
      showToast("El nombre del producto es obligatorio");
      return;
    }
    setPendingDates([]);
    setPhase("add-dates");
  };

  const handlePickPhoto = async () => {
    try {
      const ImagePicker = await import("expo-image-picker");
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast("Se necesita permiso para acceder a la galería");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        setNewPhoto(result.assets[0].uri);
      }
    } catch {
      showToast("Reconstruye la app para usar la galería: npx expo run:android");
    }
  };

  const handleAddDate = () => {
    setShowDatePicker(true);
  };

  const handleDateConfirm = (date: Date) => {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    const formatted = `${day}/${month}/${year}`;
    setPendingDates((prev) => [...prev, formatted]);
    setShowDatePicker(false);
  };

  const handleRemoveDate = (index: number) => {
    setPendingDates((prev) => prev.filter((_, i) => i !== index));
  };

  const resetAll = () => {
    setPendingDates([]);
    setSelectedProduct(null);
    setNewName("");
    setNewPhoto(null);
    setSearchQuery("");
    setPhase("choose");
  };

  const handleSave = async () => {
    if (pendingDates.length === 0) {
      showToast("Agrega al menos una fecha de vencimiento");
      return;
    }

    setSaving(true);

    try {
      let barcode: string;

      if (selectedProduct) {
        // existing product — just add inventory
        barcode = selectedProduct.barcode;
      } else {
        // create new product with a generated barcode
        barcode = `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await productRepository.upsertProduct({
          barcode,
          name: newName.trim(),
          brand: "",
          quantity: "",
          ingredients: "",
          imageFrontUrl: newPhoto || "",
          categories: "",
          nutriscore: "",
          createdAt: new Date(),
        });
      }

      for (const date of pendingDates) {
        await inventoryRepository.addInventoryItem({
          barcode,
          expirationDate: date,
          createdAt: new Date(),
        });
      }

      showToast(
        `${pendingDates.length} unidad${pendingDates.length !== 1 ? "es" : ""} agregada${pendingDates.length !== 1 ? "s" : ""}`,
      );
      resetAll();
    } catch {
      showToast("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (phase === "choose") {
      router.back();
    } else if (phase === "select-existing" || phase === "new-product-form") {
      setPhase("choose");
    } else {
      // add-dates
      if (selectedProduct) setPhase("select-existing");
      else setPhase("new-product-form");
    }
  };

  const getTitle = () => {
    switch (phase) {
      case "choose":
        return "Agregar producto";
      case "select-existing":
        return "Seleccionar producto";
      case "new-product-form":
        return "Nuevo producto";
      case "add-dates":
        return "Agregar fechas";
    }
  };

  const renderChoose = () => (
    <View style={styles.chooseContainer}>
      <AppText variant="subheading" color={Colors.textSecondary} style={styles.chooseHeader}>
        ¿Cómo quieres agregarlo?
      </AppText>

      <Pressable
        style={({ pressed }) => [styles.chooseCard, pressed && styles.cardPressed]}
        onPress={() => setPhase("select-existing")}
      >
        <View style={[styles.chooseIcon, { backgroundColor: Colors.primary + "15" }]}>
          <SymbolView
            name={{ ios: "arrow.triangle.swap", android: "swap_horiz" }}
            size={26}
            tintColor={Colors.primary}
          />
        </View>
        <View style={styles.chooseCardContent}>
          <AppText variant="subheading">A partir de un producto existente</AppText>
          <AppText variant="body" color={Colors.textSecondary}>
            Usa un producto que ya hayas escaneado
          </AppText>
        </View>
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={16}
          tintColor={Colors.textSecondary}
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.chooseCard, pressed && styles.cardPressed]}
        onPress={() => setPhase("new-product-form")}
      >
        <View style={[styles.chooseIcon, { backgroundColor: Colors.primary + "15" }]}>
          <SymbolView
            name={{ ios: "plus.square", android: "add_box" }}
            size={26}
            tintColor={Colors.primary}
          />
        </View>
        <View style={styles.chooseCardContent}>
          <AppText variant="subheading">Crear nuevo producto</AppText>
          <AppText variant="body" color={Colors.textSecondary}>
            Ingresa los datos manualmente
          </AppText>
        </View>
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={16}
          tintColor={Colors.textSecondary}
        />
      </Pressable>
    </View>
  );

  const renderSelectExisting = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search" }}
            size={18}
            tintColor={Colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <SymbolView
                name={{ ios: "xmark.circle.fill", android: "cancel" }}
                size={18}
                tintColor={Colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.barcode}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.productRow, pressed && styles.rowPressed]}
            onPress={() => handleSelectProduct(item)}
          >
            <View style={styles.productRowInfo}>
              <AppText variant="subheading" numberOfLines={1}>
                {item.name || "Producto"}
              </AppText>
              {item.brand && (
                <AppText variant="caption" color={Colors.textSecondary}>
                  {item.brand}
                </AppText>
              )}
            </View>
            <SymbolView
              name={{ ios: "chevron.right", android: "chevron_right" }}
              size={16}
              tintColor={Colors.textSecondary}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          loadingProducts ? (
            <View style={styles.emptyContainer}>
              <AppText variant="body" color={Colors.textSecondary}>
                Cargando...
              </AppText>
            </View>
          ) : (
            <EmptyState
              icon={
                <SymbolView
                  name={{ ios: "tray", android: "inbox" }}
                  size={40}
                  tintColor={Colors.textSecondary}
                />
              }
              title={searchQuery ? "Sin resultados" : "No hay productos"}
              subtitle={
                searchQuery
                  ? "Intenta con otro término"
                  : "Escanea productos primero"
              }
            />
          )
        }
      />
    </View>
  );

  const renderNewProductForm = () => (
    <ScrollView
      contentContainerStyle={[
        styles.formContent,
        { paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.photoSection}>
        <Pressable
          style={({ pressed }) => [
            styles.photoButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handlePickPhoto}
        >
          {newPhoto ? (
            <Image
              source={{ uri: newPhoto }}
              style={styles.photoPreview}
              contentFit="cover"
              cachePolicy="none"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <SymbolView
                name={{ ios: "camera", android: "photo_camera" }}
                size={32}
                tintColor={Colors.textSecondary}
              />
              <AppText variant="caption" color={Colors.textSecondary}>
                Añadir foto
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      <AppText variant="label" color={Colors.textSecondary} style={styles.fieldLabel}>
        NOMBRE DEL PRODUCTO
      </AppText>
      <TextInput
        style={styles.textInput}
        placeholder="Ej: Leche entera"
        placeholderTextColor={Colors.textSecondary}
        value={newName}
        onChangeText={setNewName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleNewProductContinue}
      />

      <View style={styles.formActions}>
        <Button variant="secondary" onPress={() => setPhase("choose")}>
          Volver
        </Button>
        <Button
          variant="primary"
          onPress={handleNewProductContinue}
          disabled={!newName.trim()}
          style={{ flex: 1 }}
        >
          Continuar
        </Button>
      </View>
    </ScrollView>
  );

  const renderAddDates = () => {
    const productName = selectedProduct?.name || newName.trim();
    const productImage = selectedProduct?.imageUrl || newPhoto;
    const isExisting = !!selectedProduct;

    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.datesContent,
            { paddingBottom: insets.bottom + 130 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.productHeader}>
            <View style={styles.productHeaderImage}>
              {productImage ? (
                <Image
                  source={{ uri: productImage }}
                  style={styles.productThumb}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.productThumbPlaceholder}>
                  <SymbolView
                    name={{ ios: "photo", android: "image" }}
                    size={22}
                    tintColor={Colors.textSecondary}
                  />
                </View>
              )}
            </View>
            <View style={styles.productHeaderInfo}>
              <AppText variant="subheading" numberOfLines={2}>
                {productName}
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                {isExisting
                  ? "Producto existente"
                  : "Producto nuevo"}
              </AppText>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          <AppText variant="label" color={Colors.textSecondary} style={styles.datesLabel}>
            FECHAS DE VENCIMIENTO
          </AppText>

          {pendingDates.length === 0 ? (
            <View style={styles.noDates}>
              <AppText variant="body" color={Colors.textSecondary}>
                Aún no has agregado fechas
              </AppText>
            </View>
          ) : (
            pendingDates.map((date, index) => (
              <View key={index} style={styles.dateRow}>
                <View style={styles.dateRowContent}>
                  <View style={styles.dateIcon}>
                    <SymbolView
                      name={{ ios: "calendar", android: "calendar_month" }}
                      size={18}
                      tintColor={Colors.primary}
                    />
                  </View>
                  <AppText variant="subheading" style={{ fontFamily: "monospace" }}>
                    {date}
                  </AppText>
                </View>
                <Pressable onPress={() => handleRemoveDate(index)} hitSlop={12}>
                  <SymbolView
                    name={{ ios: "trash.fill", android: "delete" }}
                    size={18}
                    tintColor={Colors.error}
                  />
                </Pressable>
              </View>
            ))
          )}

          <Pressable
            style={({ pressed }) => [
              styles.addDateButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleAddDate}
          >
            <SymbolView
              name={{ ios: "plus.circle", android: "add_circle" }}
              size={20}
              tintColor={Colors.primary}
            />
            <AppText variant="subheading" color={Colors.primary}>
              Añadir fecha
            </AppText>
          </Pressable>
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
        >
          <Button
            variant="secondary"
            onPress={resetAll}
            style={{ flex: 1 }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onPress={handleSave}
            disabled={pendingDates.length === 0 || saving}
            style={{ flex: 2 }}
          >
            {saving
              ? "Guardando..."
              : `Guardar${pendingDates.length > 0 ? ` (${pendingDates.length})` : ""}`}
          </Button>
        </View>

        <DateTimePickerSheet
          visible={showDatePicker}
          mode="date"
          value={pickerDateRef.current}
          onChange={(date) => { pickerDateRef.current = date; }}
          onCancel={() => setShowDatePicker(false)}
          onConfirm={() => handleDateConfirm(pickerDateRef.current)}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title={getTitle()} showBack onBack={handleBack} />
      {phase === "choose" && renderChoose()}
      {phase === "select-existing" && renderSelectExisting()}
      {phase === "new-product-form" && renderNewProductForm()}
      {phase === "add-dates" && renderAddDates()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── choose phase ──
  chooseContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  chooseHeader: {
    marginBottom: Spacing.sm,
  },
  chooseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    gap: Spacing.lg,
  },
  cardPressed: {
    opacity: 0.7,
  },
  chooseIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  chooseCardContent: {
    flex: 1,
    gap: Spacing.xs,
  },

  // ── select existing ──
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 32,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  productRowInfo: {
    flex: 1,
    gap: 2,
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },

  // ── new product form ──
  formContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  fieldLabel: {
    marginBottom: -Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  textInput: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },

  // ── add dates ──
  datesContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  productHeaderImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  productThumb: {
    width: "100%",
    height: "100%",
  },
  productThumbPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  productHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  datesLabel: {
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  noDates: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  dateRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dateIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  addDateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
