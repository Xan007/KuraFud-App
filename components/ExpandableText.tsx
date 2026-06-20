import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/theme";

type Props = {
  label: string;
  text: string;
  limit?: number;
};

export default function ExpandableText({ label, text, limit = 120 }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > limit;
  const display = expanded
    ? text
    : text.slice(0, limit) + (isLong ? "..." : "");

  return (
    <View style={styles.block}>
      <Text style={styles.text}>
        {label}: {display}
      </Text>
      {isLong && (
        <Pressable onPress={() => setExpanded(!expanded)}>
          <Text style={styles.toggle}>
            {expanded ? "  Ver menos" : "  Ver mas"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 6 },
  text: { fontSize: 14, marginBottom: 6, lineHeight: 20 },
  toggle: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
});
