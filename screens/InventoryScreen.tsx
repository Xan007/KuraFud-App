import { memo, useCallback, useState, useEffect, useMemo, useRef } from "react";import { useRouter, useFocusEffect } from "expo-router";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import TopBar from "components/TopBar";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  TextInput,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { productRepository } from "@/db/repositories";
import type { ProductWithInventory } from "@/db/schema";
import {
  InventoryProductCard,
  type CardVariant,
} from "@/components/InventoryProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppText } from "@/components/ui/Text";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { parseDateString as parseDate, isExpired } from "@/helpers/format";

type Filter = "all" | "expired" | "active";
type SortBy = "expiryDate" | "mostUnits" | "az";
type SortDir = "asc" | "desc";
type ViewMode = "list" | "grid";

type GroupedProduct = {
  barcode: string;
  name: string;
  brand?: string;
  totalUnits: number;
  nearestExpiry: string;
  hasExpired: boolean;
  hasActive: boolean;
  imageUrl: string;
  createdAt: Date;
};

const FILTERS: Filter[] = ["all", "active", "expired"];
const SORT_OPTIONS: SortBy[] = [
  "expiryDate",
  "mostUnits",
  "az",
];
const SORT_DIRS: SortDir[] = ["asc", "desc"];
const VIEW_MODES: ViewMode[] = ["list", "grid"];

function groupProducts(products: ProductWithInventory[]): GroupedProduct[] {
  const grouped = new Map<string, GroupedProduct>();

  for (const product of products) {
    if (!grouped.has(product.barcode)) {
      grouped.set(product.barcode, {
        barcode: product.barcode,
        name: product.name || "Producto",
        brand: product.brand,
        totalUnits: 0,
        nearestExpiry: "",
        hasExpired: false,
        hasActive: false,
        imageUrl: product.imageFrontUrl || "",
        createdAt: product.createdAt,
      });
    }

    const group = grouped.get(product.barcode)!;
    group.totalUnits += product.inventory.length;

    const sortedDates = product.inventory
      .map((inv) => ({
        dateStr: inv.expirationDate,
        consumed: inv.consumedAt !== null,
      }))
      .sort(
        (a, b) =>
          parseDate(a.dateStr).getTime() - parseDate(b.dateStr).getTime(),
      );

    for (const inv of sortedDates) {
      if (inv.consumed) continue;
      const exp = isExpired(inv.dateStr);
      if (exp) group.hasExpired = true;
      else group.hasActive = true;
    }

    const firstActive = sortedDates.find(
      (d) => !d.consumed && !isExpired(d.dateStr),
    );
    if (firstActive) {
      group.nearestExpiry = firstActive.dateStr;
    } else {
      group.nearestExpiry = sortedDates[0]?.dateStr || "";
    }
  }

  return Array.from(grouped.values());
}

function applyFilters(
  products: GroupedProduct[],
  filter: Filter,
  search: string,
): GroupedProduct[] {
  const s = search.trim().toLowerCase();
  return products.filter((p) => {
    if (s) {
      const hayName = p.name.toLowerCase();
      const hayBrand = (p.brand || "").toLowerCase();
      const hayBarcode = p.barcode.toLowerCase();
      if (
        !hayName.includes(s) &&
        !hayBrand.includes(s) &&
        !hayBarcode.includes(s)
      ) {
        return false;
      }
    }

    if (filter === "expired") return p.hasExpired && !p.hasActive;
    if (filter === "active") return p.hasActive;
    return true;
  });
}

function applySort(
  products: GroupedProduct[],
  sort: SortBy,
  dir: SortDir,
): GroupedProduct[] {
  const arr = [...products];
  const mult = dir === "asc" ? 1 : -1;
  switch (sort) {
    case "expiryDate":
      arr.sort(
        (a, b) =>
          (parseDate(a.nearestExpiry).getTime() -
            parseDate(b.nearestExpiry).getTime()) *
          mult,
      );
      break;
    case "mostUnits":
      arr.sort((a, b) => (a.totalUnits - b.totalUnits) * mult);
      break;
    case "az":
      arr.sort((a, b) => {
        const cmp = a.name.localeCompare(b.name, "es", {
          sensitivity: "base",
        });
        return cmp * mult;
      });
      break;
  }
  return arr;
}

