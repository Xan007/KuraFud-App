import { memo, useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { AppText } from "./ui/Text";
import type { InventoryItem } from "@/db/schema";

// Helper to parse DD/MM/YYYY to Date (UTC)
function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date(8640000000000000);
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

interface InventoryUnitRowProps {
  item: InventoryItem;
  isExpired: boolean;
  onConsumed: (id: number) => void;
  onUndo: (id: number) => void;
  onDelete: (id: number) => void;
}

/**
 * Single inventory unit row (one expiration date instance of a product).
 * Shows the date, actions to consume/edit/delete, and status badges.
 */
export const InventoryUnitRow = memo(function InventoryUnitRow({
  item,
  isExpired,
  onConsumed,
  onUndo,
  onDelete,
}: InventoryUnitRowProps) {
  const isConsumed = item.consumedAt !== null;

  const rowOpacity = isConsumed ? 0.6 : 1;

  return (
    <View
      style={[
        styles.dateCard,
        isConsumed && styles.dateCardConsumed,
        { opacity: rowOpacity },
      ]}
    >
      <View style={styles.dateContent}>
        <View
          style={[
            styles.dateIconContainer,
            isConsumed && styles.dateIconContainerConsumed,
            isExpired && !isConsumed && styles.dateIconContainerExpired,
          ]}
        >
          {isConsumed ? (
            <SymbolView
              name={{ ios: "checkmark", android: "check" }}
              size={18}
              tintColor={Colors.primary}
            />
          ) : (
            <SymbolView
              name={{ ios: "calendar", android: "calendar_month" }}
              size={18}
              tintColor={isExpired ? Colors.error : Colors.primary}
            />
          )}
        </View>
        <View style={styles.dateInfo}>
          <AppText variant="subheading" style={{ fontFamily: "monospace" }}>
            {item.expirationDate || "--/--/----"}
          </AppText>
          {item.notes && (
            <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
              {item.notes}
            </AppText>
          )}
          {isExpired && !isConsumed && (
            <AppText variant="caption" color={Colors.error}>
              Vencido
            </AppText>
          )}
          {isConsumed && (
            <AppText variant="caption" color={Colors.primary}>
              ✓ Consumido
            </AppText>
          )}
        </View>
      </View>

      <View style={styles.dateActions}>
        {isConsumed ? (
          <Pressable onPress={() => onUndo(item.id)} hitSlop={12}>
            <SymbolView
              name={{ ios: "arrow.uturn.left", android: "undo" }}
              size={16}
              tintColor={Colors.primary}
            />
          </Pressable>
        ) : (
          <>
            <Pressable onPress={() => onConsumed(item.id)} hitSlop={12}>
              <SymbolView
                name={{ ios: "checkmark.circle", android: "check_circle" }}
                size={16}
                tintColor={Colors.primary}
              />
            </Pressable>
            <Pressable onPress={() => onDelete(item.id)} hitSlop={12}>
              <SymbolView
                name={{ ios: "trash.fill", android: "delete" }}
                size={16}
                tintColor={Colors.error}
              />
            </Pressable>
          </>
        )}
      </View>
    </View>
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
  },
  dateCardConsumed: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  dateIconContainerExpired: {
    backgroundColor: Colors.error + "15",
  },
  dateIconContainerConsumed: {
    backgroundColor: Colors.primary + "10",
  },
  dateInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  dateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
});

export default InventoryUnitRow;
