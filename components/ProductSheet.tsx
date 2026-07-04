import { memo } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Colors, BorderRadius, Spacing, withOpacity } from "@/constants/theme";
import type { ProductInfo } from "types";
import SheetWrapper from "@/components/SheetWrapper";
import { AppText } from "./ui/Text";
import { Button } from "./ui/Button";
import { IconButton } from "./ui/IconButton";

type Props = {
  product: ProductInfo;
  date?: string;
  onDismiss: () => void;
  onScanDate: () => void;
  onDateConfirm: () => void;
  onDateCancel: () => void;
  onEditDate: () => void;
  onChangeName?: (name: string) => void;
};

const ProductSheet = memo(function ProductSheet({
  product,
  date,
  onDismiss,
  onScanDate,
  onDateConfirm,
  onDateCancel,
  onEditDate,
  onChangeName,
}: Props) {
  return (
    <SheetWrapper onDismiss={onDismiss}>
      {onChangeName ? (
        <TextInput
          style={styles.nameInput}
          value={product.name}
          onChangeText={onChangeName}
          placeholder="Nombre del producto"
          placeholderTextColor={Colors.textSecondary}
          selectTextOnFocus
        />
      ) : (
        <AppText variant="title" numberOfLines={2}>
          {product.name}
        </AppText>
      )}
      {product.brand ? (
        <AppText variant="body" color={Colors.textSecondary}>
          {product.brand}
        </AppText>
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
            <AppText variant="label" color={Colors.textSecondary}>
              Vence
            </AppText>
            <AppText
              variant="subheading"
              color={!date ? Colors.textSecondary : Colors.text}
              style={!date && styles.dateValuePlaceholder}
            >
              {date ?? "--/--/----"}
            </AppText>
          </View>
          <View style={styles.dateActions}>
            <IconButton
              variant="subtle"
              size="sm"
              icon={
                <SymbolView
                  name={{ ios: "pencil.circle", android: "edit" }}
                  size={18}
                  tintColor={Colors.primary}
                />
              }
              onPress={onEditDate}
            />
            <IconButton
              variant="subtle"
              size="sm"
              icon={
                <SymbolView
                  name={{
                    ios: "camera.viewfinder",
                    android: "photo_camera",
                  }}
                  size={18}
                  tintColor={Colors.textSecondary}
                />
              }
              onPress={onScanDate}
            />
          </View>
        </View>
      </View>

      <Button variant="primary" size="md" onPress={onDateConfirm}>
        Confirmar
      </Button>

      <Button variant="secondary" size="md" onPress={onDateCancel}>
        Cancelar
      </Button>
    </SheetWrapper>
  );
});

export default ProductSheet;

const styles = StyleSheet.create({
  brandSpacer: {
    height: 12,
  },
  dateBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  dateTextCol: {
    flex: 1,
  },
  dateValuePlaceholder: {
    fontWeight: "500",
  },
  dateActions: {
    flexDirection: "row",
    gap: 6,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: 2,
  },
});
