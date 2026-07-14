import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/Text";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export interface SnackbarState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface SnackbarProps {
  snackbar: SnackbarState | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;
const ANIM_DURATION = 300;

export function Snackbar({ snackbar, onDismiss }: SnackbarProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(200);
  const opacity = useSharedValue(0);
  const [mounted, setMounted] = useState(false);
  const animatingOut = useRef(false);

  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const handleDismiss = useCallback(() => {
    if (animatingOut.current) return;
    animatingOut.current = true;
    translateY.value = withTiming(200, { duration: ANIM_DURATION, easing: Easing.inOut(Easing.ease) }, (finished) => {
      if (finished) {
        runOnJS(finishDismiss)();
      }
    });
    opacity.value = withTiming(0, { duration: ANIM_DURATION });
  }, [translateY, opacity]);

  const finishDismiss = useCallback(() => {
    animatingOut.current = false;
    setMounted(false);
    onDismissRef.current();
  }, []);

  useEffect(() => {
    if (snackbar) {
      setMounted(true);
      animatingOut.current = false;
      translateY.value = 200;
      opacity.value = 0;

      translateY.value = withSpring(0, {
        damping: 18,
        stiffness: 200,
        overshootClamping: true,
      });
      opacity.value = withTiming(1, { duration: ANIM_DURATION });

      const timeout = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_MS);

      return () => clearTimeout(timeout);
    }
  }, [snackbar]);

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!mounted || !snackbar) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: insets.bottom + Spacing.lg },
        rStyle,
      ]}
      pointerEvents="auto"
    >
      <View style={styles.content}>
        <AppText variant="body" color={Colors.text} style={styles.message}>
          {snackbar.message}
        </AppText>
        {snackbar.actionLabel && snackbar.onAction ? (
          <Pressable
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
            onPress={() => {
              snackbar.onAction?.();
              handleDismiss();
            }}
            hitSlop={8}
          >
            <AppText variant="button" color={Colors.primary}>
              {snackbar.actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 400,
    elevation: 400,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    flex: 1,
    flexShrink: 1,
  },
  action: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
});

export default Snackbar;
