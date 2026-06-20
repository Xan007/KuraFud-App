import { Host } from "@expo/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Component, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

// ─── Error Boundary ──────────────────────────────────────

type EBProps = { children: ReactNode };
type EBState = { error: Error | null };

class ErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
            backgroundColor: "#fff",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 12,
              color: "#333",
            }}
          >
            Error al cargar la app
          </Text>
          <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
            <Text
              style={{ fontSize: 13, color: "#666", fontFamily: "monospace" }}
            >
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </Text>
          </ScrollView>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{
              backgroundColor: Colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Root Layout ─────────────────────────────────────────

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <Host style={styles.host}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="scanner" />
              <Stack.Screen name="product/[barcode]" />
            </Stack>
          </Host>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
