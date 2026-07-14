import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Linking,
} from "react-native";
import Animated, {
  LinearTransition,
  LayoutAnimationConfig,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { InventoryUnitRow } from "@/components/InventoryUnitRow";
import { EditUnitSheet } from "@/components/EditUnitSheet";
import { DateTimePickerSheet } from "@/components/DateTimePickerSheet";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { Snackbar, type SnackbarState } from "@/components/Snackbar";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { AppText } from "@/components/ui/Text";
import { ProductDetailInfo } from "@/components/ProductDetailInfo";
import { ImageViewer } from "@/components/ImageViewer";
import {
  productRepository,
  inventoryRepository,
  notificationSettingsRepository,
} from "@/db/repositories";
import type { InventoryItem, ProductWithInventory } from "@/db/schema";
import { formatDateString, parseDateString, isExpired } from "@/helpers/format";
import { isManualBarcode } from "@/helpers/manualProduct";
import { rebuildAllReminders } from "@/services/notifications";
import { useAppTranslation } from "@/hooks/useAppTranslation";

type Tab = "inventory" | "info";

type InventoryWithSnap = InventoryItem & {

  productName: string;
  productBrand: string;
  productImage: string;
  barcode: string;
};


export default function ProductScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useAppTranslation();

  const [loading, setLoading] = useState(true);
  const [productSnap, setProductSnap] = useState<ProductWithInventory | null>(null);
  const [items, setItems] = useState<InventoryWithSnap[]>([]);
  const [tab, setTab] = useState<Tab>("inventory");


  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());


  const [showAddSheet, setShowAddSheet] = useState(false);
  const addDateRef = useRef(new Date());


  const [imageViewerOpen, setImageViewerOpen] = useState(false);


  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const snackbarIdRef = useRef(0);

  const isManual = isManualBarcode(barcode);

  const todayUTC = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }, []);

  const loadProduct = useCallback(async () => {
    if (!barcode) return;
    try {
      const product = await productRepository.getProduct(barcode);
      if (product) {
        setProductSnap(product);
        const mapped: InventoryWithSnap[] = product.inventory
          .filter((inv) => inv.consumedAt === null)
          .map((inv) => ({
            ...inv,
            productName: product.name || t("product.title"),
            productBrand: product.brand || "",
            productImage: product.imageFrontUrl || "",
            barcode,
          }));
        setItems(mapped);
      }
    } catch (e) {
      console.error("Error loading product:", e);
    } finally {
      setLoading(false);
    }
  }, [barcode, t]);

  const rebuildRemindersIfEnabled = useCallback(async () => {
    try {
      const settings = await notificationSettingsRepository.getNotificationSettings();
      if (settings.enabled) await rebuildAllReminders();
    } catch {

    }
  }, []);


  const pendingDeleteRef = useRef<{ id: number; item: InventoryWithSnap } | null>(null);

  const flushPendingDelete = useCallback(async () => {
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    pendingDeleteRef.current = null;
    try {
      await inventoryRepository.deleteInventoryItem(pending.id);
      rebuildRemindersIfEnabled();
    } catch {

    }
  }, [rebuildRemindersIfEnabled]);

  useFocusEffect(
    useCallback(() => {
      loadProduct();

      return () => {
        flushPendingDelete();
      };
    }, [loadProduct, flushPendingDelete]),
  );

  const showSnackbar = useCallback(
    (s: Omit<SnackbarState, "id">) => {

      flushPendingDelete();
      const id = ++snackbarIdRef.current;
      setSnackbar({ id, ...s });
    },
    [flushPendingDelete],
  );

  const handleSnackbarDismiss = useCallback(() => {
    setSnackbar(null);
    flushPendingDelete();
  }, [flushPendingDelete]);


  const handleEditDate = useCallback((item: InventoryItem) => {
    setPickerDate(item.expirationDate ? parseDateString(item.expirationDate) : new Date());
    setEditingItemId(item.id);
    setShowEditSheet(true);
  }, []);

  const handleAddDate = useCallback(() => {
    const today = new Date();
    const startOfToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    addDateRef.current = startOfToday;
    setShowAddSheet(true);
  }, []);

  const handleAddDateConfirm = useCallback(async () => {
    const formattedDate = formatDateString(addDateRef.current);
    setShowAddSheet(false);

    await flushPendingDelete();

    try {
      const saved = await inventoryRepository.addInventoryItem({
        barcode: barcode!,
        expirationDate: formattedDate,
        createdAt: new Date(),
      });
      setItems((prev) => [
        ...prev,
        {
          ...saved,
          productName: productSnap?.name || t("product.title"),
          productBrand: productSnap?.brand || "",
          productImage: productSnap?.imageFrontUrl || "",
          barcode: barcode!,
        },
      ]);
      rebuildRemindersIfEnabled();
    } catch {

    }
  }, [barcode, productSnap, t, flushPendingDelete, rebuildRemindersIfEnabled]);

  const handleGoogleSearch = () => {
    const name = productSnap?.name || "";
    const url = `https://www.google.com/search?q=${encodeURIComponent(`${barcode} ${name}`)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleDatePickerConfirm = useCallback(async () => {
    try {
      const formattedDate = formatDateString(pickerDate);
      const editingId = editingItemId;
      setEditingItemId(null);


      await flushPendingDelete();

      if (editingId === null) {

        try {
          const saved = await inventoryRepository.addInventoryItem({
            barcode: barcode!,
            expirationDate: formattedDate,
            createdAt: new Date(),
          });
          setItems((prev) => [
            ...prev,
            {
              ...saved,
              productName: productSnap?.name || t("product.title"),
              productBrand: productSnap?.brand || "",
              productImage: productSnap?.imageFrontUrl || "",
              barcode: barcode!,
            },
          ]);
          rebuildRemindersIfEnabled();
        } catch {

        }
      } else {

        setItems((prev) =>
          prev.map((i) => (i.id === editingId ? { ...i, expirationDate: formattedDate } : i)),
        );
        try {
          await inventoryRepository.updateInventoryItem(editingId, {
            expirationDate: formattedDate,
          });
          rebuildRemindersIfEnabled();
        } catch {
          await loadProduct();
        }
      }
    } catch {

    }
  }, [
    pickerDate,
    editingItemId,
    barcode,
    productSnap,
    t,
    flushPendingDelete,
    rebuildRemindersIfEnabled,
    loadProduct,
  ]);


  const [confirmSheet, setConfirmSheet] = useState<{
    type: "consume" | "delete";
    id: number;
    isExpired?: boolean;
  } | null>(null);

  const deleteUnit = useCallback(
    (id: number) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      setItems((prev) => prev.filter((i) => i.id !== id));
      showSnackbar({
        message: t("messages.unitDeleted"),
        actionLabel: t("messages.undoAction"),
        onAction: () => {
          pendingDeleteRef.current = null;
          setItems((prev) => (prev.some((i) => i.id === id) ? prev : [...prev, item]));
        },
      });

      pendingDeleteRef.current = { id, item };
    },
    [items, t, showSnackbar],
  );

  const consumeUnit = useCallback(
    async (id: number) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      setItems((prev) => prev.filter((i) => i.id !== id));
      try {
        await inventoryRepository.markAsConsumed(id);
        rebuildRemindersIfEnabled();
      } catch {

      }
      showSnackbar({
        message: t("messages.markedAsConsumed"),
        actionLabel: t("messages.undoAction"),
        onAction: async () => {
          setItems((prev) => (prev.some((i) => i.id === id) ? prev : [...prev, item]));
          try {
            await inventoryRepository.undoConsumed(id);
            rebuildRemindersIfEnabled();
          } catch {

          }
        },
      });
    },
    [items, t, showSnackbar, rebuildRemindersIfEnabled],
  );

  const handleConsumed = useCallback(
    (id: number) => {
      const item = items.find((i) => i.id === id);
      setConfirmSheet({
        type: "consume",
        id,
        isExpired: item ? isExpired(item.expirationDate) : false,
      });
    },
    [items],
  );

  const handleDeleteFromRow = useCallback((id: number) => {
    setConfirmSheet({ type: "delete", id });
  }, []);

  const handleConfirmSheetConfirm = useCallback(async () => {
    if (!confirmSheet) return;
    const { id, type } = confirmSheet;
    setConfirmSheet(null);
    if (type === "delete") {
      deleteUnit(id);
    } else {
      await consumeUnit(id);
    }
  }, [confirmSheet, deleteUnit, consumeUnit]);

  const handleDeleteUnit = useCallback(() => {
    if (editingItemId === null) return;
    deleteUnit(editingItemId);
    setEditingItemId(null);
  }, [editingItemId, deleteUnit]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aExpired = isExpired(a.expirationDate);
      const bExpired = isExpired(b.expirationDate);
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      return (
        parseDateString(a.expirationDate).getTime() -
        parseDateString(b.expirationDate).getTime()
      );
    });
  }, [items]);

  const nearestExpiry = sortedItems[0]?.expirationDate || "";

  const totalUnits = items.length;

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title={t("product.title")} showBack onBack={() => router.back()} />
        <LoadingState message={t("common.loading")} />
      </View>
    );
  }

  const headerImage = productSnap?.imageFrontUrl ?? "";
  const headerName = productSnap?.name || t("product.title");
  const headerBrand = productSnap?.brand || "";

  return (
    <View style={styles.container}>
      <TopBar
        title={isManual ? t("product.badgeManualLong") : t("product.title")}
        showBack
        onBack={() => router.back()}
        rightSlot={
          !isManual && barcode ? (
            <Pressable onPress={handleGoogleSearch} hitSlop={10} style={styles.searchGlobeBtn}>
              <SymbolView
                name={{ ios: "globe", android: "public" }}
                size={20}
                tintColor={Colors.primary}
              />
              <View style={styles.searchGlobeMagnifier}>
                <SymbolView
                  name={{ ios: "magnifyingglass", android: "search" }}
                  size={11}
                  tintColor={Colors.primary}
                />
              </View>
            </Pressable>
          ) : null
        }
      />


      <View style={styles.header}>
        <Pressable
          style={styles.imageContainer}
          onPress={() => headerImage && setImageViewerOpen(true)}
          disabled={!headerImage}
        >
          {headerImage ? (
            <Image
              source={{ uri: headerImage }}
              style={styles.productImage}
              contentFit="cover"
              cachePolicy="memory-disk"
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
        </Pressable>
        <View style={styles.headerText}>
          <AppText variant="subheading" numberOfLines={2}>
            {headerName}
          </AppText>
          {headerBrand ? (
            <AppText variant="body" color={Colors.textSecondary} numberOfLines={1}>
              {headerBrand}
            </AppText>
          ) : null}
          {isManual ? (
            <View style={styles.badgeWrap}>
              <Badge label={t("product.badgeManual")} tone="neutral" />
            </View>
          ) : null}
          {totalUnits > 0 && nearestExpiry ? (
            <View style={styles.headerMeta}>
              <AppText variant="caption" color={Colors.textSecondary}>
                {totalUnits} {totalUnits === 1 ? "unidad" : "unidades"}
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                •
              </AppText>
              <AppText
                variant="caption"
                color={isExpired(nearestExpiry) ? Colors.error : Colors.textSecondary}
                style={isExpired(nearestExpiry) && { fontWeight: "600" }}
              >
                {nearestExpiry}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>


      <View style={styles.tabsRow}>
        <TabButton
          active={tab === "inventory"}
          onPress={() => setTab("inventory")}
          label={t("product.tabInventory")}
        />
        <TabButton
          active={tab === "info"}
          onPress={() => setTab("info")}
          label={t("product.tabInfo")}
          disabled={false}
        />
      </View>

      {tab === "inventory" ? (
        <LayoutAnimationConfig skipEntering>
        <Animated.FlatList
          data={sortedItems}
          keyExtractor={(item) => `${item.id}`}
          itemLayoutAnimation={LinearTransition.duration(220)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          renderItem={({ item }: { item: InventoryWithSnap }) => (
            <InventoryUnitRow
              item={item}
              isExpired={isExpired(item.expirationDate)}
              onConsumed={handleConsumed}
              onEdit={handleEditDate}
              onDelete={handleDeleteFromRow}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <SymbolView
                name={{ ios: "cube.fill", android: "inventory_2" }}
                size={40}
                tintColor={Colors.textSecondary}
              />
              <AppText variant="body" color={Colors.textSecondary}>
                {t("product.noUnits")}
              </AppText>
            </View>
          }
          ListFooterComponent={
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}
              onPress={handleAddDate}
            >
              <SymbolView
                name={{ ios: "plus", android: "add" }}
                size={18}
                tintColor="#fff"
              />
              <AppText variant="button" color={Colors.white}>
                {t("product.addUnit")}
              </AppText>
            </Pressable>
          }
        />
        </LayoutAnimationConfig>
      ) : (
        <ProductDetailInfo
          barcode={barcode || ""}
          localSnapshot={{
            name: headerName,
            brand: headerBrand,
            imageFrontUrl: headerImage,
          }}
          t={t}
        />
      )}

      <EditUnitSheet
        visible={showEditSheet}
        date={pickerDate}
        onChangeDate={setPickerDate}
        onCancel={() => setShowEditSheet(false)}
        onConfirm={handleDatePickerConfirm}
        onDelete={handleDeleteUnit}
        showDelete={true}
        confirmLabel={t("common.save")}
        cancelLabel={t("common.cancel")}
        sheetTitle={t("product.editUnitSheetTitle")}
        deleteConfirmTitle={t("product.deleteConfirmTitle")}
        deleteConfirmBody={t("product.deleteConfirmBody")}
        deleteConfirmLabel={t("product.deleteConfirmLabel")}
        deleteCancelLabel={t("common.cancel")}
        labels={{
          day: t("product.labelDay"),
          month: t("product.labelMonth"),
          year: t("product.labelYear"),
        }}
        orderByLabel={t("product.selectOrderBy")}
        orderDmyLabel={t("product.orderDmy")}
        orderMdyLabel={t("product.orderMdy")}
        monthModeByLabel={t("product.selectMonthModeBy")}
        monthModeNumberLabel={t("product.monthModeNumber")}
        monthModeNameLabel={t("product.monthModeName")}
        minDate={todayUTC}
      />

      <DateTimePickerSheet
        visible={showAddSheet}
        mode="date"
        value={addDateRef.current}
        onChange={(date) => { addDateRef.current = date; }}
        onCancel={() => setShowAddSheet(false)}
        onConfirm={handleAddDateConfirm}
      />

      <ImageViewer
        images={headerImage ? [headerImage] : []}
        visible={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
      />

      <ConfirmSheet
        visible={confirmSheet !== null}
        icon={
          confirmSheet?.type === "delete"
            ? { ios: "trash", android: "delete" }
            : confirmSheet?.isExpired
              ? { ios: "exclamationmark.triangle", android: "warning" }
              : { ios: "fork.knife", android: "restaurant" }
        }
        iconColor={
          confirmSheet?.type === "delete" || confirmSheet?.isExpired
            ? Colors.error
            : Colors.primary
        }
        title={
          confirmSheet?.type === "delete"
            ? t("product.deleteConfirmTitle")
            : confirmSheet?.isExpired
              ? t("product.markConsumedExpiredTitle")
              : t("product.markConsumedTitle")
        }
        body={
          confirmSheet?.type === "delete"
            ? t("product.deleteRowConfirmBody")
            : confirmSheet?.isExpired
              ? t("product.markConsumedExpiredBody")
              : t("product.markConsumedBody")
        }
        confirmLabel={
          confirmSheet?.type === "delete"
            ? t("product.deleteConfirmLabel")
            : confirmSheet?.isExpired
              ? t("product.markConsumedExpiredConfirm")
              : t("product.markConsumedConfirm")
        }
        cancelLabel={t("common.cancel")}
        variant={
          confirmSheet?.type === "delete" || confirmSheet?.isExpired
            ? "error"
            : "primary"
        }
        onConfirm={handleConfirmSheetConfirm}
        onCancel={() => setConfirmSheet(null)}
      />

      <Snackbar snackbar={snackbar} onDismiss={handleSnackbarDismiss} />
    </View>
  );
}



function TabButton({
  active,
  onPress,
  label,
  disabled,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.tabButton,
        active ? styles.tabButtonActive : styles.tabButtonIdle,
        disabled && styles.tabButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <AppText
        variant="button"
        color={active ? Colors.white : disabled ? Colors.textSecondary : Colors.text}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  productImage: {
    width: "100%",
    height: "100%",
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
    gap: 4,
    justifyContent: "center",
  },
  badgeWrap: {
    marginTop: 2,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabButtonIdle: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButtonDisabled: {
    opacity: 0.5,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  searchGlobeBtn: {
    position: "relative",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  searchGlobeMagnifier: {
    position: "absolute",
    bottom: -2,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.background,
  },
});
