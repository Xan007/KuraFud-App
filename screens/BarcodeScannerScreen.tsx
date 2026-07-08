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
import { Colors } from "@/constants/theme";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { DateTimePickerSheet } from "@/components/DateTimePickerSheet";
import { lookupProduct } from "services/productService";
import { useAutoDateScanner } from "@/hooks/useAutoDateScanner";
import { computeRoiRect } from "@/services/ocr/roi";
import type { Candidate } from "@/services/ocr/autoScanner";
import { emptyProduct } from "types";
import { formatDateString, parseDateString } from "@/helpers/format";
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
  scanSessionRepository,
} from "@/db/repositories";
import { rebuildAllReminders } from "@/services/notifications";
import { showToast } from "@/helpers/toast";
import { useAppTranslation } from "@/hooks/useAppTranslation";

type GuideRect = { x: number; y: number; width: number; height: number };

const BARCODE_COOLDOWN_MS = 6000;
const GLOBAL_BARCODE_DEBOUNCE_MS = 1200;

export default function BarcodeScannerScreen() {
  const { t } = useAppTranslation();
  const [cameraPosition, setCameraPosition] = useState<"back" | "front">(
    "back",
  );
  const [torch, setTorch] = useState<"off" | "on">("off");
  const [zoomLabel, setZoomLabel] = useState("1.0x");
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(new Date());
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [activeScanTargetKey, setActiveScanTargetKey] = useState<string | null>(
    null,
  );
  const [sessionVersionKey, setSessionVersionKey] = useState(0);

  const cameraRef = useRef<CameraRef>(null);
  const isScanningRef = useRef(true);
  const lastBarcodeTimeRef = useRef(0);
  const lastZoomRef = useRef("1.0x");
  const sessionItemsRef = useRef(sessionItems);
  sessionItemsRef.current = sessionItems;
  const guideRectRef = useRef<GuideRect | null>(null);
  const cameraLayoutRef = useRef<CameraLayout | null>(null);
  const lastScanTimestampsRef = useRef<Map<string, number>>(new Map());
  const keyCounterRef = useRef(0);
  const keyToDbIdRef = useRef<Map<string, number>>(new Map());

  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();

  // Load persisted session on mount
  useEffect(() => {
    scanSessionRepository.loadSession().then((rows) => {
      if (rows.length === 0) return;
      const map = new Map<string, number>();
      const items: SessionItem[] = rows.map((row) => {
        const key = String(row.id);
        map.set(key, row.id);
        return {
          key,
          barcode: row.barcode,
          product: row.productJson
            ? JSON.parse(row.productJson)
            : { ...emptyProduct, barcode: row.barcode },
          date: row.date ?? undefined,
          datePhotoUri: row.datePhotoUri ?? undefined,
        };
      });
      keyToDbIdRef.current = map;
      setSessionItems(items);
      const maxKey = Math.max(...items.map((i) => parseInt(i.key, 10)), 0);
      keyCounterRef.current = maxKey + 1;
    });
  }, []);

  const scannerTargetKey = useMemo(
    () =>
      activeScanTargetKey ??
      (sessionItems.length > 0
        ? sessionItems[sessionItems.length - 1].key
        : null),
    [activeScanTargetKey, sessionItems],
  );

  const shouldRunScanner = sessionItems.length > 0;

  useFocusEffect(
    useCallback(() => {
      isScanningRef.current = true;
      return () => {
        isScanningRef.current = false;
      };
    }, []),
  );

  function isValidBarcode(code: string): boolean {
    if (!/^\d+$/.test(code)) return false;
    return [6, 8, 12, 13].includes(code.length);
  }

  const handleBarcodeScanned = useCallback(
    (barcodes: { rawValue?: string }[]) => {
      if (!isScanningRef.current) return;
      const code = barcodes[0]?.rawValue;
      if (!code || !isValidBarcode(code)) return;

      const now = Date.now();
      if (now - lastBarcodeTimeRef.current < GLOBAL_BARCODE_DEBOUNCE_MS) return;
      lastBarcodeTimeRef.current = now;
      const lastTime = lastScanTimestampsRef.current.get(code);
      if (lastTime != null && now - lastTime < BARCODE_COOLDOWN_MS) return;
      lastScanTimestampsRef.current.set(code, now);

      const key = String(keyCounterRef.current++);
      const newItem: SessionItem = {
        key,
        barcode: code,
        product: { ...emptyProduct, barcode: code },
      };

      setSessionItems((prev) => [...prev, newItem]);
      setActiveScanTargetKey(key);

      // Persist to scan_session — key is stable, DB id stored in map
      scanSessionRepository
        .insertItem({
          barcode: code,
          productJson: JSON.stringify(newItem.product),
          createdAt: new Date(),
        })
        .then((dbId) => {
          keyToDbIdRef.current.set(key, dbId);
          return lookupProduct(code);
        })
        .then((p) => {
          if (p) {
            setSessionItems((prev) =>
              prev.map((item) =>
                item.key === key ? { ...item, product: p } : item,
              ),
            );
            const dbId = keyToDbIdRef.current.get(key);
            if (dbId != null) {
              scanSessionRepository.updateItem(dbId, {
                productJson: JSON.stringify(p),
              });
            }
          } else {
            showToast(t("scanner.productNotFound"));
          }
        })
        .catch(() => {
          showToast(t("scanner.connectionError"));
        });
    },
    [t],
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

  const captureCandidate = useCallback(async (): Promise<Candidate | null> => {
    try {
      const camera = cameraRef.current;
      if (!camera) return null;
      const snapshot = await camera.takeSnapshot();

      const camLayout = cameraLayoutRef.current;
      const guide = guideRectRef.current;
      let ocrPath = "";

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
            ocrPath = await cropped.saveToTemporaryFileAsync("jpg", 60);
            return { ocrPath, photoPath: ocrPath };
          }
        }
      }

      ocrPath = await snapshot.saveToTemporaryFileAsync("jpg", 60);
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
      const [day, month, year] = date.split("/").map(Number);
      const currentYear = new Date().getFullYear();
      const maxYear = currentYear + 4;

      if (year > maxYear) {
        showToast(t("scanner.dateFarInFuture", { year }));
      }

      const targetKey = scannerTargetKeyRef.current;
      if (!targetKey) return;

      setSessionItems((prev) =>
        prev.map((item) =>
          item.key === targetKey
            ? { ...item, date, datePhotoUri: photoUri }
            : item,
        ),
      );

      const dbId = keyToDbIdRef.current.get(targetKey);
      if (dbId != null) {
        scanSessionRepository.updateItem(dbId, {
          date,
          datePhotoUri: photoUri,
        });
      }
    },
    [t],
  );

  const handleDateExhausted = useCallback(() => {
    showToast(t("scanner.dateNotDetected"));
  }, [t]);

  const {
    start: startAutoScan,
    stop: stopAutoScan,
    progress,
  } = useAutoDateScanner({
    captureCandidate,
    onAccepted: handleDateAccepted,
    onExhausted: handleDateExhausted,
    continuous: true,
  });

  const outputs = useMemo(() => [scannerOutput], [scannerOutput]);

  useEffect(() => {
    if (shouldRunScanner) {
      startAutoScan();
      return () => stopAutoScan();
    }
  }, [shouldRunScanner, startAutoScan, stopAutoScan]);

  const prevTargetRef = useRef(scannerTargetKey);
  useEffect(() => {
    if (shouldRunScanner && scannerTargetKey !== prevTargetRef.current) {
      prevTargetRef.current = scannerTargetKey;
      stopAutoScan();
      startAutoScan();
    }
  }, [scannerTargetKey, shouldRunScanner, startAutoScan, stopAutoScan]);

  const handleFinalize = useCallback(async () => {
    try {
      const items = sessionItemsRef.current;

      for (const item of items) {
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
      }

      try {
        const settings =
          await notificationSettingsRepository.getNotificationSettings();
        if (settings.enabled) {
          await rebuildAllReminders();
        }
      } catch {
        // Non-critical — don't block saving
      }

      await scanSessionRepository.clearSession();
      keyToDbIdRef.current.clear();

      showToast(t("scanner.productSaved"));
      setSessionItems([]);
      isScanningRef.current = true;
    } catch (e) {
      console.warn("handleFinalize error:", e);
      showToast(t("messages.errorSaving"));
    }
  }, [t]);

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
            await scanSessionRepository.clearSession();
            keyToDbIdRef.current.clear();
            setSessionItems([]);
            isScanningRef.current = true;
          },
        },
      ],
    );
  }, [t]);

  const handleRemoveItem = useCallback((key: string) => {
    const dbId = keyToDbIdRef.current.get(key);
    if (dbId != null) {
      scanSessionRepository.deleteItem(dbId);
      keyToDbIdRef.current.delete(key);
    }
    setActiveScanTargetKey((prev) => (prev === key ? null : prev));
    setSessionItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const handleScanDate = useCallback((key: string) => {
    setActiveScanTargetKey((prev) => (prev === key ? null : key));
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
      const dbId = keyToDbIdRef.current.get(editingItemKey);
      if (dbId != null) {
        scanSessionRepository.updateItem(dbId, {
          date: formatted,
        });
      }
      setActiveScanTargetKey((prev) => (prev === editingItemKey ? null : prev));
    }
    setShowDatePicker(false);
    setEditingItemKey(null);
  }, [pendingDate, editingItemKey]);

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

      {shouldRunScanner && (
        <DateScannerOverlay
          onLayoutGuide={handleGuideLayout}
          statusText={
            progress && progress.leader
              ? t("scanner.confirmingDate", { date: progress.leader })
              : t("scanner.searchingDate")
          }
        />
      )}

      {sessionItems.length > 0 && (
        <ScanSessionSheet
          key={sessionVersionKey}
          items={sessionItems}
          onRemoveItem={handleRemoveItem}
          onEditDate={handleEditDate}
          onScanDate={handleScanDate}
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
});
