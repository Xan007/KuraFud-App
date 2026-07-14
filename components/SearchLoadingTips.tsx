import { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { Colors, Spacing } from "@/constants/theme";
import { AppText } from "@/components/ui/Text";
import { useAppTranslation } from "@/hooks/useAppTranslation";

const TIP_KEYS = [
  "searchTips.tip1",
  "searchTips.tip2",
  "searchTips.tip3",
  "searchTips.tip4",
  "searchTips.tip5",
  "searchTips.tip6",
  "searchTips.tip7",
  "searchTips.tip8",
] as const;


export const SearchLoadingTips = memo(function SearchLoadingTips() {
  const { t } = useAppTranslation();
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * TIP_KEYS.length),
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(function tick() {
      setIndex((i) => (i + 1) % TIP_KEYS.length);
      timer.current = setTimeout(tick, 3500);
    }, 3500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
      <Animated.View
        key={index}
        entering={FadeInUp.duration(400)}
        exiting={FadeOutDown.duration(300)}
        style={styles.tipWrap}
      >
        <AppText variant="body" color={Colors.textSecondary} style={styles.tipText}>
          <AppText variant="body" color={Colors.primary} style={styles.tipPrefix}>
            Tip:{" "}
          </AppText>
          {t(TIP_KEYS[index])}
        </AppText>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  spinnerWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary + "12",
  },
  tipWrap: {
    alignItems: "center",
    maxWidth: 320,
  },
  tipPrefix: {
    fontWeight: "600",
  },
  tipText: {
    textAlign: "center",
    lineHeight: 20,
  },
});

export default SearchLoadingTips;
