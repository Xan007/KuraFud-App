import { memo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { Colors, Spacing, BorderRadius, withOpacity } from "@/constants/theme";
import { AppText } from "./ui/Text";
import type { InventoryItem } from "@/db/schema";

interface InventoryUnitRowProps {
  item: InventoryItem;
  isExpired: boolean;
  onConsumed: (id: number) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete?: (id: number) => void;
}


export const InventoryUnitRow = memo(function InventoryUnitRow({
  item,
  isExpired,
  onConsumed,
  onEdit,
  onDelete,
}: InventoryUnitRowProps) {
  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Pressable
        style={({ pressed }) => [
          styles.dateCard,
          pressed && !isExpired && { opacity: 0.9 },
        ]}
        onPress={() => !isExpired && onEdit(item)}
        disabled={isExpired}
      >
        <View style={styles.dateContent}>
          <View
            style={[
              styles.dateIconContainer,
              isExpired && styles.dateIconContainerExpired,
            ]}
          >
            <SymbolView
              name={{ ios: "calendar", android: "calendar_month" }}
              size={18}
              tintColor={isExpired ? Colors.error : Colors.primary}
            />
          </View>
          <View style={styles.dateInfo}>
            <AppText variant="subheading" style={{ fontFamily: "monospace" }}>
              {item.expirationDate || "--/--/----"}
            </AppText>
            {item.notes ? (
              <AppText
                variant="caption"
                color={Colors.textSecondary}
                numberOfLines={1}
              >
                {item.notes}
              </AppText>
            ) : null}
            {isExpired ? (
              <AppText variant="caption" color={Colors.error}>
                Vencido
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={styles.actionsRow}>
          {isExpired && onDelete ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete(item.id);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }}
              style={styles.actionButton}
            >
              <SymbolView
                name={{ ios: "trash", android: "delete" }}
                size={20}
                tintColor={Colors.error}
              />
            </Pressable>
          ) : null}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onConsumed(item.id);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 6, right: 12 }}
            style={styles.actionButton}
          >
            <SymbolView
              name={{ ios: "fork.knife", android: "restaurant" }}
              size={22}
              tintColor={isExpired ? Colors.error : Colors.textSecondary}
            />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    marginBottom: Spacing.md,
    gap: Spacing.md,
    overflow: "hidden",
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
    borderRadius: BorderRadius.sm,
    backgroundColor: withOpacity(Colors.primary, 0.18),
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  dateIconContainerExpired: {
    backgroundColor: withOpacity(Colors.error, 0.18),
  },
  dateInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    flexShrink: 0,
  },
  actionButton: {
    padding: Spacing.xs,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
});

export default InventoryUnitRow;
