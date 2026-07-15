import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  useCameraDevice,
  useCameraPermission,
  type CameraRef,
} from "react-native-vision-camera";
import { useBarcodeScannerOutput } from "react-native-vision-camera-barcode-scanner";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { DateTimePickerSheet } from "@/components/DateTimePickerSheet";
import { NameProductSheet } from "@/components/NameProductSheet";
import CameraSection from "@/components/CameraSection";
import type { CameraLayout } from "@/components/CameraSection";
import ScannerHUD, { type GuideRect } from "@/components/scanner/ScannerHUD";
import SessionTray from "@/components/scanner/SessionTray";
import { useCameraControls } from "@/hooks/useCameraControls";
import { useScannerFlow } from "@/hooks/useScannerFlow";
import { useAutoDateScanner } from "@/hooks/useAutoDateScanner";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { computeRoiRect } from "@/services/ocr/roi";
import type { Candidate } from "@/services/ocr/autoScanner";
import { formatDateString, parseDateString } from "@/helpers/format";

export default function BarcodeScannerScreen() {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraRef>(null);
  const {
    cameraPosition,
    torch,
    zoomLabel,
    toggleTorch,
    toggleCamera,
    handleZoomIn,
    handleZoomOut,
  } = useCameraControls({ cameraRef });

  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();

  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const flow = useScannerFlow({ onFinalized: () => router.back() });
  const { loadPersisted } = flow;
  useEffect(() => {
    loadPersisted();
  }, [loadPersisted]);

  // ── Código de barras ────────────────────────────────────────────────
  const handleScannerError = useCallback((error: Error) => {
    console.warn("Scanner error:", error);
  }, []);

  const barcodeOptions = useMemo(
    () => ({
      barcodeFormats: ["ean-13", "ean-8", "upc-a", "upc-e"] as any,
      onBarcodeScanned: flow.onBarcodesDetected,
      onError: handleScannerError,
    }),
    [flow.onBarcodesDetected, handleScannerError],
  );

  const scannerOutput = useBarcodeScannerOutput(barcodeOptions);

  const outputs = useMemo(
    () => (focused && flow.phase === "barcode" ? [scannerOutput] : []),
    [focused, flow.phase, scannerOutput],
  );

  // ── OCR de fecha ────────────────────────────────────────────────────
  const cameraLayoutRef = useRef<CameraLayout | null>(null);
  const guideRectRef = useRef<GuideRect | null>(null);

  const handleCameraLayout = useCallback((layout: CameraLayout) => {
    cameraLayoutRef.current = layout;
  }, []);

  const handleGuideLayout = useCallback((rect: GuideRect) => {
    guideRectRef.current = rect;
  }, []);

  const captureCandidate = useCallback(async (): Promise<Candidate | null> => {
    try {
      const camera = cameraRef.current;
      if (!camera) return null;
      const snapshot = await camera.takeSnapshot();

      const camLayout = cameraLayoutRef.current;
      const guide = guideRectRef.current;

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
            const ocrPath = await cropped.saveToTemporaryFileAsync("jpg", 60);
            return { ocrPath, photoPath: ocrPath };
          }
        }
      }

      const ocrPath = await snapshot.saveToTemporaryFileAsync("jpg", 60);
      return { ocrPath, photoPath: ocrPath };
    } catch (e) {
      console.warn("captureCandidate error:", e);
      return null;
    }
  }, []);

  const handleOcrProgress = useCallback(
    (p: { leader: string | null }) => {
      flow.onDateActivity(p?.leader ?? null);
    },
    [flow.onDateActivity],
  );

  const {
    start: startDateScan,
    stop: stopDateScan,
    progress,
  } = useAutoDateScanner({
    captureCandidate,
    onAccepted: flow.onDateCandidate,
    onProgress: handleOcrProgress,
    continuous: true,
  });

  useEffect(() => {
    if (focused && flow.phase === "date") {
      startDateScan();
      return stopDateScan;
    }
  }, [focused, flow.phase, startDateScan, stopDateScan]);

  // ── Edición manual de fecha ─────────────────────────────────────────
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(new Date());
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const handleSelectItem = useCallback(
    (key: string) => {
      flow.selectItem(key);
    },
    [flow.selectItem],
  );

  const handleEditDate = useCallback(
    (key: string) => {
      const item = flow.items.find((i) => i.key === key);
      if (item?.date) {
        setPendingDate(parseDateString(item.date));
      } else {
        const today = new Date();
        setPendingDate(
          new Date(
            Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth(),
              today.getUTCDate(),
            ),
          ),
        );
      }
      setEditingKey(key);
      setShowDatePicker(true);
    },
    [flow.items],
  );

  const handleDatePickerConfirm = useCallback(() => {
    if (editingKey) {
      flow.setItemDate(editingKey, formatDateString(pendingDate));
    }
    setShowDatePicker(false);
    setEditingKey(null);
  }, [editingKey, pendingDate, flow.setItemDate]);

  const handleDatePickerCancel = useCallback(() => {
    setShowDatePicker(false);
    setEditingKey(null);
  }, []);

  // ── Cancelar sesión ─────────────────────────────────────────────────
  const handleClearSession = useCallback(() => {
    Alert.alert(
      t("scanner.cancelSessionTitle"),
      t("scanner.cancelSessionBody", { count: flow.items.length }),
      [
        { text: t("scanner.continueScanning"), style: "cancel" },
        {
          text: t("scanner.cancelAll"),
          style: "destructive",
          onPress: () => {
            flow.clearSession().catch(() => {});
          },
        },
      ],
    );
  }, [t, flow.items.length, flow.clearSession]);

  // ── Guardar con verificación de nombres ─────────────────────────────
  const handleSave = useCallback(() => {
    const nameless = flow.items.filter((i) => !i.product.name);
    if (nameless.length > 0) {
      savingRef.current = true;
      setNameSheetQueue(nameless.map((i) => i.key));
      setNameSheetIndex(0);
    } else {
      flow.finalize();
    }
  }, [flow.items, flow.finalize]);

  // ── Texto de estado ─────────────────────────────────────────────────
  const statusText =
    flow.phase === "barcode"
      ? t("scanner.pointBarcode")
      : progress?.leader
        ? t("scanner.confirmingDate", { date: progress.leader })
        : t("scanner.searchingDate");

  // ── Nombrar productos ──────────────────────────────────────────────
  const [nameSheetQueue, setNameSheetQueue] = useState<string[]>([]);
  const [nameSheetIndex, setNameSheetIndex] = useState(0);
  const savingRef = useRef(false);

  const currentNameKey = nameSheetQueue[nameSheetIndex] ?? null;
  const currentNameItem = useMemo(
    () => (currentNameKey ? flow.items.find((i) => i.key === currentNameKey) ?? null : null),
    [currentNameKey, flow.items],
  );

  const handleRequestName = useCallback(
    (key: string) => {
      savingRef.current = false;
      setNameSheetQueue([key]);
      setNameSheetIndex(0);
    },
    [],
  );

  const handleNameConfirm = useCallback(
    (name: string, photoUri?: string) => {
      const key = nameSheetQueue[nameSheetIndex];
      if (key) flow.setItemProductName(key, name, photoUri);
      const next = nameSheetIndex + 1;
      if (next < nameSheetQueue.length) {
        setNameSheetIndex(next);
      } else {
        const wasSaving = savingRef.current;
        savingRef.current = false;
        setNameSheetQueue([]);
        setNameSheetIndex(0);
        if (wasSaving) flow.finalize();
      }
    },
    [nameSheetQueue, nameSheetIndex, flow.setItemProductName, flow.finalize],
  );

  const handleNameSkip = useCallback(() => {
    savingRef.current = false;
    setNameSheetQueue([]);
    setNameSheetIndex(0);
  }, []);

  // ── Cuenta regresiva de idle en fase date ──────────────────────────
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleDeadlineRef = useRef<number | null>(null);
  const hasLeaderRef = useRef(false);

  idleDeadlineRef.current = flow.idleDeadline;
  hasLeaderRef.current = !!progress?.leader;

  useEffect(() => {
    if (flow.phase !== "date") {
      setCountdownSeconds(null);
      return;
    }
    const tick = () => {
      const deadline = idleDeadlineRef.current;
      if (deadline == null || hasLeaderRef.current) {
        setCountdownSeconds(null);
        return;
      }
      const remaining = Math.ceil(Math.max(0, (deadline - Date.now()) / 1000));
      setCountdownSeconds(remaining > 0 ? remaining : null);
    };
    tick();
    countdownRef.current = setInterval(tick, 250);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [flow.phase]);

  if (hasPermission === false) {
    return (
      <Animated.View entering={FadeIn} style={styles.center}>
        <AppText variant="body" style={styles.msg}>
          {t("scanner.cameraPermissionRequired")}
        </AppText>
        <Button variant="primary" onPress={requestPermission}>
          {t("settings.grantPermission")}
        </Button>
        <Button variant="secondary" onPress={() => router.back()}>
          {t("scanner.goBack")}
        </Button>
      </Animated.View>
    );
  }

  if (!device) {
    return (
      <Animated.View entering={FadeIn} style={styles.center}>
        <AppText variant="body" style={styles.msg}>
          {t("scanner.noCameraAvailable")}
        </AppText>
        <Button variant="primary" onPress={() => router.back()}>
          {t("scanner.goBack")}
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
        onBack={() => router.back()}
        insets={insets}
        hasTorch={device.hasTorch ?? false}
        onCameraLayout={handleCameraLayout}
        hideZoom
        hideFlip
      />

      <ScannerHUD
        phase={flow.phase}
        statusText={statusText}
        feedback={flow.feedback}
        countdownSeconds={countdownSeconds}
        onSkipDate={flow.skipDate}
        onGuideLayout={handleGuideLayout}
      />

      {flow.items.length > 0 && (
        <SessionTray
          items={flow.items}
          activeKey={flow.targetKey}
          finalizing={flow.finalizing}
          onSelectItem={handleSelectItem}
          onRequestName={handleRequestName}
          onEditDate={handleEditDate}
          onRemove={flow.removeItem}
          onSave={handleSave}
          onClear={handleClearSession}
        />
      )}

      <NameProductSheet
        visible={nameSheetQueue.length > 0}
        barcode={currentNameItem?.barcode ?? ""}
        currentName={currentNameItem?.product.name ?? ""}
        currentPhotoUri={currentNameItem?.product.imageFrontUrl ?? ""}
        index={nameSheetIndex}
        total={nameSheetQueue.length}
        hideSkip={savingRef.current || nameSheetQueue.length > 1}
        onConfirm={handleNameConfirm}
        onSkip={handleNameSkip}
      />

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
    gap: 12,
  },
  msg: {
    marginBottom: 16,
    textAlign: "center",
  },
});
