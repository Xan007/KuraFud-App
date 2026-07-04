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
  Animated,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
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
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isExpired(dateStr: string): boolean {
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
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const fabRotation = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.7)).current;
  const item1Opacity = useRef(new Animated.Value(0)).current;
  const item1Translate = useRef(new Animated.Value(20)).current;
  const item2Opacity = useRef(new Animated.Value(0)).current;
  const item2Translate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (menuOpen) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Animated.parallel([
        Animated.timing(fabRotation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(menuScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Cascada de items
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(item1Opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(item1Translate, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(item2Opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(item2Translate, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, 150);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.parallel([
        Animated.timing(fabRotation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(menuScale, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(item1Opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(item1Translate, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(item2Opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(item2Translate, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuOpen]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      productRepository
        .getAllProducts()
        .then((data) => {
          if (mounted) setProducts(data);
        })
        .finally(() => {
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
        <Animated.View
          style={[
            styles.fabMenuItems,
            {
              opacity: menuOpacity,
              transform: [{ scale: menuScale }],
            },
          ]}
          pointerEvents={menuOpen ? "auto" : "none"}
        >
          <Animated.View
            style={[
              styles.fabMenuItem,
              {
                opacity: item1Opacity,
                transform: [{ translateY: item1Translate }],
              },
            ]}
          >
            <Pressable
              style={styles.fabMenuItemPressable}
              onPress={() => {
                setMenuOpen(false);
                Haptics.selectionAsync();
                router.push("/scanner");
              }}
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
            style={[
              styles.fabMenuItem,
              {
                opacity: item2Opacity,
                transform: [{ translateY: item2Translate }],
              },
            ]}
          >
            <Pressable
              style={styles.fabMenuItemPressable}
              onPress={() => {
                setMenuOpen(false);
                Haptics.selectionAsync();
                router.push("/scanner");
              }}
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

        <Pressable
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setMenuOpen(!menuOpen);
          }}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: fabRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "45deg"],
                  }),
                },
                { scale: fabScale },
              ],
            }}
          >
            <SymbolView
              name={{ ios: "plus", android: "add" }}
              size={24}
              tintColor="#fff"
            />
          </Animated.View>
        </Pressable>
      </View>
    </View>
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
