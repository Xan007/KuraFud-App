import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from "react-native-reanimated";
import {
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type CameraRef,
} from "react-native-vision-camera";
import { useBarcodeScannerOutput } from "react-native-vision-camera-barcode-scanner";
import { Colors } from "@/constants/theme";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { DateTimePickerSheet } from "@/components/DateTimePickerSheet";
import { lookupProduct } from "services/productService";
import { useAutoDateScanner } from "@/hooks/useAutoDateScanner";
import { computeRoiRect } from "@/services/ocr/roi";
import type { Candidate } from "@/services/ocr/autoScanner";
import { emptyProduct, type ProductInfo } from "types";
import { formatDateString, parseDateString } from "@/helpers/format";
import CameraSection from "@/components/CameraSection";
import type { CameraLayout } from "@/components/CameraSection";
import ProductSheet from "@/components/ProductSheet";
import DateScannerOverlay from "@/components/DateScannerOverlay";
import {
  productRepository,
  inventoryRepository,
  notificationSettingsRepository,
} from "@/db/repositories";
import { rebuildAllReminders } from "@/services/notifications";
import { showToast } from "@/helpers/toast";
import { useAppTranslation } from "@/hooks/useAppTranslation";

type ScanState =
  | { status: "idle" }
  | {
      status: "found";
      product: ProductInfo;
      date?: string;
      datePhotoUri?: string;
    }
  | { status: "scanning-date"; product: ProductInfo };

type GuideRect = { x: number; y: number; width: number; height: number };

export default function BarcodeScannerScreen() {
  const { t } = useAppTranslation();
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
    quality: 0.8,
    qualityPrioritization: "speed",
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

      // Show the bottom sheet immediately with empty product — no loading.
      setScanState({
        status: "found",
        product: { ...emptyProduct, barcode: code },
      });

      // Fetch product info in the background (non-blocking).
      lookupProduct(code)
        .then((p) => {
          if (p) {
            setScanState((prev) =>
              prev.status === "found" && prev.product.barcode === code
                ? { ...prev, product: p }
                : prev,
            );
          } else {
            showToast(t('scanner.productNotFound'));
          }
        })
        .catch(() => {
          showToast(t('scanner.connectionError'));
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
   * Takes an instant snapshot and, when a date-guide box is visible, crops
   * to that region before OCR — keeps ML Kit focused on the date area for
   * better speed and accuracy.
   */
  const captureCandidate = useCallback(async (): Promise<Candidate | null> => {
    try {
      const camera = cameraRef.current;
      if (!camera) return null;
      const snapshot = await camera.takeSnapshot();

      // Save the full frame as evidence photo.
      const photoPath = await snapshot.saveToTemporaryFileAsync("jpg", 80);

      // Lightweight crop to the on-screen date guide (no pixel enhancement).
      const camLayout = cameraLayoutRef.current;
      const guide = guideRectRef.current;
      let ocrPath = photoPath;

      if (camLayout && guide && snapshot.width > 0 && snapshot.height > 0) {
        const roi = computeRoiRect({
          photoW: snapshot.width,
          photoH: snapshot.height,
          camLayout,
          guide,
        });
        if (roi) {
          const sx = Math.max(0, Math.floor(roi.x));
          const sy = Math.max(0, Math.floor(roi.y));
          const ex = Math.min(snapshot.width, Math.ceil(roi.x + roi.width));
          const ey = Math.min(snapshot.height, Math.ceil(roi.y + roi.height));
          if (ex - sx > 8 && ey - sy > 8) {
            const cropped = snapshot.crop(sx, sy, ex, ey);
            ocrPath = await cropped.saveToTemporaryFileAsync("jpg", 80);
          }
        }
      }

      return { ocrPath, photoPath };
    } catch (e) {
      console.warn("captureCandidate error:", e);
      return null;
    }
  }, []);

  const handleDateAccepted = useCallback((date: string, photoUri: string) => {
    const s = scanStateRef.current;
    if (s.status !== "scanning-date") return;

    // Validate expiration year (max 4 years in future)
    const [day, month, year] = date.split("/").map(Number);
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 4;

    if (year > maxYear) {
      showToast(t('scanner.dateFarInFuture', { year }));
    }

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
    showToast(t('scanner.dateNotDetected'));
    setScanState({ status: "found", product: s.product });
  }, [t]);

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

    await productRepository.upsertProduct({
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

    const inserted = await inventoryRepository.addInventoryItem({
      barcode: s.product.barcode,
      expirationDate: s.date,
      datePhotoUri: s.datePhotoUri ?? null,
      createdAt: new Date(),
    });

    try {
      const settings = await notificationSettingsRepository.getNotificationSettings();
      if (settings.enabled) {
        await rebuildAllReminders();
      }
    } catch {
      // Fallar silenciosamente en recordatorios — no debe bloquear el guardado
    }

    showToast(t('scanner.productSaved'));
    goToIdle();
  }, [goToIdle, t]);

  const handleDateCancel = useCallback(() => {
    goToIdle();
  }, [goToIdle]);

  const handleDateEdit = useCallback(() => {
    const s = scanStateRef.current;
    if (s.status === "found" && s.date) {
      const parsed = parseDateString(s.date);
      setPendingDate(parsed);
    } else {
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      setPendingDate(todayUTC);
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
        <AppText variant="body" style={styles.msg}>
          {t('scanner.cameraPermissionRequired')}
        </AppText>
        <Button variant="primary" onPress={requestPermission}>
          {t('settings.grantPermission')}
        </Button>
        <Button variant="secondary" onPress={() => router.back()}>
          {t('scanner.goBack')}
        </Button>
      </Animated.View>
    );
  }

  if (!device) {
    return (
      <Animated.View entering={FadeIn} style={styles.center}>
        <AppText variant="body" style={styles.msg}>
          {t('scanner.noCameraAvailable')}
        </AppText>
        <Button variant="primary" onPress={() => router.back()}>
          {t('scanner.goBack')}
        </Button>
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

      {scanState.status === "found" && (
        <Animated.View
          entering={SlideInUp.duration(300).springify()}
          exiting={SlideOutDown.duration(250)}
        >
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
        </Animated.View>
      )}

      {scanState.status === "scanning-date" && (
        <Animated.View
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(200)}
        >
          <DateScannerOverlay
            onCancel={handleCancelDateScan}
            onLayoutGuide={handleGuideLayout}
            statusText={
              progress && progress.leader
                ? t('scanner.confirmingDate', { date: progress.leader })
                : t('scanner.searchingDate')
            }
          />
        </Animated.View>
      )}

      <DateTimePickerSheet
        visible={showDatePicker}
        mode="date"
        value={pendingDate}
        onChange={setPendingDate}
        onCancel={handleDatePickerCancel}
        onConfirm={handleDatePickerConfirm}
      />
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
  msg: {
    marginBottom: 16,
    textAlign: "center",
  },
});
