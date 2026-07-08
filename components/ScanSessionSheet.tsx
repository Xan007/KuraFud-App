import { memo } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
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
  onRemoveItem: (key: string) => void;
  onEditDate: (key: string) => void;
  onScanDate: (key: string) => void;
  onFinalize: () => void;
  onCancel: () => void;
};

const CARD_WIDTH = 110;
const CARD_HEIGHT = 170;

function SessionItemCard({
  item,
  onRemove,
  onEditDate,
  onScanDate,
}: {
  item: SessionItem;
  onRemove: () => void;
  onEditDate: () => void;
  onScanDate: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onEditDate}>
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

      <View style={styles.cardActions}>
        <IconButton
          variant="subtle"
          size="sm"
          icon={
            <SymbolView
              name={{ ios: "camera.viewfinder", android: "photo_camera" }}
              size={14}
              tintColor={Colors.primary}
            />
          }
          onPress={onScanDate}
        />
        <IconButton
          variant="subtle"
          size="sm"
          icon={
            <SymbolView
              name={{ ios: "xmark", android: "close" }}
              size={12}
              tintColor={Colors.textSecondary}
            />
          }
          onPress={onRemove}
        />
      </View>
    </Pressable>
  );
}

const ScanSessionSheet = memo(function ScanSessionSheet({
  items,
  onRemoveItem,
  onEditDate,
  onScanDate,
  onFinalize,
  onCancel,
}: Props) {
  return (
    <SheetWrapper onDismiss={onCancel}>
      <View style={styles.header}>
        <AppText variant="heading">
          Productos escaneados ({items.length})
        </AppText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <SessionItemCard
            key={item.key}
            item={item}
            onRemove={() => onRemoveItem(item.key)}
            onEditDate={() => onEditDate(item.key)}
            onScanDate={() => onScanDate(item.key)}
          />
        ))}
      </ScrollView>

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
          style={styles.footerBtn}
        >
          Finalizar
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
  cardActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    marginTop: 4,
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
