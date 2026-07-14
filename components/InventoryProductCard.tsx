import { memo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { AppText } from "./ui/Text";
import { Badge } from "./ui/Badge";
import { isManualBarcode } from "@/helpers/manualProduct";
import { timeUntil, expiryBarColor } from "@/helpers/format";
import { useAppTranslation } from "@/hooks/useAppTranslation";

export type CardVariant = "list" | "compact" | "grid";

interface BaseProps {
  barcode: string;
  name: string;
  brand?: string;
  totalUnits: number;
  nearestExpiry: string;
  imageUrl?: string;
  isExpired: boolean;
  onPress: () => void;
  variant?: CardVariant;

  itemWidth?: number;
}

type Props = BaseProps;


export const InventoryProductCard = memo(function InventoryProductCard(props: Props) {
  const { t } = useAppTranslation();
  const manual = isManualBarcode(props.barcode);
  const variant = props.variant ?? "list";


  const tu = timeUntil(props.nearestExpiry);
  const label = formatTimeUntilLabel(tu, t);
  const barColor = expiryBarColor(props.nearestExpiry);
  const [gradStart, gradMid, gradEnd] = expiryGradientColors(barColor);
  const countPill = (
    <View style={styles.countPill}>
      <AppText variant="bodyMedium" color={Colors.white}>
        {props.totalUnits}
      </AppText>
    </View>
  );

  if (variant === "grid") {
    const w = props.itemWidth ?? 100;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.gridCard,
          { width: w },
          pressed && styles.cardPressed,
          props.isExpired && styles.cardExpired,
        ]}
        onPress={props.onPress}
      >
        <LinearGradient
          colors={[gradStart, gradMid, gradEnd]}
          locations={[0, 0.35, 1]}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.gradientBg}
        />
        <View style={[styles.gridImageContainer, { width: w, height: w }]}>
          {props.imageUrl ? (
            <Image
              source={{ uri: props.imageUrl }}
              style={styles.productImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <SymbolView
                name={{ ios: "photo", android: "image" }}
                size={28}
                tintColor={Colors.textSecondary}
              />
            </View>
          )}
          {manual ? (
            <View style={styles.gridBadge}>
              <Badge label={t("product.badgeManual")} tone="neutral" />
            </View>
          ) : null}
          <View style={styles.gridCountPill}>
            <AppText variant="subheading" color={Colors.white}>
              {props.totalUnits}
            </AppText>
          </View>
        </View>
        <View style={[styles.gridText, { width: w }]}>
          <AppText variant="bodyMedium" numberOfLines={2} style={styles.gridName}>
            {props.name}
          </AppText>
          {label ? (
            <AppText
              variant="caption"
              color={Colors.textSecondary}
              numberOfLines={1}
              style={styles.gridExpiry}
            >
              {label}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    );
  }

  if (variant === "compact") {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.compactCard,
          pressed && styles.cardPressed,
          props.isExpired && styles.cardExpired,
        ]}
        onPress={props.onPress}
      >
        <LinearGradient
          colors={[gradStart, gradMid, gradEnd]}
          locations={[0, 0.35, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradientBg}
        />
        <View style={styles.compactLeft}>
          <View style={styles.compactTitleRow}>
            {countPill}
            <AppText variant="bodyMedium" numberOfLines={2} style={styles.compactName}>
              {props.name}
            </AppText>
          </View>
          <View style={styles.compactMeta}>
            {props.brand ? (
              <AppText
                variant="caption"
                color={Colors.textSecondary}
                numberOfLines={1}
                style={styles.compactBrand}
              >
                {props.brand}
              </AppText>
            ) : null}
            {manual ? <Badge label={t("product.badgeManual")} tone="neutral" /> : null}
          </View>
          {label ? (
            <AppText variant="caption" color={Colors.textSecondary} style={styles.expiryText}>
              {label}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    );
  }


  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        props.isExpired && styles.cardExpired,
      ]}
      onPress={props.onPress}
    >
      <LinearGradient
        colors={[gradStart, gradMid, gradEnd]}
        locations={[0, 0.35, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradientBg}
      />
      <View style={styles.imageContainer}>
        {props.imageUrl ? (
          <Image
            source={{ uri: props.imageUrl }}
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
        {countPill}
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTitleRow}>
          <AppText variant="subheading" numberOfLines={1} style={styles.listName}>
            {props.name}
          </AppText>
        </View>
        <View style={styles.cardSubtitle}>
          {props.brand ? (
            <AppText
              variant="caption"
              color={Colors.textSecondary}
              numberOfLines={1}
            >
              {props.brand}
            </AppText>
          ) : null}
          {manual ? <Badge label={t("product.badgeManual")} tone="neutral" /> : null}
        </View>
      </View>
      {label ? (
        <View style={styles.expiryWrap}>
          <AppText variant="caption" color={Colors.textSecondary} style={styles.expiryText}>
            {label}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
});

const baseCard = {
  cardPressed: { opacity: 0.6 },
  cardExpired: { opacity: 0.85 },
};

const styles = StyleSheet.create({

  gradientBg: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },

  countPill: {
    position: "absolute",
    bottom: Spacing.xs,
    left: Spacing.xs,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: Spacing.xs,
    backgroundColor: withOpacityBlack(),
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginVertical: Spacing.xs,
    paddingLeft: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  imageContainer: {
    width: 56,
    height: 56,
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
  cardContent: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  listName: {
    flex: 1,
  },
  cardSubtitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  expiryWrap: {
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  expiryText: {
    textAlign: "right",
  },

  compactTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  compactName: {
    flex: 1,
  },
  compactBrand: {},
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginVertical: Spacing.xs,
    paddingLeft: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  compactLeft: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
  },
  compactMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },

  gridCard: {
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.xs,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  gridImageContainer: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    position: "relative",
  },
  gridBadge: {
    position: "absolute",
    top: Spacing.xs,
    left: Spacing.xs,
  },
  gridCountPill: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: Spacing.sm,
    backgroundColor: withOpacityBlack(),
    alignItems: "center",
    justifyContent: "center",
  },
  gridText: {
    width: "100%",
    alignItems: "center",
    gap: 1,
  },
  gridName: {
    textAlign: "center",
    minHeight: 34,
  },
  gridExpiry: {
    textAlign: "center",
    marginTop: 1,
    paddingHorizontal: Spacing.xs,
  },
  ...baseCard,
});


function formatTimeUntilLabel(
  tu: ReturnType<typeof timeUntil>,
  t: (key: string, opts?: any) => string,
): string {
  switch (tu.kind) {
    case "expired":
      return t("inventory.expiryExpired");
    case "today":
      return t("inventory.expiryToday");
    case "tomorrow":
      return t("inventory.expiryTomorrow");
    case "pastDays":
      return t("inventory.expiryPastDays", { count: tu.count });
    case "days":
      return t("inventory.expiryDays", { count: tu.count });
    case "months":
      return t("inventory.expiryMonths", { count: tu.count });
    case "years":
      return t("inventory.expiryYears", { count: tu.count });
    default:
      return "";
  }
}


function withOpacityBlack() {
  return "rgba(0,0,0,0.55)";
}


function expiryGradientColors(rgb: string): [string, string, string] {
  const match = rgb.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!match) return ["rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(0,0,0,0)"];
  const [, r, g, b] = match;
  const isRed = Number(r) > 200 && Number(g) < 100 && Number(b) < 100;
  const startAlpha = isRed ? 0.18 : 0.1;
  return [
    `rgba(${r},${g},${b},${startAlpha})`,
    `rgba(${r},${g},${b},0)`,
    `rgba(${r},${g},${b},0)`,
  ];
}

export default InventoryProductCard;
