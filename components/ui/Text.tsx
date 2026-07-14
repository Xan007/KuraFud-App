import { Text as RNText, StyleSheet, type TextProps } from "react-native";
import { Colors, Typography } from "@/constants/theme";

type Variant = keyof typeof Typography;

interface AppTextProps extends Omit<TextProps, "style"> {
  variant?: Variant;
  color?: string;
  style?: any;
}

export function AppText({
  variant = "body",
  color = Colors.text,
  style,
  children,
  ...props
}: AppTextProps) {
  const typographyStyle = Typography[variant];
  const computedStyle = [
    typographyStyle,
    { color },
    style,
  ];

  return (
    <RNText style={computedStyle} {...props}>
      {children}
    </RNText>
  );
}

export default AppText;
