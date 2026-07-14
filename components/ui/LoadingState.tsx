import { View, StyleSheet } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { AppText } from "./Text";

interface LoadingStateProps {
  message?: string;
}


export function LoadingState({ message = "Cargando..." }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <AppText variant="body" color={Colors.textSecondary}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
});

export default LoadingState;
