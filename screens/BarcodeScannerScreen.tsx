import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View, Vibration } from "react-native";
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
import { lookupProduct } from "services/productService";
import { useAutoDateScanner } from "@/hooks/useAutoDateScanner";
import { useDateCountdown } from "@/hooks/useDateCountdown";
import { useCameraControls } from "@/hooks/useCameraControls";
import { useScanSessionStore } from "@/hooks/useScanSessionStore";
import { computeRoiRect } from "@/services/ocr/roi";
import type { Candidate } from "@/services/ocr/autoScanner";
import { createVoteBox } from "@/services/ocr/voting";
import { emptyProduct } from "types";
import { formatDateString, parseDateString } from "@/helpers/format";
import { isValidBarcode } from "@/helpers/barcode";
import CameraSection from "@/components/CameraSection";
import type { CameraLayout } from "@/components/CameraSection";
import ScanSessionSheet, {
  type SessionItem,
} from "@/components/ScanSessionSheet";
import DateScannerOverlay from "@/components/DateScannerOverlay";
import {
  productRepository,
  inventoryRepository,
  notificationSettingsRepository,
} from "@/db/repositories";
import { rebuildAllReminders } from "@/services/notifications";
import { showToast } from "@/helpers/toast";
import { useAppTranslation } from "@/hooks/useAppTranslation";

type GuideRect = { x: number; y: number; width: number; height: number };

const BARCODE_COOLDOWN_MS = 6000;
const GLOBAL_BARCODE_DEBOUNCE_MS = 1200;
const DATE_DUPLICATE_COOLDOWN_MS = 3000;
const BARCODE_VOTE_REQUIRED = 1.5;
const BARCODE_VOTE_LEAD_MARGIN = 0.5;

