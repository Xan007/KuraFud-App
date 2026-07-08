import { memo } from "react";
import { View, StyleSheet, Pressable, Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { AppText } from "./ui/Text";

interface InventoryProductCardProps {
  barcode: string;
  name: string;
  brand?: string;
  totalUnits: number;
  nearestExpiry: string;
  imageUrl?: string;
  isExpired: boolean;
  onPress: () => void;
}

/**
 * A product card in the grouped inventory list.
 * Shows image, name, brand, unit count, and nearest expiry date.
 * Memoized to prevent unnecessary re-renders of list items.
 */
export const InventoryProductCard = memo(function InventoryProductCard({
  barcode,
  name,
  brand,
  totalUnits,
  nearestExpiry,
  imageUrl,
  isExpired,
  onPress,
}: InventoryProductCardProps) {
  return (
    <Pressable
      style={[styles.card, isExpired && styles.cardExpired]}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
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
      </View>
      <View style={styles.cardContent}>
        <View>
          <AppText variant="subheading" numberOfLines={2}>
            {name}
          </AppText>
          {brand && (
            <AppText variant="body" color={Colors.textSecondary}>
              {brand}
            </AppText>
          )}
        </View>
        <View style={styles.meta}>
          <AppText variant="caption" color={Colors.textSecondary}>
            {totalUnits} unidad{totalUnits === 1 ? "" : "es"}
          </AppText>
          <AppText variant="caption" color={Colors.textSecondary}>
            •
          </AppText>
          <AppText
            variant="caption"
            color={isExpired ? Colors.error : Colors.textSecondary}
            style={isExpired && { fontWeight: "600" }}
          >
            {nearestExpiry || "--/--/----"}
          </AppText>
          {isExpired && (
            <AppText variant="caption" color={Colors.error}>
              ⚠
            </AppText>
          )}
        </View>
      </View>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right" }}
        size={16}
        tintColor={Colors.textSecondary}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  cardExpired: {
    opacity: 0.7,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    backgroundColor: Colors.surface,
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
  cardContent: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});

export default InventoryProductCard;
