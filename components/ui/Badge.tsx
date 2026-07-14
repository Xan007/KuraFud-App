import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Colors, BorderRadius, Spacing, Typography } from "@/constants/theme";
import { AppText } from "./Text";

type Tone = "neutral" | "warning" | "primary" | "danger";

type BadgeProps = {
  label: string;
  tone?: Tone;
};

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: Colors.surface, fg: Colors.textSecondary },
  warning: { bg: Colors.warning + "22", fg: Colors.warning },
  primary: { bg: Colors.primary + "1A", fg: Colors.primary },
  danger: { bg: Colors.error + "1A", fg: Colors.error },
};


export const Badge = memo(function Badge({
  label,
  tone = "neutral",
}: BadgeProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <AppText
        variant="label"
        style={[styles.text, { color: t.fg }]}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderCurve: "continuous",
    alignSelf: "flex-start",
  },
  text: {
    ...Typography.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.6,
  },
});

export default Badge;
