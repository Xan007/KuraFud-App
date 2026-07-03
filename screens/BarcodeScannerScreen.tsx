import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, ToastAndroid, Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { ActivityIndicator, Pressable, Text } from "react-native";
import {
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type CameraRef,
} from "react-native-vision-camera";
import { useBarcodeScannerOutput } from "react-native-vision-camera-barcode-scanner";
import { Colors } from "@/constants/theme";
import { lookupProduct } from "services/productService";
import { useAutoDateScanner } from "@/hooks/useAutoDateScanner";
import { enhanceForOcr } from "@/services/ocr/imageEnhance";
import { computeRoiRect } from "@/services/ocr/roi";
import type { Candidate } from "@/services/ocr/autoScanner";
import { emptyProduct, type ProductInfo } from "types";
import { formatDateString } from "@/helpers/format";
import { Host } from "@expo/ui";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import CameraSection from "@/components/CameraSection";
import type { CameraLayout } from "@/components/CameraSection";
import ProductSheet from "@/components/ProductSheet";
import DateScannerOverlay from "@/components/DateScannerOverlay";
import { upsertProduct, addInventoryItem } from "db/repository";

type ScanState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "found";
      product: ProductInfo;
      date?: string;
      datePhotoUri?: string;
    }
  | { status: "not-found" }
  | { status: "scanning-date"; product: ProductInfo };

type GuideRect = { x: number; y: number; width: number; height: number };

function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("", msg);
  }
}

