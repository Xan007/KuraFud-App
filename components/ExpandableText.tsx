import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { AppText } from "@/components/ui/Text";
import { useAppTranslation } from "@/hooks/useAppTranslation";

type Props = {
  label?: string;
  text: string;
  limit?: number;
};


export default function ExpandableText({ label, text, limit = 120 }: Props) {
  const { t } = useAppTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > limit;
  const display = expanded ? text : text.slice(0, limit) + (isLong ? "..." : "");

  return (
    <View style={styles.block}>
      {label ? <AppText variant="label" color={Colors.textSecondary} style={styles.label}>
        {label}
      </AppText> : null}
      <AppText variant="body" style={styles.text}>
        {display}
      </AppText>
      {isLong ? (
        <Pressable onPress={() => setExpanded(!expanded)} hitSlop={8}>
          <AppText variant="button" color={Colors.primary} style={styles.toggle}>
            {expanded ? t("product.showLess") : t("product.showMore")}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Spacing.xs },
  label: { marginBottom: 4 },
  text: { lineHeight: 20, marginBottom: 4 },
  toggle: {
    marginTop: 2,
  },
});
