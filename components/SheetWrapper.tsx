import { memo, useCallback, useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

type SheetWrapperProps = {
  /** Called when the sheet should be dismissed (backdrop press or programmatic). */
  onDismiss: () => void;
  /** Content rendered inside the sheet, below the drag handle. */
  children: ReactNode;
};

/**
 * Reusable bottom-sheet wrapper with a backdrop, drag handle, and animated
 * entrance / dismissal.  Both `DatePreviewSheet` and `ProductSheet` use this
 * internally to avoid duplicating the animation logic.
 */
const SheetWrapper = memo(function SheetWrapper({
  onDismiss,
  children,
}: SheetWrapperProps) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 300 });
  }, [progress]);

  const dismiss = useCallback(() => {
    progress.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)();
    });
  }, [onDismiss, progress]);

  const rBackdrop = useAnimatedStyle(() => ({
    opacity: progress.value * 0.2,
  }));

  const rSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 300 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, rBackdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, rSheet]}
      >
        <View style={styles.handle} />
        {children}
      </Animated.View>
    </View>
  );
});

export default SheetWrapper;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
});
