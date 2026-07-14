import { Pressable, StyleSheet, type PressableProps, View } from "react-native";
import { Colors, BorderRadius, withOpacity } from "@/constants/theme";

type Variant = "overlay" | "subtle" | "plain";
type Size = "sm" | "md" | "lg";

interface IconButtonProps extends Omit<PressableProps, "style" | "children"> {
  variant?: Variant;
  size?: Size;
  icon: React.ReactNode;
  hitSlop?: number;
  style?: any;
}

export function IconButton({
  variant = "plain",
  size = "md",
  icon,
  style,
  hitSlop = 12,
  onPress,
  disabled,
  ...props
}: IconButtonProps) {
  const sizeStyle = getSizeStyle(size);
  const variantStyle = getVariantStyle(variant);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        variantStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      hitSlop={hitSlop}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <View style={styles.iconContainer}>{icon}</View>
    </Pressable>
  );
}

function getSizeStyle(size: Size) {
  switch (size) {
    case "sm":
      return {
        width: 32,
        height: 32,
        borderRadius: 16,
      };
    case "md":
      return {
        width: 40,
        height: 40,
        borderRadius: 20,
      };
    case "lg":
      return {
        width: 56,
        height: 56,
        borderRadius: 28,
      };
  }
}

function getVariantStyle(variant: Variant) {
  switch (variant) {
    case "overlay":
      return {
        backgroundColor: Colors.overlay,
      };
    case "subtle":
      return {
        backgroundColor: withOpacity(Colors.primary, 0.1),
      };
    case "plain":
      return {
        backgroundColor: "transparent",
      };
  }
}

const styles = StyleSheet.create({
  base: {
    justifyContent: "center",
    alignItems: "center",
    borderCurve: "continuous",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default IconButton;
