import { useRouter } from "expo-router";
import { Spacing, Colors } from "@/constants/theme";
import TopBar from "components/TopBar";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();

  return (
    <View style={{ width, height }}>
      <TopBar title="Expirat" />

      <View style={styles.body}>
        <Text style={styles.subtitle}>
          Escanea codigos de barras de alimentos
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push("/scanner")}
        >
          <Text style={styles.buttonText}>Escanear codigo de barras</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  subtitle: {
    fontSize: 20,
    textAlign: "center",
    color: "#666",
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderCurve: "continuous",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
