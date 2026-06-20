import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCameraDevice,
  useCameraPermission,
  type CameraRef,
} from "react-native-vision-camera";
import { useBarcodeScannerOutput } from "react-native-vision-camera-barcode-scanner";
import { Colors } from "@/constants/theme";
import CameraSection from "@/components/CameraSection";

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const [cameraPosition, setCameraPosition] = useState<"back" | "front">(
    "back",
  );
  const [torch, setTorch] = useState<"off" | "on">("off");
  const [zoomLabel, setZoomLabel] = useState("1.0x");

  const cameraRef = useRef<CameraRef>(null);
  const isScanningRef = useRef(true);
  const lastZoomRef = useRef("1.0x");

  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();

  // ─── Reset scan flag on focus ───────────────────────────

  useFocusEffect(
    useCallback(() => {
      // Al volver al escáner, habilitamos escaneo
      isScanningRef.current = true;
      return () => {
        // Al salir del escáner, deshabilitamos para no escanear en background
        isScanningRef.current = false;
      };
    }, []),
  );

  // ─── Barcode handler ────────────────────────────────────

  const handleBarcodeScanned = useCallback(
    (barcodes: { rawValue?: string }[]) => {
      if (!isScanningRef.current) return;
      const code = barcodes[0]?.rawValue;
      if (!code) return;
      isScanningRef.current = false;
      router.push(`/product/${encodeURIComponent(code)}`);
    },
    [router],
  );

  const handleError = useCallback((error: Error) => {
    console.warn("Scanner error:", error);
  }, []);

  // ─── Scanner setup ──────────────────────────────────────

  const barcodeOptions = useMemo(
    () => ({
      barcodeFormats: ["ean-13", "ean-8", "upc-a", "upc-e"] as any,
      onBarcodeScanned: handleBarcodeScanned,
      onError: handleError,
    }),
    [handleBarcodeScanned, handleError],
  );

  const scannerOutput = useBarcodeScannerOutput(barcodeOptions);
  const insets = useSafeAreaInsets();

  // ─── Camera controls ────────────────────────────────────

  const toggleTorch = useCallback(() => {
    setTorch((prev) => (prev === "off" ? "on" : "off"));
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraPosition((prev) => (prev === "back" ? "front" : "back"));
    setTorch("off");
    setZoomLabel("1.0x");
    lastZoomRef.current = "1.0x";
  }, []);

  // ─── Torch sync ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      const ctrl = cameraRef.current?.controller;
      if (ctrl?.isConnected) {
        ctrl.setTorchMode(torch).catch(() => {});
        return true;
      }
      return false;
    };
    if (sync()) return;
    const id = setInterval(() => {
      if (cancelled || sync()) clearInterval(id);
    }, 150);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [torch, cameraPosition]);

  // ─── Zoom ───────────────────────────────────────────────

  const getZoom = useCallback(() => {
    try {
      return cameraRef.current?.controller?.zoom ?? 1;
    } catch {
      return 1;
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    const ctrl = cameraRef.current?.controller;
    if (!ctrl?.isConnected) return;
    const next = Math.min(ctrl.maxZoom, +(getZoom() + 0.5).toFixed(1));
    ctrl.startZoomAnimation(next, 2).catch(() => {});
    const lbl = next.toFixed(1) + "x";
    lastZoomRef.current = lbl;
    setZoomLabel(lbl);
  }, [getZoom]);

  const handleZoomOut = useCallback(() => {
    const ctrl = cameraRef.current?.controller;
    if (!ctrl?.isConnected) return;
    const next = Math.max(ctrl.minZoom, +(getZoom() - 0.5).toFixed(1));
    ctrl.startZoomAnimation(next, 2).catch(() => {});
    const lbl = next.toFixed(1) + "x";
    lastZoomRef.current = lbl;
    setZoomLabel(lbl);
  }, [getZoom]);

  // ─── Poll zoom label ────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      const ctrl = cameraRef.current?.controller;
      if (ctrl?.isConnected) {
        const raw = (ctrl as any).displayableZoomFactor ?? ctrl.zoom;
        const z = Number(raw).toFixed(1) + "x";
        if (z !== lastZoomRef.current) {
          lastZoomRef.current = z;
          setZoomLabel(z);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // ─── Permission denied ──────────────────────────────────

  if (hasPermission === false) {
    return (
      <Animated.View entering={FadeIn} style={styles.center}>
        <Text style={styles.msg}>Permiso de camara requerido</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder permiso</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Volver</Text>
        </Pressable>
      </Animated.View>
    );
  }

  // ─── No camera ─────────────────────────────────────────

  if (!device) {
    return (
      <Animated.View entering={FadeIn} style={styles.center}>
        <Text style={styles.msg}>No hay camara disponible</Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Volver</Text>
        </Pressable>
      </Animated.View>
    );
  }

  // ─── Scanner ────────────────────────────────────────────

  return (
    <CameraSection
      device={device}
      scannerOutput={scannerOutput}
      cameraRef={cameraRef}
      torch={torch}
      zoomLabel={zoomLabel}
      onToggleTorch={toggleTorch}
      onToggleCamera={toggleCamera}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onBack={() => {
        isScanningRef.current = true;
        router.back();
      }}
      insets={insets}
      hasTorch={device.hasTorch ?? false}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  msg: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  btn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    borderCurve: "continuous",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
