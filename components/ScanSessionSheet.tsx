import { memo, useCallback } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Colors, BorderRadius, Spacing, withOpacity } from "@/constants/theme";
import { AppText } from "./ui/Text";
import { Button } from "./ui/Button";
import { IconButton } from "./ui/IconButton";
import SheetWrapper from "@/components/SheetWrapper";
import type { ProductInfo } from "types";

export type SessionItem = {
  key: string;
  barcode: string;
  product: ProductInfo;
  date?: string;
  datePhotoUri?: string;
};

type Props = {
  items: SessionItem[];
  selectedKey: string | null;
  finalizing?: boolean;
  onSelectItem: (key: string) => void;
  onRemoveItem: (key: string) => void;
  onEditDate: (key: string) => void;
  onFinalize: () => void;
  onCancel: () => void;
};

const CARD_WIDTH = 110;
const CARD_HEIGHT = 170;
const SELECTED_TINT = withOpacity(Colors.primary, 0.08);

const CornerBrackets = memo(function CornerBrackets() {
  return (
    <>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </>
  );
});

function SessionItemCard({
  item,
  isSelected,
  onSelect,
  onEditDate,
  onRemove,
}: {
  item: SessionItem;
  isSelected: boolean;
  onSelect: () => void;
  onEditDate: () => void;
  onRemove: () => void;
}) {
  return (
    <Pressable
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onSelect}
      onLongPress={onEditDate}
    >
      {isSelected && <CornerBrackets />}

      <IconButton
        variant="plain"
        size="sm"
        icon={
          <SymbolView
            name={{ ios: "xmark", android: "close" }}
            size={12}
            tintColor={Colors.textSecondary}
          />
        }
        onPress={onRemove}
        style={styles.removeBtn}
      />

      <View style={styles.cardImageContainer}>
        {item.product.imageFrontUrl ? (
          <Image
            source={{ uri: item.product.imageFrontUrl }}
            style={styles.cardImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <SymbolView
              name={{ ios: "photo", android: "image" }}
              size={20}
              tintColor={Colors.textSecondary}
            />
          </View>
        )}
      </View>

      <AppText variant="caption" numberOfLines={2} style={styles.cardName}>
        {item.product.name || "—"}
      </AppText>

      <View style={styles.cardDateRow}>
        {item.date ? (
          <AppText variant="caption" color={Colors.text}>
            {item.date}
          </AppText>
        ) : (
          <AppText variant="caption" color={Colors.warning}>
            Sin fecha
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const ScanSessionSheet = memo(function ScanSessionSheet({
  items,
  selectedKey,
  finalizing,
  onSelectItem,
  onRemoveItem,
  onEditDate,
  onFinalize,
  onCancel,
}: Props) {
  const renderItem = useCallback(
    ({ item }: { item: SessionItem }) => (
      <SessionItemCard
        item={item}
        isSelected={item.key === selectedKey}
        onSelect={() => onSelectItem(item.key)}
        onEditDate={() => onEditDate(item.key)}
        onRemove={() => onRemoveItem(item.key)}
      />
    ),
    [selectedKey, onSelectItem, onEditDate, onRemoveItem],
  );

  return (
    <SheetWrapper onDismiss={onCancel}>
      <View style={styles.header}>
        <AppText variant="heading">
          Productos escaneados ({items.length})
        </AppText>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListEmptyComponent={null}
      />

      <View style={styles.footer}>
        <Button
          variant="secondary"
          size="md"
          onPress={onCancel}
          style={styles.footerBtn}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="md"
          onPress={onFinalize}
          disabled={finalizing}
          style={styles.footerBtn}
        >
          {finalizing ? "Guardando…" : "Finalizar"}
        </Button>
      </View>
    </SheetWrapper>
  );
});

export default ScanSessionSheet;

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.md,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    padding: Spacing.sm,
    position: "relative",
  },
  cardSelected: {
    backgroundColor: SELECTED_TINT,
  },
  removeBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    zIndex: 2,
  },
  corner: {
    position: "absolute",
    width: 14,
    height: 14,
    zIndex: 1,
    pointerEvents: "none",
  },
  cornerTL: {
    top: 2,
    left: 2,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: Colors.primary,
    borderTopLeftRadius: BorderRadius.sm,
  },
  cornerTR: {
    top: 2,
    right: 2,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: Colors.primary,
    borderTopRightRadius: BorderRadius.sm,
  },
  cornerBL: {
    bottom: 2,
    left: 2,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: Colors.primary,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  cornerBR: {
    bottom: 2,
    right: 2,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.sm,
  },
  cardImageContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    backgroundColor: Colors.background,
    alignSelf: "center",
    marginBottom: 4,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  cardName: {
    textAlign: "center",
    marginBottom: 4,
    flex: 1,
  },
  cardDateRow: {
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerBtn: {
    flex: 1,
  },
});