type ItemProps = {
  item: GroupedProduct;
  isGridView: boolean;
  gridItemWidth: number;
  isExpired: boolean;
  onPress: (barcode: string) => void;
};

const InventoryListItem = memo(function InventoryListItem({
  item,
  isGridView,
  gridItemWidth,
  isExpired: expired,
  onPress,
}: ItemProps) {
  const handlePress = useCallback(() => {
    onPress(item.barcode);
  }, [onPress, item.barcode]);
  return (
      <View style={isGridView && { width: gridItemWidth }}>
        <InventoryProductCard
        barcode={item.barcode}
        name={item.name}
        brand={item.brand}
        totalUnits={item.totalUnits}
        nearestExpiry={item.nearestExpiry}
        imageUrl={item.imageUrl}
        isExpired={expired}
        onPress={handlePress}
        variant={(isGridView ? "grid" : "list") as CardVariant}
        itemWidth={isGridView ? gridItemWidth : undefined}
      />
    </View>
  );
});

export default function InventoryScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useAppTranslation();
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("expiryDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const fabRotation = useSharedValue(0);
  const fabScale = useSharedValue(1);
  const menuOpacity = useSharedValue(0);
  const menuScale = useSharedValue(0.7);
  const item1Opacity = useSharedValue(0);
  const item1Translate = useSharedValue(20);
  const item2Opacity = useSharedValue(0);
  const item2Translate = useSharedValue(20);

  useEffect(() => {
    if (menuOpen) {
      fabRotation.value = withTiming(1, { duration: 300 });
      fabScale.value = withTiming(1.1, { duration: 300 });
      menuOpacity.value = withTiming(1, { duration: 300 });
      menuScale.value = withSpring(1, { damping: 12, mass: 1, stiffness: 200 });

      setTimeout(() => {
        item1Opacity.value = withTiming(1, { duration: 200 });
        item1Translate.value = withSpring(0, {
          damping: 12,
          mass: 1,
          stiffness: 200,
        });
      }, 100);

      setTimeout(() => {
        item2Opacity.value = withTiming(1, { duration: 200 });
        item2Translate.value = withSpring(0, {
          damping: 12,
          mass: 1,
          stiffness: 200,
        });
      }, 150);
    } else {
      fabRotation.value = withTiming(0, { duration: 250 });
      fabScale.value = withTiming(1, { duration: 250 });
      menuOpacity.value = withTiming(0, { duration: 200 });
      menuScale.value = withTiming(0.7, { duration: 200 });
      item1Opacity.value = withTiming(0, { duration: 150 });
      item1Translate.value = withTiming(20, { duration: 150 });
      item2Opacity.value = withTiming(0, { duration: 150 });
      item2Translate.value = withTiming(20, { duration: 150 });
    }
  }, [menuOpen]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      productRepository
        .getAllProducts()
        .then((data) => {
          if (mounted) setProducts(data);
        })
        .catch(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, []),
  );

  const grouped = useMemo(
    () => groupProducts(products).filter((p) => p.totalUnits > 0),
    [products],
  );

  const visibleProducts = useMemo(() => {
    const filtered = applyFilters(grouped, filter, search);
    return applySort(filtered, sortBy, sortDir);
  }, [grouped, filter, search, sortBy, sortDir]);

  const isGridView = viewMode === "grid";
  const numColumns = isGridView ? 3 : 1;

  const gridItemWidth =
    Math.floor(
      (width - Spacing.lg * 2 - Spacing.sm * (numColumns - 1)) / numColumns,
    );

  const paddedProducts = useMemo(() => {
    if (!isGridView) return visibleProducts;
    const remainder = visibleProducts.length % 3;
    if (remainder === 0) return visibleProducts;
    const pad = 3 - remainder;
    return [...visibleProducts, ...Array(pad).fill(null)];
  }, [visibleProducts, isGridView]);

  const contentStyle = useMemo(
    () => [
      styles.listContent,
      { paddingBottom: insets.bottom + 76 },
      isGridView && styles.gridListContent,
      visibleProducts.length === 0 && styles.listContentEmpty,
    ],
    [insets.bottom, visibleProducts.length, isGridView],
  );

  const handleCardPress = useCallback(
    (barcode: string) => {
      router.push(`/product/${barcode}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: GroupedProduct | null }) => {
      if (!item) return <View style={{ width: gridItemWidth }} />;
      return (
        <InventoryListItem
          item={item}
          isGridView={isGridView}
          gridItemWidth={gridItemWidth}
          isExpired={item.hasExpired && !item.hasActive}
          onPress={handleCardPress}
        />
      );
    },
    [handleCardPress, isGridView, gridItemWidth],
  );

  const keyExtractor = useCallback(
    (item: GroupedProduct | null, idx: number) => item?.barcode ?? `spacer-${idx}`,
    [],
  );

  const sortLabelFor = (s: SortBy): string => {
    switch (s) {
      case "expiryDate":
        return t("inventory.sortExpiryDate");
      case "mostUnits":
        return t("inventory.sortMostUnits");
      case "az":
      default:
        return t("inventory.sortAz");
    }
  };

  const dirLabelFor = (d: SortDir): string =>
    d === "asc" ? t("inventory.sortAsc") : t("inventory.sortDesc");

  return (
    <View style={{ width, height, backgroundColor: Colors.background }}>
      <TopBar title={t("inventory.title")} />


      <View style={styles.toolbar}>
        <SearchInput
          value={search}
          placeholder={t("inventory.searchPlaceholder")}
          onChangeText={setSearch}
        />

        <View style={styles.row}>
          <FilterChips
            selected={filter}
            options={FILTERS}
            onSelect={setFilter}
            labelFor={(f) =>
              f === "all"
                ? t("inventory.filterAll")
                : f === "active"
                  ? t("inventory.filterActive")
                  : t("inventory.filterExpired")
            }
          />
          <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
        </View>

        <View style={styles.toolsRow}>
          <SortButton
            currentLabel={sortLabelFor(sortBy)}
            options={SORT_OPTIONS}
            optionLabel={sortLabelFor}
            onSelect={setSortBy}
            prefixLabel={t("inventory.sortByLabel")}
          />
          <SortDirButton
            dir={sortDir}
            onChange={(d) => setSortDir(d)}
            label={dirLabelFor(sortDir)}
          />
        </View>
      </View>

      <FlatList
        data={paddedProducts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={contentStyle}
        numColumns={numColumns}
        key={`grid-${isGridView}`}
        columnWrapperStyle={isGridView ? styles.gridRow : undefined}
        ListEmptyComponent={
          <EmptyState
            icon={
              <SymbolView
                name={{ ios: "archivebox", android: "inventory_2" }}
                size={48}
                tintColor={Colors.textSecondary}
              />
            }
            title={search ? t("addProduct.noResults") : t("inventory.empty")}
            subtitle={
              search
                ? t("addProduct.noResultsHint")
                : t("inventory.emptySubtitle")
            }
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
      />


      {menuOpen && (
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setMenuOpen(false)}
        />
      )}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 76 }]}>
        <MenuItems
          menuOpacity={menuOpacity}
          menuScale={menuScale}
          item1Opacity={item1Opacity}
          item1Translate={item1Translate}
          item2Opacity={item2Opacity}
          item2Translate={item2Translate}
          menuOpen={menuOpen}
          onScanPress={() => {
            setMenuOpen(false);
            router.push("/scanner");
          }}
          onManualPress={() => {
            setMenuOpen(false);
            router.push("/add-product");
          }}
          t={t}
        />

        <Pressable style={styles.fab} onPress={() => setMenuOpen(!menuOpen)}>
          <FabIcon rotation={fabRotation} scale={fabScale} />
        </Pressable>
      </View>
    </View>
  );
}



function SearchInput({
  value,
  placeholder,
  onChangeText,
}: {
  value: string;
  placeholder: string;
  onChangeText: (v: string) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  return (
    <View style={styles.searchBox}>
      <SymbolView
        name={{ ios: "magnifyingglass", android: "search" }}
        size={16}
        tintColor={Colors.textSecondary}
      />
      <TextInput
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        onChangeText={onChangeText}
        style={styles.searchInput}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value?.length > 0 ? (
        <Pressable
          onPress={() => {
            onChangeText("");
            inputRef.current?.blur();
          }}
          hitSlop={8}
          style={styles.searchClearBtn}
        >
          <SymbolView
            name={{ ios: "xmark.circle.fill", android: "cancel" }}
            size={16}
            tintColor={Colors.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}



function FilterChips({
  selected,
  options,
  onSelect,
  labelFor,
}: {
  selected: Filter;
  options: Filter[];
  onSelect: (f: Filter) => void;
  labelFor: (f: Filter) => string;
}) {
  return (
    <View style={styles.chipsGroup}>
      {options.map((f) => {
        const activeChip = f === selected;
        return (
          <Pressable
            key={f}
            style={[styles.chip, activeChip ? styles.chipActive : styles.chipIdle]}
            onPress={() => onSelect(f)}
            hitSlop={4}
          >
            <AppText
              variant="button"
              color={activeChip ? Colors.white : Colors.textSecondary}
              style={styles.chipText}
            >
              {labelFor(f)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}



function SortButton({
  currentLabel,
  options,
  optionLabel,
  onSelect,
  prefixLabel,
}: {
  currentLabel: string;
  options: SortBy[];
  optionLabel: (s: SortBy) => string;
  onSelect: (s: SortBy) => void;
  prefixLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        style={[styles.chip, styles.chipIdle, styles.sortButton]}
        onPress={() => setOpen(!open)}
        hitSlop={4}
      >
        <SymbolView
          name={{ ios: "chevron.down", android: "expand_more" }}
          size={12}
          tintColor={Colors.textSecondary}
        />
        <AppText variant="button" color={Colors.textSecondary} style={styles.chipText}>
          {prefixLabel} {currentLabel}
        </AppText>
      </Pressable>

      {open ? (
        <>
          <Pressable
            style={{ position: "absolute", top: -1000, bottom: -1000, left: -1000, right: -1000, zIndex: 80 }}
            onPress={() => setOpen(false)}
          />
          <View style={styles.sortMenu}>
            {options.map((s) => {
              const active = optionLabel(s) === currentLabel;
              return (
                <Pressable
                  key={s}
                  style={({ pressed }) => [
                    styles.sortMenuItem,
                    pressed && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    onSelect(s);
                    setOpen(false);
                  }}
                >
                  <AppText
                    variant="bodyMedium"
                    color={active ? Colors.primary : Colors.text}
                  >
                    {optionLabel(s)}
                  </AppText>
                  {active ? (
                    <SymbolView
                      name={{ ios: "checkmark", android: "check" }}
                      size={16}
                      tintColor={Colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}



function SortDirButton({
  dir,
  onChange,
  label,
}: {
  dir: SortDir;
  onChange: (d: SortDir) => void;
  label: string;
}) {
  return (
    <Pressable
      style={[styles.chip, styles.chipIdle, styles.sortButton]}
      onPress={() => onChange(dir === "asc" ? "desc" : "asc")}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <SymbolView
        name={
          dir === "asc"
            ? { ios: "arrow.up", android: "arrow_upward" }
            : { ios: "arrow.down", android: "arrow_downward" }
        }
        size={12}
        tintColor={Colors.textSecondary}
      />
      <AppText variant="button" color={Colors.textSecondary} style={styles.chipText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function ViewToggle({
  viewMode,
  onViewChange,
}: {
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <View style={styles.viewToggle}>
      {VIEW_MODES.map((v) => (
        <Pressable
          key={v}
          style={[
            styles.viewToggleBtn,
            v === viewMode ? styles.viewToggleBtnActive : null,
          ]}
          onPress={() => onViewChange(v)}
          hitSlop={2}
        >
          <SymbolView
            name={
              v === "list"
                ? { ios: "list.bullet", android: "format_list_bulleted" }
                : { ios: "square.grid.2x2", android: "grid_view" }
            }
            size={18}
            tintColor={v === viewMode ? Colors.primary : Colors.textSecondary}
          />
        </Pressable>
      ))}
    </View>
  );
}




const FabIcon = memo(function FabIcon({
  rotation,
  scale,
}: {
  rotation: any;
  scale: any;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 45}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <SymbolView
        name={{ ios: "plus", android: "add" }}
        size={24}
        tintColor="#fff"
      />
    </Animated.View>
  );
});

const MenuItems = memo(function MenuItems({
  menuOpacity,
  menuScale,
  item1Opacity,
  item1Translate,
  item2Opacity,
  item2Translate,
  menuOpen,
  onScanPress,
  onManualPress,
  t,
}: {
  menuOpacity: any;
  menuScale: any;
  item1Opacity: any;
  item1Translate: any;
  item2Opacity: any;
  item2Translate: any;
  menuOpen: boolean;
  onScanPress: () => void;
  onManualPress: () => void;
  t: (key: string) => string;
}) {
  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ scale: menuScale.value }],
  }));

  const item1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: item1Opacity.value,
    transform: [{ translateY: item1Translate.value }],
  }));

  const item2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: item2Opacity.value,
    transform: [{ translateY: item2Translate.value }],
  }));

  return (
    <Animated.View
      style={[styles.fabMenuItems, menuAnimatedStyle]}
      pointerEvents={menuOpen ? "auto" : "none"}
    >
      <Animated.View style={[styles.fabMenuItem, item1AnimatedStyle]}>
        <Pressable style={styles.fabMenuItemPressable} onPress={onScanPress}>
          <SymbolView
            name={{ ios: "camera.viewfinder", android: "photo_camera" }}
            size={18}
            tintColor={Colors.primary}
          />
          <AppText variant="bodyMedium" style={styles.fabMenuItemText}>
            {t("inventory.scanProduct")}
          </AppText>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.fabMenuItem, item2AnimatedStyle]}>
        <Pressable style={styles.fabMenuItemPressable} onPress={onManualPress}>
          <SymbolView
            name={{ ios: "pencil.and.list.clipboard", android: "edit" }}
            size={18}
            tintColor={Colors.primary}
          />
          <AppText variant="bodyMedium" style={styles.fabMenuItemText}>
            {t("inventory.addManual")}
          </AppText>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  toolbar: {
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderCurve: "continuous",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
    margin: 0,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: Spacing.xs,
  },
  toolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipsGroup: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexShrink: 1,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.pill,
    borderCurve: "continuous",
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipIdle: {
    backgroundColor: Colors.surface,
  },
  chipText: {
    fontSize: 12,
    letterSpacing: 0,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortMenuBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 80,
  },
  sortMenu: {
    position: "absolute",
    top: 40,
    right: 0,
    zIndex: 90,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    paddingVertical: Spacing.xs,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.pill,
    padding: 2,
    gap: 2,
    flexShrink: 0,
  },
  viewToggleBtn: {
    width: 32,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  gridListContent: {
    paddingHorizontal: Spacing.lg,
  },
  listContentEmpty: {
    justifyContent: "center",
  },
  gridRow: {
    gap: Spacing.sm,
    justifyContent: "center",
  },
  fabContainer: {
    position: "absolute",
    right: 16,
    flexDirection: "column",
    alignItems: "center",
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabMenuItems: {
    position: "absolute",
    bottom: 22,
    right: 0,
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },
  fabMenuItem: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  fabMenuItemPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fabMenuItemText: {
    color: Colors.text,
  },
  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
});
