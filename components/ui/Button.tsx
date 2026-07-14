import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { AppText } from "./Text";

type Variant = "primary" | "secondary" | "danger" | "outline";
type Size = "md" | "sm";

interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  variant?: Variant;
  size?: Size;
  children: string;
  style?: any;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  style,
  onPress,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled ?? false;
  const baseStyle = getBaseStyle(size);
  const variantStyle = getVariantStyle(variant, isDisabled);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        baseStyle,
        variantStyle,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      {...props}
    >
      <AppText
        variant="button"
        color={getTextColor(variant, isDisabled)}
      >
        {children}
      </AppText>
    </Pressable>
  );
}

function getBaseStyle(size: Size) {
  switch (size) {
    case "sm":
      return {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.sm,
      };
    case "md":
    default:
      return {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md,
      };
  }
}

function getVariantStyle(variant: Variant, disabled: boolean = false) {
  if (disabled) {
    return {
      backgroundColor: Colors.border,
      borderWidth: 0,
    };
  }

  switch (variant) {
    case "primary":
      return {
        backgroundColor: Colors.primary,
        borderWidth: 0,
      };
    case "secondary":
      return {
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.border,
      };
    case "danger":
      return {
        backgroundColor: Colors.error,
        borderWidth: 0,
      };
    case "outline":
      return {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: Colors.border,
      };
    default:
      return {};
  }
}

function getTextColor(variant: Variant, disabled: boolean = false): string {
  if (disabled) {
    return Colors.textSecondary;
  }

  switch (variant) {
    case "primary":
    case "danger":
      return Colors.white;
    case "secondary":
    case "outline":
      return Colors.text;
    default:
      return Colors.text;
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
