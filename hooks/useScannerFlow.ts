import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { createVoteBox } from "@/services/ocr/voting";
import { lookupProduct } from "services/productService";
import { emptyProduct } from "types";
import { validateExpiryDate, type DateValidationError } from "@/helpers/format";
import { isValidBarcode } from "@/helpers/barcode";
import {
  useScanSessionStore,
  type SessionItem,
} from "@/hooks/useScanSessionStore";
import {
  productRepository,
  inventoryRepository,
  notificationSettingsRepository,
} from "@/db/repositories";
import { rebuildAllReminders } from "@/services/notifications";
import { useAppTranslation } from "@/hooks/useAppTranslation";

export type ScanPhase = "barcode" | "date";

export type ScanFeedback = {
  id: number;
  kind: "success" | "warning" | "info";
  text: string;
};

const BARCODE_FRAME_THROTTLE_MS = 150;
const BARCODE_VOTING = { requiredVotes: 1.5, leadMargin: 0.5 };
const BARCODE_VOTE_STALE_MS = 1600;
const SAME_CODE_COOLDOWN_MS = 2000;
const DATE_PHASE_TIMEOUT_MS = 8000;
const FEEDBACK_DURATION_MS = 2400;
const WARNING_THROTTLE_MS = 3000;
// Pausa tras aceptar una fecha antes de leer la siguiente unidad: evita que
// la misma etiqueta genere unidades repetidas sin que el usuario se mueva.
const NEXT_UNIT_PAUSE_MS = 2800;

/**
 * Máquina de estados del ciclo de escaneo:
 *
 *   barcode ──código aceptado──▶ date ──siguiente producto / timeout──▶ barcode
 *
 * En fase "date" cada fecha aceptada agrega una unidad del mismo producto
 * (un SessionItem por unidad), así varias unidades solo requieren escanear
 * el código una vez y luego sus fechas. Todo el estado del flujo vive aquí;
 * la pantalla solo conecta cámara/OCR y renderiza.
 */
