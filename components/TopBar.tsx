import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Colors, FontSize } from "@/constants/theme";

type Props = {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
};

/**
 * Top navigation bar with an optional back button, centered title, and an
 * optional right slot (e.g. a settings icon).  Handles safe-area inset
 * automatically.
 */
export default function TopBar({
  title = "Expirat",
  showBack,
  onBack,
  rightSlot,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 4 }]}>
      <View style={styles.inner}>
        {showBack ? (
          <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12}>
            <SymbolView
              name={{ ios: "chevron.left", android: "chevron_left" }}
              size={24}
              tintColor={Colors.primary}
            />
          </Pressable>
        ) : (
          <View style={styles.side} />
        )}

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.side}>{rightSlot}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backBtn: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    flex: 1,
    letterSpacing: -0.3,
  },
  side: {
    minWidth: 36,
    alignItems: "flex-end",
  },
});