export default function BarcodeScannerScreen() {
  const [cameraPosition, setCameraPosition] = useState<"back" | "front">(
    "back",
  );
  const [torch, setTorch] = useState<"off" | "on">("off");
  const [zoomLabel, setZoomLabel] = useState("1.0x");
  const [scanState, setScanState] = useState<ScanState>({ status: "idle" });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(new Date());

  const cameraRef = useRef<CameraRef>(null);
  const isScanningRef = useRef(true);
  const lastZoomRef = useRef("1.0x");
  const scanStateRef = useRef(scanState);
  scanStateRef.current = scanState;
  const guideRectRef = useRef<GuideRect | null>(null);
  const cameraLayoutRef = useRef<CameraLayout | null>(null);

  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: "quality",
  });

  useFocusEffect(
    useCallback(() => {
      isScanningRef.current = true;
      return () => {
        isScanningRef.current = false;
      };
    }, []),
  );

  const handleBarcodeScanned = useCallback(
    (barcodes: { rawValue?: string }[]) => {
      if (scanStateRef.current.status !== "idle") return;
      if (!isScanningRef.current) return;
      const code = barcodes[0]?.rawValue;
      if (!code) return;

      isScanningRef.current = false;
      setScanState({ status: "loading" });

      lookupProduct(code)
        .then((p) => {
          if (p) {
            setScanState({ status: "found", product: p });
          } else {
            showToast("Producto no encontrado, ingresa el nombre manualmente");
            setScanState({
              status: "found",
              product: { ...emptyProduct, barcode: code },
            });
          }
        })
        .catch(() => {
          showToast("Error de conexion, ingresa el nombre manualmente");
          setScanState({
            status: "found",
            product: { ...emptyProduct, barcode: code },
          });
        });
    },
    [],
  );

  const handleError = useCallback((error: Error) => {
    console.warn("Scanner error:", error);
  }, []);

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

  const toggleTorch = useCallback(() => {
    setTorch((prev) => (prev === "off" ? "on" : "off"));
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraPosition((prev) => (prev === "back" ? "front" : "back"));
    setTorch("off");
    setZoomLabel("1.0x");
    lastZoomRef.current = "1.0x";
  }, []);

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

  const handleCameraLayout = useCallback((layout: CameraLayout) => {
    cameraLayoutRef.current = layout;
  }, []);

  const handleGuideLayout = useCallback((rect: GuideRect) => {
    guideRectRef.current = rect;
  }, []);

  const goToIdle = useCallback(() => {
    isScanningRef.current = true;
    setScanState({ status: "idle" });
  }, []);

  const handleChangeName = useCallback((name: string) => {
    setScanState((prev) => {
      if (prev.status === "found") {
        return { ...prev, product: { ...prev.product, name } };
      }
      return prev;
    });
  }, []);

  const handleCancelDateScan = useCallback(() => {
    const s = scanStateRef.current;
    if (s.status === "scanning-date") {
      setScanState({ status: "found", product: s.product });
    }
  }, []);

  const handleScanDate = useCallback(() => {
    const s = scanStateRef.current;
    if (s.status === "found") {
      guideRectRef.current = null;
      setScanState({ status: "scanning-date", product: s.product });
    }
  }, []);

  /**
   * Captures a full-resolution photo, crops it to the on-screen date guide and
   * enhances it for OCR.  Runs only when the worklet gate reports a good frame.
   */
  const captureCandidate = useCallback(async (): Promise<Candidate | null> => {
    try {
      const { filePath } = await photoOutput.capturePhotoToFile(
        { enableShutterSound: false },
        {},
      );
      const fileUri = filePath.startsWith("file://")
        ? filePath
        : "file://" + filePath;

      const camLayout = cameraLayoutRef.current;
      const guide = guideRectRef.current;
      const roiFor = (w: number, h: number) =>
        camLayout && guide
          ? computeRoiRect({ photoW: w, photoH: h, camLayout, guide })
          : undefined;

      const ocrPath = await enhanceForOcr(fileUri, { roi: roiFor });
      return { ocrPath, photoPath: fileUri };
    } catch (e) {
      console.warn("captureCandidate error:", e);
      return null;
    }
  }, [photoOutput]);

  const handleDateAccepted = useCallback((date: string, photoUri: string) => {
    const s = scanStateRef.current;
    if (s.status !== "scanning-date") return;
    setScanState({
      status: "found",
      product: s.product,
      date,
      datePhotoUri: photoUri,
    });
  }, []);

  const handleDateExhausted = useCallback(() => {
    const s = scanStateRef.current;
    if (s.status !== "scanning-date") return;
    showToast("No se detectó la fecha, ingrésala manualmente");
    setScanState({ status: "found", product: s.product });
  }, []);

  const {
    frameOutput,
    start: startAutoScan,
    stop: stopAutoScan,
    progress,
  } = useAutoDateScanner({
    captureCandidate,
    onAccepted: handleDateAccepted,
    onExhausted: handleDateExhausted,
  });

  // While scanning a date we swap the barcode scanner for the frame gate:
  // the barcode reader isn't needed here, and this keeps the simultaneous
  // output count low.
  const outputs = useMemo(
    () =>
      scanState.status === "scanning-date"
        ? [photoOutput, frameOutput]
        : [scannerOutput, photoOutput],
    [scannerOutput, photoOutput, frameOutput, scanState.status],
  );

  useEffect(() => {
    if (scanState.status === "scanning-date") {
      startAutoScan();
      return () => stopAutoScan();
    }
  }, [scanState.status, startAutoScan, stopAutoScan]);

  const handleDateConfirm = useCallback(async () => {
    const s = scanStateRef.current;
    if (s.status !== "found" || !s.date) return;

    await upsertProduct({
      barcode: s.product.barcode,
      name: s.product.name,
      brand: s.product.brand,
      quantity: s.product.quantity,
      ingredients: s.product.ingredients,
      imageFrontUrl: s.product.imageFrontUrl,
      categories: s.product.categories,
      nutriscore: s.product.nutriscore,
      createdAt: new Date(),
    });

    await addInventoryItem({
      barcode: s.product.barcode,
      expirationDate: s.date,
      datePhotoUri: s.datePhotoUri ?? null,
      createdAt: new Date(),
    });

    showToast("Producto guardado");
    goToIdle();
  }, [goToIdle]);

  const handleDateCancel = useCallback(() => {
    goToIdle();
  }, [goToIdle]);

  const handleDateEdit = useCallback(() => {
    const s = scanStateRef.current;
    if (s.status === "found" && s.date) {
      const parts = s.date.split("/");
      setPendingDate(new Date(+parts[2], +parts[1] - 1, +parts[0]));
    } else {
      setPendingDate(new Date());
    }
    setShowDatePicker(true);
  }, []);

  const handleDatePickerConfirm = useCallback(() => {
    const formatted = formatDateString(pendingDate);
    const s = scanStateRef.current;
    if (s.status === "found") {
      setScanState({ ...s, date: formatted });
    }
    setShowDatePicker(false);
  }, [pendingDate]);

  const handleDatePickerCancel = useCallback(() => {
    setShowDatePicker(false);
  }, []);

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

  return (
    <View style={StyleSheet.absoluteFill}>
      <CameraSection
        device={device}
        outputs={outputs}
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
        onCameraLayout={handleCameraLayout}
      />

      {scanState.status === "loading" && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <View style={styles.spinnerWrap}>
            <View style={styles.spinnerBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.spinnerText}>Buscando producto...</Text>
            </View>
            <Pressable style={styles.cancelBtn} onPress={goToIdle}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {scanState.status === "found" && (
        <ProductSheet
          product={scanState.product}
          date={scanState.date}
          onDismiss={goToIdle}
          onScanDate={handleScanDate}
          onDateConfirm={handleDateConfirm}
          onDateCancel={handleDateCancel}
          onEditDate={handleDateEdit}
          onChangeName={handleChangeName}
        />
      )}

      {scanState.status === "scanning-date" && (
        <DateScannerOverlay
          onCancel={handleCancelDateScan}
          onLayoutGuide={handleGuideLayout}
          statusText={
            progress && progress.leader
              ? `Confirmando ${progress.leader}…`
              : "Buscando la fecha automáticamente…"
          }
        />
      )}

      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              const formatted = formatDateString(selectedDate);
              const s = scanStateRef.current;
              if (s.status === "found") {
                setScanState({ ...s, date: formatted });
              }
            }
            setShowDatePicker(false);
          }}
        />
      )}

      {showDatePicker && Platform.OS === "ios" && (
        <View style={[StyleSheet.absoluteFill, styles.datePickerBackdrop]}>
          <Host style={styles.datePickerHost}>
            <View style={styles.datePickerContent}>
              <DateTimePicker
                value={pendingDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setPendingDate(date);
                }}
              />
            </View>
            <View style={styles.datePickerActions}>
              <Pressable
                style={styles.datePickerBtn}
                onPress={handleDatePickerCancel}
              >
                <Text style={styles.datePickerBtnTextCancel}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.datePickerBtn, styles.datePickerBtnPrimary]}
                onPress={handleDatePickerConfirm}
              >
                <Text style={styles.datePickerBtnTextPrimary}>Confirmar</Text>
              </Pressable>
            </View>
          </Host>
        </View>
      )}
    </View>
  );
}

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
    borderCurve: "continuous",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  spinnerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  spinnerBox: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 32,
    paddingVertical: 28,
    borderRadius: 20,
    borderCurve: "continuous",
  },
  spinnerText: {
    fontSize: 15,
    color: "#fff",
    marginTop: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  cancelBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  cancelBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  loadingOverlay: {
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 100,
    elevation: 10,
  },
  processingOverlay: {
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 100,
    elevation: 10,
  },

  datePickerBackdrop: {
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
    elevation: 20,
  },
  datePickerHost: {
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 32,
    width: "85%",
    maxWidth: 360,
  },
  datePickerContent: {
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  datePickerActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  datePickerBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  datePickerBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  datePickerBtnTextCancel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  datePickerBtnTextPrimary: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  processingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  previewImage: {
    width: 220,
    height: 140,
    borderRadius: 12,
    borderCurve: "continuous",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: "#000",
  },
});
