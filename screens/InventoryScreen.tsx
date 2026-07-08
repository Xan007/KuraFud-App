import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Spacing, Colors, BorderRadius, FontSize } from "@/constants/theme";
import TopBar from "components/TopBar";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  LinearTransition,
  FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { productRepository, inventoryRepository } from "@/db/repositories";
import type { ProductWithInventory } from "@/db/schema";
import { InventoryProductCard } from "@/components/InventoryProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { showToast } from "@/helpers/toast";
import { useAppTranslation } from "@/hooks/useAppTranslation";

type GroupedProduct = {
  barcode: string;
  name: string;
  brand?: string;
  totalUnits: number;
  nearestExpiry: string;
  imageUrl: string;
  isExpired: boolean;
};

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(8640000000000000);
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  const expDate = parseDate(dateStr);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return expDate < today;
}

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
        imageUrl: product.imageFrontUrl || "",
        isExpired: false,
      });
    }

    const group = grouped.get(product.barcode)!;
    group.totalUnits += product.inventory.length;

    const expiryDates = product.inventory.map((inv) => inv.expirationDate);
    const sortedDates = expiryDates.sort(
      (a, b) => parseDate(a).getTime() - parseDate(b).getTime(),
    );
    group.nearestExpiry = sortedDates[0] || "";
    group.isExpired = isExpired(group.nearestExpiry);
  }

  const grouped_array = Array.from(grouped.values());

  // Sort: active (not expired) first by date, then expired at the end
  return grouped_array.sort((a, b) => {
    if (a.isExpired === b.isExpired) {
      // Both active or both expired — sort by date
      return (
        parseDate(a.nearestExpiry).getTime() -
        parseDate(b.nearestExpiry).getTime()
      );
    }
    // Active before expired
    return a.isExpired ? 1 : -1;
  });
}

export default function InventoryScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useAppTranslation();
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
      menuScale.value = withSpring(1, {
        damping: 12,
        mass: 1,
        stiffness: 200,
      });

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

  const handleCardPress = useCallback(
    (barcode: string) => {
      router.push(`/product/${barcode}/inventory`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: GroupedProduct }) => (
      <Animated.View
        layout={LinearTransition.springify()}
      >
        <InventoryProductCard
          barcode={item.barcode}
          name={item.name}
          brand={item.brand}
          totalUnits={item.totalUnits}
          nearestExpiry={item.nearestExpiry}
          imageUrl={item.imageUrl}
          isExpired={item.isExpired}
          onPress={() => handleCardPress(item.barcode)}
        />
      </Animated.View>
    ),
    [handleCardPress],
  );

  return (
    <View style={{ width, height }}>
      <TopBar title={t('inventory.title')} />

      {grouped.length === 0 && !loading ? (
        <EmptyState
          icon={
            <SymbolView
              name={{ ios: "archivebox", android: "inventory_2" }}
              size={48}
              tintColor={Colors.textSecondary}
            />
          }
          title={t('inventory.empty')}
          subtitle={t('inventory.emptySubtitle')}
        />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.barcode}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Floating action menu */}
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
            router.push("/scanner");
          }}
          t={t}
        />

        <Pressable
          style={styles.fab}
          onPress={() => {
            setMenuOpen(!menuOpen);
          }}
        >
          <FabIcon rotation={fabRotation} scale={fabScale} />
        </Pressable>
      </View>
    </View>
  );
}

function FabIcon({
  rotation,
  scale,
}: {
  rotation: any;
  scale: any;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${rotation.value * 45}deg`,
      },
      { scale: scale.value },
    ],
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
}

function MenuItems({
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
      <Animated.View
        style={[styles.fabMenuItem, item1AnimatedStyle]}
      >
        <Pressable
          style={styles.fabMenuItemPressable}
          onPress={onScanPress}
        >
          <SymbolView
            name={{ ios: "camera.viewfinder", android: "photo_camera" }}
            size={18}
            tintColor={Colors.primary}
          />
          <Text style={styles.fabMenuItemText}>{t('inventory.scanProduct')}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[styles.fabMenuItem, item2AnimatedStyle]}
      >
        <Pressable
          style={styles.fabMenuItemPressable}
          onPress={onManualPress}
        >
          <SymbolView
            name={{ ios: "pencil.and.list.clipboard", android: "edit" }}
            size={18}
            tintColor={Colors.primary}
          />
          <Text style={styles.fabMenuItemText}>{t('inventory.addManual')}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },
  fabContainer: {
    position: "absolute",
    right: 16,
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
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
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
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  fabMenuItemPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fabMenuItemText: {
    fontSize: 14,
    fontWeight: "600",
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
