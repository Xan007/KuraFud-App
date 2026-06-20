import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/theme";
import type { ProductInfo } from "types";
import SheetWrapper from "@/components/SheetWrapper";

type Props = {
  product: ProductInfo;
  date?: string;
  onDismiss: () => void;
  onScanDate: () => void;
  onDateConfirm: () => void;
  onDateCancel: () => void;
  onEditDate: () => void;
};

/**
 * Bottom sheet displayed when a barcode is found, showing the product name,
 * brand, expiration date (with edit / scan actions), and confirm / cancel
 * buttons.
 */
const ProductSheet = memo(function ProductSheet({
  product,
  date,
  onDismiss,
  onScanDate,
  onDateConfirm,
  onDateCancel,
  onEditDate,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SheetWrapper onDismiss={onDismiss}>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      {product.brand ? (
        <Text style={styles.brand}>{product.brand}</Text>
      ) : (
        <View style={styles.brandSpacer} />
      )}

      <View style={styles.dateBox}>
        <View style={styles.dateRow}>
          <SymbolView
            name={{ ios: "calendar", android: "calendar_month" }}
            size={16}
            tintColor={Colors.primary}
          />
          <View style={styles.dateTextCol}>
            <Text style={styles.dateLabel}>Vence</Text>
            <Text
              style={[styles.dateValue, !date && styles.dateValuePlaceholder]}
            >
              {date ?? "--/--/----"}
            </Text>
          </View>
          <View style={styles.dateActions}>
            <Pressable style={styles.iconBtn} onPress={onEditDate}>
              <SymbolView
                name={{ ios: "pencil.circle", android: "edit" }}
                size={18}
                tintColor={Colors.primary}
              />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={onScanDate}>
              <SymbolView
                name={{
                  ios: "camera.viewfinder",
                  android: "photo_camera",
                }}
                size={18}
                tintColor={Colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable style={styles.confirmBtn} onPress={onDateConfirm}>
        <Text style={styles.confirmBtnText}>Confirmar</Text>
      </Pressable>

      <Pressable style={styles.cancelBtn} onPress={onDateCancel}>
        <Text style={styles.cancelBtnText}>Cancelar</Text>
      </Pressable>
    </SheetWrapper>
  );
});

export default ProductSheet;

const styles = StyleSheet.create({
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  brand: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  brandSpacer: {
    height: 12,
  },
  dateBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderCurve: "continuous",
    marginBottom: 6,
    overflow: "hidden",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  dateTextCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.3,
  },
  dateValuePlaceholder: {
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  dateActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(52,168,83,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    borderCurve: "continuous",
    marginBottom: 8,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
});