const FAR_FUTURE_YEARS = 4;

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

  const {
    items: sessionItems,
    setItems: setSessionItems,
    loadPersisted,
    nextKey,
    persistNewItem,
    persistUpdate,
    persistDelete,
    clearAll: clearPersistedSession,
  } = useScanSessionStore();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(new Date());
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [activeScanTargetKey, setActiveScanTargetKey] = useState<string | null>(
    null,
  );
  const [sessionVersionKey, setSessionVersionKey] = useState(0);
  const [finalizing, setFinalizing] = useState(false);
  const [mode, setMode] = useState<"barcode" | "date">("barcode");
  const [unitCount, setUnitCount] = useState(0);

  const finalizingRef = useRef(false);
  const isScanningRef = useRef(true);
  const lastBarcodeTimeRef = useRef(0);
  const sessionItemsRef = useRef(sessionItems);
  sessionItemsRef.current = sessionItems;
  const guideRectRef = useRef<GuideRect | null>(null);
  const cameraLayoutRef = useRef<CameraLayout | null>(null);
  const lastScanTimestampsRef = useRef<Map<string, number>>(new Map());
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const barcodeVoteBoxRef = useRef(
    createVoteBox({
      requiredVotes: BARCODE_VOTE_REQUIRED,
      leadMargin: BARCODE_VOTE_LEAD_MARGIN,
    }),
  );

  const countdown = useDateCountdown({
    onTimeout: () => {
      setMode("barcode");
      barcodeVoteBoxRef.current.reset();
      setUnitCount(0);
      lastAcceptedDateRef.current = null;
    },
  });

  const lastAcceptedDateRef = useRef<string | null>(null);
  const activeScanTargetKeyRef = useRef<string | null>(null);
  activeScanTargetKeyRef.current = activeScanTargetKey;
  const isUserSelectedRef = useRef(false);
  const lastAcceptedDateTimeRef = useRef(0);

  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();


  useEffect(() => {
    loadPersisted();
  }, [loadPersisted]);

  const scannerTargetKey = useMemo(() => {
    if (activeScanTargetKey) return activeScanTargetKey;
    for (let i = sessionItems.length - 1; i >= 0; i--) {
      if (!sessionItems[i].date) return sessionItems[i].key;
    }
    return null;
  }, [activeScanTargetKey, sessionItems]);

  const shouldRunScanner = sessionItems.length > 0;

  useFocusEffect(
    useCallback(() => {
      isScanningRef.current = true;
      lastBarcodeTimeRef.current = Date.now();
      return () => {
        isScanningRef.current = false;
      };
    }, []),
  );

  const handleBarcodeScanned = useCallback(
    async (barcodes: any[]) => {
      if (!isScanningRef.current || modeRef.current !== "barcode") {
        return;
      }
      if (!barcodes || barcodes.length === 0) return;

      const code = barcodes[0]?.rawValue;
      if (!code || !isValidBarcode(code)) return;

      const now = Date.now();
      if (now - lastBarcodeTimeRef.current < GLOBAL_BARCODE_DEBOUNCE_MS) return;
      lastBarcodeTimeRef.current = now;

      const voteResult = barcodeVoteBoxRef.current.add(code);
      if (!voteResult.accepted) return;

      const acceptedCode = voteResult.accepted;
      const lastTime = lastScanTimestampsRef.current.get(acceptedCode);
      if (lastTime != null && now - lastTime < BARCODE_COOLDOWN_MS) return;
      lastScanTimestampsRef.current.set(acceptedCode, now);

      barcodeVoteBoxRef.current.reset();
      Vibration.vibrate(100);

      const key = nextKey();
      const newItem: SessionItem = {
        key,
        barcode: acceptedCode,
        product: { ...emptyProduct, barcode: acceptedCode },
      };

      setSessionItems((prev) => [...prev, newItem]);
      setActiveScanTargetKey(key);
      isUserSelectedRef.current = false;
      setMode("date");
      setUnitCount(0);
      countdown.bumpActivity();

      try {
        await persistNewItem(newItem);
        const result = await lookupProduct(acceptedCode);
        if (result.kind === "found") {
          const p = result.product;
          setSessionItems((prev) =>
            prev.map((item) =>
              item.key === key ? { ...item, product: p } : item,
            ),
          );
          await persistUpdate(key, { productJson: JSON.stringify(p) });
        } else if (result.kind === "offline") {
          showToast(t("scanner.connectionError"));
        } else {
          showToast(t("scanner.productNotFound"));
        }
      } catch {
        showToast(t("scanner.connectionError"));
      }
    },

    [t, nextKey, persistNewItem, persistUpdate],
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

  const scannerTargetKeyRef = useRef<string | null>(null);
  scannerTargetKeyRef.current = scannerTargetKey;

  const handleDateAccepted = useCallback(
    (date: string, photoUri: string) => {
      const year = Number(date.split("/")[2]);
      const currentYear = new Date().getFullYear();
      if (year > currentYear + FAR_FUTURE_YEARS) {
        showToast(t("scanner.dateFarInFuture", { year }));
      }

      const targetKey = scannerTargetKeyRef.current;
      if (!targetKey) return;

      const targetItem = sessionItemsRef.current.find((i) => i.key === targetKey);
      if (!targetItem) return;

      countdown.bumpActivity();
      lastAcceptedDateRef.current = date;
      const acceptedNow = Date.now();

      const shouldUpdate = isUserSelectedRef.current;

      if (targetItem.date && !shouldUpdate) {
        const timeSinceLastAccepted = acceptedNow - lastAcceptedDateTimeRef.current;
        const isSameDateRecently =
          lastAcceptedDateRef.current === date &&
          timeSinceLastAccepted < DATE_DUPLICATE_COOLDOWN_MS;

        if (isSameDateRecently) return;

        const key = nextKey();
        const clonedItem: SessionItem = {
          key,
          barcode: targetItem.barcode,
          product: targetItem.product,
          date,
          datePhotoUri: photoUri,
        };

        setSessionItems((prev) => [...prev, clonedItem]);
        setUnitCount((prev) => prev + 1);

        persistNewItem(clonedItem).catch(() => {});

        Vibration.vibrate(100);
        showToast(t("scanner.unitAdded", { count: unitCount + 1, date }));
      } else {
        setSessionItems((prev) =>
          prev.map((item) =>
            item.key === targetKey
              ? { ...item, date, datePhotoUri: photoUri }
              : item,
          ),
        );
        setUnitCount(1);

        persistUpdate(targetKey, { date, datePhotoUri: photoUri }).catch(() => {});

        Vibration.vibrate(100);
      }

      lastAcceptedDateTimeRef.current = acceptedNow;
    },
    [t, unitCount, nextKey, persistNewItem, persistUpdate, countdown],
  );

  const handleDateExhausted = useCallback(() => {
    showToast(t("scanner.dateNotDetected"));
  }, [t]);

  const handleNextProduct = useCallback(() => {
    setMode("barcode");
    barcodeVoteBoxRef.current.reset();
    setUnitCount(0);
    lastAcceptedDateRef.current = null;
    countdown.setActive(false);
  }, [countdown]);

  const handleNoDate = useCallback(() => {
    handleNextProduct();
  }, [handleNextProduct]);

  useEffect(() => {
    countdown.setActive(mode === "date");
  }, [mode, countdown]);

  const handleOCRProgress = useCallback(
    (p: any) => {
      if (p?.leader || p?.reads) {
        countdown.bumpActivity();
      }
    },
    [countdown],
  );

  const {
    start: startAutoScan,
    stop: stopAutoScan,
    progress,
  } = useAutoDateScanner({
    captureCandidate,
    onAccepted: handleDateAccepted,
    onExhausted: handleDateExhausted,
    onProgress: handleOCRProgress,
    continuous: true,
  });

  const outputs = useMemo(
    () => (mode === "barcode" && isScanningRef.current ? [scannerOutput] : []),
    [scannerOutput, mode],
  );

  useEffect(() => {
    if (shouldRunScanner && mode === "date") {
      startAutoScan();
      return () => stopAutoScan();
    }
  }, [shouldRunScanner, mode, startAutoScan, stopAutoScan]);

  const prevTargetRef = useRef(scannerTargetKey);
  useEffect(() => {
    if (shouldRunScanner && scannerTargetKey !== prevTargetRef.current) {
      prevTargetRef.current = scannerTargetKey;
      if (scannerTargetKey) {
        stopAutoScan();
        startAutoScan();
      }
    }
  }, [scannerTargetKey, shouldRunScanner, startAutoScan, stopAutoScan]);

  const handleFinalize = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setFinalizing(true);

    try {
      const items = sessionItemsRef.current;

      await Promise.all(
        items.map(async (item) => {
          const p = item.product;
          await productRepository.upsertProduct({
            barcode: p.barcode,
            name: p.name,
            brand: p.brand,
            quantity: p.quantity,
            ingredients: p.ingredients,
            imageFrontUrl: p.imageFrontUrl,
            categories: p.categories,
            nutriscore: p.nutriscore,
            dataJson: JSON.stringify(p),
            createdAt: new Date(),
          });

          if (item.date) {
            await inventoryRepository.addInventoryItem({
              barcode: item.product.barcode,
              expirationDate: item.date,
              datePhotoUri: item.datePhotoUri ?? null,
              createdAt: new Date(),
            });
          }
        }),
      );

      await clearPersistedSession();

      setSessionItems([]);
      setMode("barcode");
      setUnitCount(0);
      barcodeVoteBoxRef.current.reset();
      lastAcceptedDateRef.current = null;
      countdown.setActive(false);
      isScanningRef.current = true;
      showToast(t("scanner.productSaved"));

      try {
        const settings =
          await notificationSettingsRepository.getNotificationSettings();
        if (settings.enabled) {
          await rebuildAllReminders();
        }
      } catch {

      }
    } catch (e) {
      console.warn("handleFinalize error:", e);
      showToast(t("messages.errorSaving"));
    } finally {
      finalizingRef.current = false;
      setFinalizing(false);
    }
  }, [t, clearPersistedSession, countdown]);

  const handleCancelSession = useCallback(() => {
    const count = sessionItemsRef.current.length;
    Alert.alert(
      t("scanner.cancelSessionTitle"),
      t("scanner.cancelSessionBody", { count }),
      [
        {
          text: t("scanner.continueScanning"),
          style: "cancel",
          onPress: () => {
            setSessionVersionKey((k) => k + 1);
          },
        },
        {
          text: t("scanner.cancelAll"),
          style: "destructive",
          onPress: async () => {
            await clearPersistedSession();
            setSessionItems([]);
            setMode("barcode");
            setUnitCount(0);
            barcodeVoteBoxRef.current.reset();
            lastAcceptedDateRef.current = null;
            countdown.setActive(false);
            isScanningRef.current = true;
          },
        },
      ],
    );
  }, [t, clearPersistedSession, countdown]);

  const handleRemoveItem = useCallback((key: string) => {
    persistDelete(key).catch(() => {});
    setActiveScanTargetKey((prev) => (prev === key ? null : prev));
    prevTargetRef.current = null;
    setSessionItems((prev) => prev.filter((item) => item.key !== key));
  }, [persistDelete]);

  const handleScanDate = useCallback((key: string) => {
    setActiveScanTargetKey((prev) => {
      const newKey = prev === key ? null : key;
      isUserSelectedRef.current = newKey !== null;
      return newKey;
    });
  }, []);

  const handleEditDate = useCallback((key: string) => {
    const item = sessionItemsRef.current.find((i) => i.key === key);
    if (item?.date) {
      const parsed = parseDateString(item.date);
      setPendingDate(parsed);
    } else {
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
        ),
      );
      setPendingDate(todayUTC);
    }
    setEditingItemKey(key);
    setShowDatePicker(true);
  }, []);

  const handleDatePickerConfirm = useCallback(() => {
    const formatted = formatDateString(pendingDate);

    if (editingItemKey) {
      setSessionItems((prev) =>
        prev.map((item) =>
          item.key === editingItemKey ? { ...item, date: formatted } : item,
        ),
      );

      persistUpdate(editingItemKey, { date: formatted }).catch(() => {});
      setActiveScanTargetKey((prev) => (prev === editingItemKey ? null : prev));
    }
    setShowDatePicker(false);
    setEditingItemKey(null);
  }, [pendingDate, editingItemKey, persistUpdate]);

  const handleDatePickerCancel = useCallback(() => {
    setShowDatePicker(false);
    setEditingItemKey(null);
  }, []);

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
        onBack={() => {
          isScanningRef.current = true;
          router.back();
        }}
        insets={insets}
        hasTorch={device.hasTorch ?? false}
        onCameraLayout={handleCameraLayout}
      />

      {shouldRunScanner && mode === "date" && (
        <DateScannerOverlay
          onLayoutGuide={handleGuideLayout}
          statusText={
            progress && progress.leader
              ? t("scanner.confirmingDate", { date: progress.leader })
              : t("scanner.searchingDate")
          }
          countdownSeconds={countdown.countdownSeconds}
        />
      )}

      {mode === "date" && shouldRunScanner && (
        <View style={styles.datePhaseControls}>
          <Button
            variant="primary"
            size="sm"
            onPress={handleNextProduct}
            style={styles.controlBtn}
          >
            {t("scanner.nextProduct")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={handleNoDate}
            style={styles.controlBtn}
          >
            {t("scanner.noDate")}
          </Button>
        </View>
      )}

      {sessionItems.length > 0 && (
        <ScanSessionSheet
          key={sessionVersionKey}
          items={sessionItems}
          selectedKey={scannerTargetKey}
          finalizing={finalizing}
          onSelectItem={handleScanDate}
          onRemoveItem={handleRemoveItem}
          onEditDate={handleEditDate}
          onFinalize={handleFinalize}
          onCancel={handleCancelSession}
        />
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
  datePhaseControls: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    gap: 8,
  },
  controlBtn: {
    width: "100%",
  },
});
