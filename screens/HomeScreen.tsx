import { useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import TopBar from "components/TopBar";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { inventoryRepository } from "@/db/repositories";
import type { InventoryItem } from "@/db/schema";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTranslation } from "@/hooks/useAppTranslation";

type ExpiringItem = InventoryItem & { productName: string; productBarcode: string };

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { t } = useAppTranslation();
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      inventoryRepository.getExpiringItems(7)
        .then((items) => {
          if (mounted) {
            const typed = items.map((item) => ({
              ...item,
              productName: item.product.name || "Producto",
              productBarcode: item.product.barcode,
            }));
            setExpiringItems(typed);
            setLoading(false);
          }
        })
        .catch(() => {
          if (mounted) setLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <View style={{ width, height }}>
      <TopBar title="Expirat" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scan button - always visible at top */}
        <View style={styles.scanSection}>
          <Button
            variant="primary"
            size="md"
            onPress={() => router.push("/scanner")}
          >
            {t('home.scanProduct')}
          </Button>
        </View>

        {/* Expiring items section */}
        {expiringItems.length > 0 && (
          <Animated.View style={styles.section} layout={LinearTransition.springify()}>
            <AppText variant="heading">{t('home.expiringIn7Days')}</AppText>
            <Animated.View style={styles.itemsList} layout={LinearTransition.springify()}>
              {expiringItems.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInUp.delay(index * 30).duration(400)}
                  layout={LinearTransition.springify()}
                >
                  <Pressable
                    style={styles.expiringCard}
                    onPress={() => router.push(`/product/${item.productBarcode}`)}
                  >
                    <View style={styles.expiringCardBody}>
                      <AppText variant="subheading" numberOfLines={1}>
                        {item.productName}
                      </AppText>
                      <AppText variant="body" color={Colors.textSecondary}>
                        {t('home.expiresLabel')} {item.expirationDate}
                      </AppText>
                    </View>
                    <SymbolView
                      name={{ ios: "chevron.right", android: "chevron_right" }}
                      size={16}
                      tintColor={Colors.textSecondary}
                    />
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </Animated.View>
        )}

        {/* Empty state - only when no items and not loading */}
        {expiringItems.length === 0 && !loading && (
          <EmptyState
            icon={
              <SymbolView
                name={{ ios: "checkmark.circle", android: "check_circle" }}
                size={48}
                tintColor={Colors.primary}
              />
            }
            title={t('home.nothingExpiringSoon')}
            subtitle={t('home.allProductsGood')}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  scanSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  scanButton: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  itemsList: {
    gap: Spacing.sm,
  },
  expiringCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    gap: Spacing.md,
  },
  expiringCardBody: {
    flex: 1,
    gap: Spacing.xs,
  },
});