export function useScannerFlow({
  onFinalized,
}: { onFinalized?: (savedCount: number) => void } = {}) {
  const { t } = useAppTranslation();
  const {
    items,
    setItems,
    loadPersisted,
    nextKey,
    persistNewItem,
    persistUpdate,
    persistDelete,
    clearAll,
  } = useScanSessionStore();

  const [phase, setPhase] = useState<ScanPhase>("barcode");
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [unitCount, setUnitCount] = useState(0);
  // Timestamp (ms) en el que expirara el timer de idle en fase date.
  // El HUD lo lee para pintar la cuenta regresiva; se vuelve null cuando
  // hay actividad OCR o cuando salimos de fase date.
  const [idleDeadline, setIdleDeadline] = useState<number | null>(null);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const targetKeyRef = useRef(targetKey);
  targetKeyRef.current = targetKey;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const votesRef = useRef(createVoteBox(BARCODE_VOTING));
  const lastVoteAtRef = useRef(0);
  const recentCodesRef = useRef(new Map<string, number>());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackIdRef = useRef(0);
  const lastWarningAtRef = useRef(0);
  const finalizingRef = useRef(false);
  const unitCountRef = useRef(0);
  const lastAcceptAtRef = useRef(0);
  const manualSelectRef = useRef(false);

  const showFeedback = useCallback(
    (kind: ScanFeedback["kind"], text: string) => {
      const id = ++feedbackIdRef.current;
      setFeedback({ id, kind, text });
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback((current) => (current?.id === id ? null : current));
      }, FEEDBACK_DURATION_MS);
    },
    [],
  );

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setIdleDeadline(null);
  }, []);

  const goToBarcode = useCallback(() => {
    clearIdleTimer();
    votesRef.current.reset();
    unitCountRef.current = 0;
    lastAcceptAtRef.current = 0;
    setUnitCount(0);
    setTargetKey(null);
    setPhase("barcode");
  }, [clearIdleTimer]);

  const armIdleTimer = useCallback(() => {
    clearIdleTimer();
    const deadline = Date.now() + DATE_PHASE_TIMEOUT_MS;
    setIdleDeadline(deadline);
    idleTimerRef.current = setTimeout(() => {
      if (unitCountRef.current === 0) {
        showFeedback("warning", t("scanner.noDateDetected"));
      }
      goToBarcode();
    }, DATE_PHASE_TIMEOUT_MS);
  }, [clearIdleTimer, showFeedback, goToBarcode, t]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const acceptBarcode = useCallback(
    async (code: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const sameCode = itemsRef.current.filter((i) => i.barcode === code);
      const knownProduct = sameCode.find((i) => i.product.name)?.product;
      const key = nextKey();
      const item: SessionItem = {
        key,
        barcode: code,
        product: knownProduct ?? { ...emptyProduct, barcode: code },
      };

      setItems((prev) => [...prev, item]);
      setTargetKey(key);
      setPhase("date");
      unitCountRef.current = 0;
      lastAcceptAtRef.current = 0;
      setUnitCount(0);
      armIdleTimer();
      showFeedback(
        "success",
        sameCode.length > 0
          ? t("scanner.unitDetected", { count: sameCode.length + 1 })
          : t("scanner.productDetected"),
      );

      try {
        await persistNewItem(item);
        if (!knownProduct) {
          const result = await lookupProduct(code);
          if (result.kind === "found") {
            const p = result.product;
            setItems((prev) =>
              prev.map((i) => (i.key === key ? { ...i, product: p } : i)),
            );
            await persistUpdate(key, { productJson: JSON.stringify(p) });
          }
        }
      } catch {
      }
    },
    [nextKey, setItems, armIdleTimer, showFeedback, persistNewItem, persistUpdate, t],
  );

  const onBarcodesDetected = useCallback(
    (barcodes: { rawValue?: string }[]) => {
      if (phaseRef.current !== "barcode" || finalizingRef.current) return;
      const code = barcodes?.[0]?.rawValue;
      if (!code || !isValidBarcode(code)) return;

      const now = Date.now();
      if (now - lastVoteAtRef.current > BARCODE_VOTE_STALE_MS) {
        votesRef.current.reset();
      }
      if (now - lastVoteAtRef.current < BARCODE_FRAME_THROTTLE_MS) return;
      lastVoteAtRef.current = now;

      const state = votesRef.current.add(code);
      if (!state.accepted) return;
      votesRef.current.reset();

      const lastSeen = recentCodesRef.current.get(state.accepted) ?? 0;
      if (now - lastSeen < SAME_CODE_COOLDOWN_MS) return;
      recentCodesRef.current.set(state.accepted, now);

      acceptBarcode(state.accepted);
    },
    [acceptBarcode],
  );

  const invalidDateText = useCallback(
    (reason: DateValidationError | undefined, date: string) => {
      switch (reason) {
        case "yearTooFarFuture":
          return t("scanner.invalidDateYearTooFar", {
            year: Number(date.split("/")[2]),
          });
        case "monthOutOfRange":
          return t("scanner.invalidDateMonthOutOfRange");
        case "dayOutOfRange":
          return t("scanner.invalidDateDayOutOfRange");
        default:
          return t("scanner.invalidDateBody");
      }
    },
    [t],
  );

  const onDateCandidate = useCallback(
    (date: string, photoUri: string) => {
      if (phaseRef.current !== "date") return;
      const key = targetKeyRef.current;
      if (!key) return;

      const now = Date.now();

      const validation = validateExpiryDate(date);
      if (!validation.ok) {
        if (now - lastWarningAtRef.current > WARNING_THROTTLE_MS) {
          lastWarningAtRef.current = now;
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          ).catch(() => {});
          showFeedback("warning", invalidDateText(validation.reason, date));
        }
        armIdleTimer();
        return;
      }

      const target = itemsRef.current.find((i) => i.key === key);
      if (!target) return;

      if (manualSelectRef.current) {
        // Selección manual: sobreescribir la fecha del item seleccionado.
        manualSelectRef.current = false;
        setItems((prev) =>
          prev.map((i) =>
            i.key === key ? { ...i, date, datePhotoUri: photoUri } : i,
          ),
        );
        persistUpdate(key, { date, datePhotoUri: photoUri }).catch(() => {});
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});

        // Redirigir targetKey al último item añadido.
        const allItems = itemsRef.current;
        const last = allItems[allItems.length - 1];
        if (last && last.key !== key) {
          setTargetKey(last.key);
        }
        setPhase("date");
        showFeedback("success", t("scanner.unitSaved", { count: 1, date }));
        armIdleTimer();
        return;
      }

      if (now - lastAcceptAtRef.current < NEXT_UNIT_PAUSE_MS) return;
      lastAcceptAtRef.current = now;

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});

      if (!target.date) {
        setItems((prev) =>
          prev.map((i) =>
            i.key === key ? { ...i, date, datePhotoUri: photoUri } : i,
          ),
        );
        persistUpdate(key, { date, datePhotoUri: photoUri }).catch(() => {});
      } else {
        const clone: SessionItem = {
          key: nextKey(),
          barcode: target.barcode,
          product: target.product,
          date,
          datePhotoUri: photoUri,
        };
        setItems((prev) => [...prev, clone]);
        persistNewItem(clone).catch(() => {});
      }

      const count = unitCountRef.current + 1;
      unitCountRef.current = count;
      setUnitCount(count);
      showFeedback("success", t("scanner.unitSaved", { count, date }));
      armIdleTimer();
    },
    [
      setItems,
      persistUpdate,
      persistNewItem,
      nextKey,
      showFeedback,
      invalidDateText,
      armIdleTimer,
      t,
    ],
  );

  const onDateActivity = useCallback(
    (leader: string | null) => {
      if (leader && phaseRef.current === "date") armIdleTimer();
    },
    [armIdleTimer],
  );

  const skipDate = useCallback(() => {
    goToBarcode();
  }, [goToBarcode]);

  const selectItem = useCallback((key: string) => {
    if (phaseRef.current !== "date") {
      armIdleTimer();
    }
    manualSelectRef.current = true;
    setTargetKey(key);
    setPhase("date");
    setFeedback(null);
  }, [armIdleTimer]);

  const setItemDate = useCallback(
    (key: string, date: string) => {
      setItems((prev) =>
        prev.map((i) => (i.key === key ? { ...i, date } : i)),
      );
      persistUpdate(key, { date }).catch(() => {});
      if (targetKeyRef.current === key) goToBarcode();
    },
    [setItems, persistUpdate, goToBarcode],
  );

  const removeItem = useCallback(
    (key: string) => {
      persistDelete(key).catch(() => {});
      setItems((prev) => prev.filter((i) => i.key !== key));
      if (targetKeyRef.current === key) goToBarcode();
    },
    [persistDelete, setItems, goToBarcode],
  );

  const setItemProductName = useCallback(
    (key: string, name: string, imageFrontUrl?: string) => {
      setItems((prev) =>
        prev.map((i) =>
          i.key === key
            ? {
                ...i,
                product: {
                  ...i.product,
                  name,
                  ...(imageFrontUrl ? { imageFrontUrl } : {}),
                },
              }
            : i,
        ),
      );
      const item = itemsRef.current.find((i) => i.key === key);
      if (item) {
        persistUpdate(key, {
          productJson: JSON.stringify({
            ...item.product,
            name,
            ...(imageFrontUrl ? { imageFrontUrl } : {}),
          }),
        }).catch(() => {});
      }
    },
    [setItems, persistUpdate],
  );

  const clearSession = useCallback(async () => {
    await clearAll();
    setItems([]);
    goToBarcode();
  }, [clearAll, setItems, goToBarcode]);

  const finalize = useCallback(async () => {
    if (finalizingRef.current || itemsRef.current.length === 0) return;
    finalizingRef.current = true;
    setFinalizing(true);

    try {
      const toSave = itemsRef.current;

      await Promise.all(
        toSave.map(async (item) => {
          const p = item.product;
          await productRepository.upsertProduct({
            barcode: item.barcode,
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
              barcode: item.barcode,
              expirationDate: item.date,
              datePhotoUri: item.datePhotoUri ?? null,
              createdAt: new Date(),
            });
          }
        }),
      );

      try {
        const settings =
          await notificationSettingsRepository.getNotificationSettings();
        if (settings.enabled) await rebuildAllReminders();
      } catch {
      }

      await clearAll();
      setItems([]);
      goToBarcode();
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      onFinalized?.(toSave.length);
    } catch (e) {
      console.warn("finalize error:", e);
      showFeedback("warning", t("scanner.saveError"));
    } finally {
      finalizingRef.current = false;
      setFinalizing(false);
    }
  }, [clearAll, setItems, goToBarcode, showFeedback, onFinalized, t]);

  return {
    phase,
    items,
    targetKey,
    feedback,
    finalizing,
    idleDeadline,
    loadPersisted,
    onBarcodesDetected,
    onDateCandidate,
    onDateActivity,
    skipDate,
    selectItem,
    setItemDate,
    setItemProductName,
    removeItem,
    clearSession,
    finalize,
  };
}
