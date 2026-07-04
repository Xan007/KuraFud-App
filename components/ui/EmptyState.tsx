import { View, StyleSheet } from "react-native";
import { Spacing, Colors } from "@/constants/theme";
import { AppText } from "./Text";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Unified empty state component (icon + title + subtitle centered).
 * Replaces three separate implementations across HomeScreen, InventoryScreen,
 * app/product/[barcode]/inventory.tsx, and KitchenScreen placeholder.
 */
export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon}
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      {subtitle && (
        <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
          {subtitle}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: 12,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
});

export default EmptyState;
