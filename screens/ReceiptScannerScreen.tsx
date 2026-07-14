import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  useCameraDevice,
  useCameraPermission,
  type CameraRef,
} from "react-native-vision-camera";

import { Colors, Spacing } from "@/constants/theme";
import { AppText } from "@/components/ui/Text";
import CameraSection from "@/components/CameraSection";
import type { CameraLayout } from "@/components/CameraSection";
import { showToast } from "@/helpers/toast";
import { analyzeReceiptImage } from "@/services/receiptAnalyzer";

export default function ReceiptScannerScreen() {
  const insets = useSafeAreaInsets();
  const [cameraPosition, setCameraPosition] = useState<"back" | "front">(
    "back",
  );
  const [torch, setTorch] = useState<"off" | "on">("off");
  const [zoomLabel, setZoomLabel] = useState("1.0x");
  const [analyzing, setAnalyzing] = useState(false);

  const cameraRef = useRef<CameraRef>(null);
  const cameraLayoutRef = useRef<CameraLayout | null>(null);

  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();

  const handleCameraLayout = useCallback((layout: CameraLayout) => {
    cameraLayoutRef.current = layout;
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || analyzing) return;

    setAnalyzing(true);
    try {

      const snapshot = await cameraRef.current.takeSnapshot();
      const photoPath = await snapshot.saveToTemporaryFileAsync("jpg", 0.8);

      const results = await analyzeReceiptImage(photoPath);

      router.push({
        pathname: "/receipt-results",
        params: { results: JSON.stringify(results) },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al analizar recibo";
      showToast(message);
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing]);

  const handleToggleTorch = useCallback(() => {
    setTorch((prev) => (prev === "off" ? "on" : "off"));
  }, []);

  const handleToggleCamera = useCallback(() => {
    setCameraPosition((prev) => (prev === "back" ? "front" : "back"));
  }, []);

  const handleZoomIn = useCallback(() => {
    const current = parseFloat(zoomLabel);
    const next = Math.min(current + 0.5, 10);
    setZoomLabel(`${next.toFixed(1)}x`);
  }, [zoomLabel]);

  const handleZoomOut = useCallback(() => {
    const current = parseFloat(zoomLabel);
    const next = Math.max(current - 0.5, 1);
    setZoomLabel(`${next.toFixed(1)}x`);
  }, [zoomLabel]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <AppText>Permiso de cámara requerido</AppText>
          <Pressable style={styles.permBtn} onPress={requestPermission}>
            <AppText style={{ color: "#fff", fontWeight: "600" }}>
              Conceder permiso
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <AppText>No hay cámara disponible</AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraSection
        device={device}
        cameraRef={cameraRef}
        torch={torch}
        zoomLabel={zoomLabel}
        onToggleTorch={handleToggleTorch}
        onToggleCamera={handleToggleCamera}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onBack={() => router.back()}
        insets={insets}
        hasTorch={device.hasTorch}
        onCameraLayout={handleCameraLayout}
        hideZoom
        hideFlip
      />

      <View
        style={[
          styles.captureSection,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        {analyzing ? (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <AppText style={{ marginTop: Spacing.md, color: "#fff" }}>
              Analizando recibo...
            </AppText>
          </View>
        ) : (
          <Pressable style={styles.captureBtn} onPress={handleCapture}>
            <View style={styles.captureBtnInner} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: Spacing.lg,
  },
  permBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    borderCurve: "continuous",
  },

  captureSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    zIndex: 10,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.7)",
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  analyzingContainer: {
    alignItems: "center",
  },
});
