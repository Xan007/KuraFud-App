import { useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import type { ReceiptItem } from "@/services/ai/types";
import { useAppTranslation } from "@/hooks/useAppTranslation";

export default function ReceiptResultsScreen() {
  const { t } = useAppTranslation();
  const { results } = useLocalSearchParams<{ results: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  let items: ReceiptItem[] = [];
  try {
    if (results) {
      items = JSON.parse(results);
    }
  } catch (e) {
    console.error("Error parsing results:", e);
  }

  return (
    <View style={styles.container}>
      <TopBar title={t("receiptResults.title")} />

      <FlatList
        data={items}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.lg,
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AppText variant="subheading">{t("receiptResults.empty")}</AppText>
            <AppText
              variant="body"
              color={Colors.textSecondary}
              style={{ marginTop: Spacing.sm }}
            >
              {t("receiptResults.emptyHint")}
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemContent}>
              <AppText variant="subheading" numberOfLines={2}>
                {item.name}
              </AppText>
              <AppText
                variant="body"
                color={Colors.textSecondary}
                style={{ marginTop: Spacing.xs }}
              >
                {t("receiptResults.quantity")}: {item.quantity}
              </AppText>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />

      <View
        style={[
          styles.actionSection,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button
          variant="secondary"
          size="md"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        >
          {t("receiptResults.back")}
        </Button>
        <Button
          variant="primary"
          size="md"
          onPress={() => router.push("/")}
          style={{ flex: 1 }}
        >
          {t("receiptResults.goHome")}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemContent: {
    flex: 1,
  },
  actionSection: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
  },
});
