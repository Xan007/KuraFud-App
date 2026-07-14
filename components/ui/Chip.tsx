import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { Colors, BorderRadius, Spacing, withOpacity } from "@/constants/theme";
import { AppText } from "./Text";

interface ChipProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  style?: any;
}


export function Chip({
  label,
  selected = false,
  disabled = false,
  style,
  onPress,
  ...props
}: ChipProps) {
  const backgroundColor = disabled
    ? Colors.border
    : selected
      ? withOpacity(Colors.primary, 0.25)
      : withOpacity(Colors.primary, 0.08);

  const borderColor = disabled ? Colors.textSecondary : Colors.primary;

  const textColor = disabled ? Colors.textSecondary : Colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor,
          borderColor,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <AppText variant="label" color={textColor}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Chip;
