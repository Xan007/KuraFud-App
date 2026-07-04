import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/theme";
import TopBar from "components/TopBar";
import { useAppTranslation } from "@/hooks/useAppTranslation";

export default function KitchenScreen() {
  const { t } = useAppTranslation();

  return (
    <View style={styles.container}>
      <TopBar title={t('kitchen.title')} />
      <View style={styles.content}>
        <Text style={styles.title}>{t('kitchen.comingSoon')}</Text>
        <Text style={styles.subtitle}>{t('kitchen.featureComingSoon')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
