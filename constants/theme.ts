export const Colors = {
  primary: "#34A853",
  background: "#FAFAFA",
  surface: "#F0F4EF",
  text: "#1B1B1B",
  textSecondary: "#6B7280",
  border: "#D4DAD0",
  white: "#FFFFFF",
  warning: "#F59E0B",
  error: "#EF4444",

  overlay: "rgba(0,0,0,0.5)",
  overlayLight: "rgba(255,255,255,0.25)",
  shadow: "rgba(0,0,0,0.08)",
  errorSurface: "#FEE2E2",
  errorTextStrong: "#7F1D1D",
  errorTextMuted: "#991B1B",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const FontSize = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export function withOpacity(hexColor: string, alpha: number): string {

  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${clampedAlpha})`;
}

export const Typography = {
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  heading: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  subheading: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  body: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
  },
  bodyMedium: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  caption: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  button: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
} as const;
