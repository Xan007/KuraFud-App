import { memo, useCallback, useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, BorderRadius } from "@/constants/theme";

export type SheetWrapperHandle = {
  dismiss: () => void;
};

type SheetWrapperProps = {
  onDismiss: () => void;
  children: ReactNode;
  ref?: Ref<SheetWrapperHandle>;
};

const SHEET_ANIM_DURATION = 300;
const DISMISS_ANIM_DURATION = 200;

const SheetWrapper = memo(function SheetWrapper({
  onDismiss,
  children,
  ref,
}: SheetWrapperProps) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);


  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);


  const handleDismissComplete = useCallback(() => {
    onDismissRef.current();
  }, []);

  const dismiss = useCallback(() => {
    progress.value = withTiming(0, { duration: DISMISS_ANIM_DURATION }, (finished) => {
      if (finished) {
        runOnJS(handleDismissComplete)();
      }
    });
  }, [progress, handleDismissComplete]);

  useImperativeHandle(
    ref,
    () => ({
      dismiss,
    }),
    [dismiss],
  );

  useEffect(() => {
    progress.value = withTiming(1, { duration: SHEET_ANIM_DURATION });
  }, [progress]);

  useEffect(() => {
    const onShow = Keyboard.addListener("keyboardDidShow", (e) => {
      keyboardOffset.value = e.endCoordinates.height;
    });
    const onHide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardOffset.value = 0;
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const rBackdrop = useAnimatedStyle(() => ({
    opacity: progress.value * 0.5,
  }));

  const rSheet = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - progress.value) * 300 - keyboardOffset.value,
      },
    ],
    opacity: progress.value < 0.1 ? progress.value * 10 : 1,
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
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
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
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
    zIndex: 20,
  },
});
