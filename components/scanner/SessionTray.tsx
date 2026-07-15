import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, SlideInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Colors, BorderRadius, Spacing, withOpacity } from "@/constants/theme";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import type { SessionItem } from "@/hooks/useScanSessionStore";

type Props = {
  items: SessionItem[];
  activeKey: string | null;
  finalizing: boolean;
  onSelectItem: (key: string) => void;
  onRequestName: (key: string) => void;
  onEditDate: (key: string) => void;
  onRemove: (key: string) => void;
  onSave: () => void;
  onClear: () => void;
};

const ACCENT = Colors.primaryLight;
const CARD_BG = "rgba(255,255,255,0.10)";
const CARD_BORDER = "rgba(255,255,255,0.16)";
const GROUP_BORDER = withOpacity(Colors.primary, 0.45);
const GROUP_BG = withOpacity(Colors.primary, 0.08);

type ItemGroup = {
  id: string;
  barcode: string;
  product: SessionItem["product"];
  items: SessionItem[];
};

const SessionCard = memo(function SessionCard({
  item,
  active,
  onSelectItem,
  onRequestName,
  onEditDate,
  onRemove,
}: {
  item: SessionItem;
  active: boolean;
  onSelectItem: () => void;
  onRequestName: () => void;
  onEditDate: () => void;
  onRemove: () => void;
}) {
  const hasName = !!item.product.name;
  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          active && styles.cardActive,
          pressed && styles.cardPressed,
        ]}
        onPress={hasName ? onSelectItem : onRequestName}
      >
        <View style={styles.thumb}>
          {item.product.imageFrontUrl ? (
            <Image
              source={{ uri: item.product.imageFrontUrl }}
              style={styles.thumbImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <SymbolView
              name={{ ios: "shippingbox", android: "inventory_2" }}
              size={18}
              tintColor="rgba(255,255,255,0.5)"
            />
          )}
        </View>

        <View style={styles.cardInfo}>
          <AppText
            variant="caption"
            color={Colors.white}
            numberOfLines={1}
            style={styles.cardName}
          >
            {hasName ? item.product.name : item.barcode}
          </AppText>
          <Pressable
            onPress={onEditDate}
            hitSlop={6}
            style={[
              styles.dateChip,
              {
                backgroundColor: item.date
                  ? withOpacity(ACCENT, 0.18)
                  : withOpacity(Colors.warning, 0.2),
              },
            ]}
          >
            <AppText
              variant="caption"
              color={item.date ? ACCENT : Colors.warning}
              style={styles.dateChipText}
            >
              {item.date ?? "— · —"}
            </AppText>
          </Pressable>
          {!hasName && (
            <View style={[styles.nameChip, { backgroundColor: withOpacity(Colors.warning, 0.2) }]}>
              <AppText variant="caption" color={Colors.warning} style={styles.nameChipText}>
                Sin nombre
              </AppText>
            </View>
          )}
        </View>

        <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
          <SymbolView
            name={{ ios: "xmark", android: "close" }}
            size={11}
            tintColor="rgba(255,255,255,0.7)"
          />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

const GroupedRow = memo(function GroupedRow({
  group,
  activeKey,
  onSelectItem,
  onRequestName,
  onEditDate,
  onRemove,
}: {
  group: ItemGroup;
  activeKey: string | null;
  onSelectItem: (key: string) => void;
  onRequestName: (key: string) => void;
  onEditDate: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const multiple = group.items.length > 1;
  const wrapperStyle = multiple
    ? [styles.groupBox]
    : StyleSheet.flatten([styles.groupSingle]);

  return (
    <View style={wrapperStyle}>
      {multiple && (
        <View style={styles.groupHeader} pointerEvents="none">
          <AppText variant="caption" color={Colors.primaryLight} style={styles.groupCount}>
            ×{group.items.length}
          </AppText>
        </View>
      )}
      <View style={styles.groupCards}>
        {group.items.map((item) => (
          <SessionCard
            key={item.key}
            item={item}
            active={item.key === activeKey}
            onSelectItem={() => onSelectItem(item.key)}
            onRequestName={() => onRequestName(item.key)}
            onEditDate={() => onEditDate(item.key)}
            onRemove={() => onRemove(item.key)}
          />
        ))}
      </View>
    </View>
  );
});

const SessionTray = memo(function SessionTray({
  items,
  activeKey,
  finalizing,
  onSelectItem,
  onRequestName,
  onEditDate,
  onRemove,
  onSave,
  onClear,
}: Props) {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ItemGroup>>(null);

  const missingDates = useMemo(
    () => items.filter((i) => !i.date).length,
    [items],
  );

  // Agrupar items por barcode conservando el orden de llegada.
  const groups = useMemo<ItemGroup[]>(() => {
    const out: ItemGroup[] = [];
    const seen = new Map<string, number>();
    for (const it of items) {
      const idx = seen.get(it.barcode);
      if (idx == null) {
        seen.set(it.barcode, out.length);
        out.push({
          id: it.barcode,
          barcode: it.barcode,
          product: it.product,
          items: [it],
        });
      } else {
        out[idx].items.push(it);
      }
    }
    return out;
  }, [items]);

  // Auto-scroll a la derecha cuando crece la lista.
  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [items.length, groups.length]);

  const renderItem = useCallback(
    ({ item }: { item: ItemGroup }) => (
      <GroupedRow
        group={item}
        activeKey={activeKey}
        onSelectItem={onSelectItem}
        onRequestName={onRequestName}
        onEditDate={onEditDate}
        onRemove={onRemove}
      />
    ),
    [activeKey, onSelectItem, onRequestName, onEditDate, onRemove],
  );

  return (
    <Animated.View
      entering={SlideInDown.duration(350)}
      style={styles.container}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={["transparent", "rgba(2,10,6,0.88)", "rgba(2,10,6,0.97)"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.content, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <AppText variant="caption" color={Colors.white}>
            {t("scanner.sessionCount", { count: items.length })}
            {missingDates > 0 && (
              <AppText variant="caption" color={Colors.warning}>
                {"  ·  "}
                {t("scanner.missingDates", { count: missingDates })}
              </AppText>
            )}
          </AppText>
          <IconButton
            variant="plain"
            size="sm"
            icon={
              <SymbolView
                name={{ ios: "trash", android: "delete" }}
                size={16}
                tintColor="rgba(255,255,255,0.7)"
              />
            }
            onPress={onClear}
          />
        </View>

        <FlatList
          ref={listRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={groups}
          keyExtractor={(g) => g.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            finalizing && styles.saveButtonDisabled,
          ]}
          onPress={onSave}
          disabled={finalizing}
        >
          <AppText variant="button" color="#04180D">
            {finalizing
              ? t("scanner.saving")
              : t("scanner.save", { count: items.length })}
          </AppText>
        </Pressable>
      </View>
    </Animated.View>
  );
});

export default SessionTray;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    paddingTop: 28,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listContent: {
    gap: Spacing.sm,
    paddingTop: 14,
    paddingBottom: 4,
    alignItems: "stretch",
  },
  groupSingle: {
    padding: Spacing.xs,
  },
  groupBox: {
    borderWidth: 1.5,
    borderColor: GROUP_BORDER,
    backgroundColor: GROUP_BG,
    borderRadius: BorderRadius.xl,
    borderCurve: "continuous",
    padding: Spacing.xs,
    position: "relative",
  },
  groupHeader: {
    position: "absolute",
    top: -10,
    right: Spacing.md,
    backgroundColor: "rgba(2,10,6,0.97)",
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: BorderRadius.pill,
    zIndex: 2,
  },
  groupCount: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  groupCards: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    width: 176,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderCurve: "continuous",
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  cardActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: withOpacity(Colors.primary, 0.14),
  },
  cardPressed: {
    opacity: 0.85,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontWeight: "600",
  },
  dateChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  nameChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  nameChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  removeBtn: {
    alignSelf: "flex-start",
    padding: 2,
  },
  saveButton: {
    height: 50,
    borderRadius: BorderRadius.pill,
    borderCurve: "continuous",
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
