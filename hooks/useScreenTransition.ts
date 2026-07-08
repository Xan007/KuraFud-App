import { useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";

export function useScreenTransition() {
  const opacity = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(() => {
    setIsFocused(true);
    return () => {
      setIsFocused(false);
    };
  });

  useEffect(() => {
    opacity.value = withTiming(isFocused ? 1 : 0, { duration: isFocused ? 300 : 250 });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return animatedStyle;
}
