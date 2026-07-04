import { Host } from "@expo/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Component, type ReactNode, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/theme";
import { initializeDatabase } from "../db/init";
import {
  configureNotificationHandler,
  ensureNotificationChannel,
  addNotificationTapListener,
  rebuildAllReminders,
} from "@/services/notifications";
import { cleanupExpiredInventory } from "@/services/inventoryCleanup";
import { initializeI18n } from "@/services/i18n";

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

/**
 * Root layout wrapping the entire app with gesture handling, safe-area
 * support, an error boundary, the Expo Router stack navigator, and
 * notification setup.
 */
export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    initializeI18n().catch(console.error);
    configureNotificationHandler();
    ensureNotificationChannel().catch(() => {});
    cleanupExpiredInventory().catch(() => {});
    rebuildAllReminders().catch(() => {});

    const unsubscribe = addNotificationTapListener(() => {
      router.replace("/(tabs)");
    });

    return unsubscribe;
  }, [router]);

  try {
    initializeDatabase();
  } catch (e) {
    return (
      <View style={styles.initContainer}>
        <Text style={styles.initError}>Error al iniciar la base de datos</Text>
        <Text style={styles.initErrorDetail}>
          {e instanceof Error ? e.message : String(e)}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <Host style={styles.host}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "fade",
                animationDuration: 250,
              }}
            >
              <Stack.Screen name="(tabs)" />
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
  initContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.background,
  },
  initError: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  initErrorDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "monospace",
    textAlign: "center",
  },
});
