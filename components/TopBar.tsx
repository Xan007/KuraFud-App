import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Colors, BorderRadius } from "@/constants/theme";
import { AppText } from "./ui/Text";
import { IconButton } from "./ui/IconButton";

type Props = {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
};


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
          <IconButton
            variant="plain"
            size="md"
            icon={
              <SymbolView
                name={{ ios: "chevron.left", android: "chevron_left" }}
                size={24}
                tintColor={Colors.primary}
              />
            }
            onPress={onBack}
          />
        ) : (
          <View style={styles.side} />
        )}

        <AppText variant="title" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>

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
    boxShadow: `0 1px 3px ${Colors.shadow}`,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  title: {
    textAlign: "center",
    flex: 1,
    letterSpacing: -0.3,
  },
  side: {
    minWidth: 36,
    alignItems: "flex-end",
  },
});
