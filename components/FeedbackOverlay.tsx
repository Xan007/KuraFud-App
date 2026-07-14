import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { Colors, BorderRadius } from "@/constants/theme";

interface FeedbackOverlayProps {
  visible: boolean;
  onDone: () => void;
}

const ENTER_DURATION = 250;
const HOLD_DURATION = 600;
const EXIT_DURATION = 250;

export function FeedbackOverlay({ visible, onDone }: FeedbackOverlayProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const handleDone = useCallback(() => {
    onDoneRef.current();
  }, []);

  useEffect(() => {
    if (visible) {
      scale.value = 0;
      opacity.value = 0;

      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
      });
      opacity.value = withTiming(1, {
        duration: ENTER_DURATION,
        easing: Easing.out(Easing.ease),
      });

      opacity.value = withDelay(
        ENTER_DURATION + HOLD_DURATION,
        withTiming(0, {
          duration: EXIT_DURATION,
          easing: Easing.in(Easing.ease),
        }),
      );
      scale.value = withDelay(
        ENTER_DURATION + HOLD_DURATION,
        withTiming(0, {
          duration: EXIT_DURATION,
          easing: Easing.in(Easing.ease),
        }, (finished) => {
          if (finished) runOnJS(handleDone)();
        }),
      );
    }

  }, [visible]);

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.circle, rStyle]}>
        <SymbolView
          name={{ ios: "checkmark", android: "check" }}
          size={40}
          tintColor={Colors.white}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
    elevation: 300,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default FeedbackOverlay;
