import { useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";

/**
 * Hook para animar la transición suave cuando una pantalla se carga
 * Entrada: fade in suave (300ms)
 * Salida: fade out suave (250ms)
 * Reutilizable en pantallas que no son tabs (como la cámara)
 */
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
    if (isFocused) {
      // Animar a opacidad 1 cuando entra (fade in)
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      // Animar a 0 cuando sale (fade out)
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return animatedStyle;
}
