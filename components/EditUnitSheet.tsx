import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import SheetWrapper, { type SheetWrapperHandle } from "@/components/SheetWrapper";
import { DatePickerWheel, type DateOrder, type MonthMode, type ColumnLabel } from "@/components/DatePickerWheel";
import { AppText } from "@/components/ui/Text";
import { Colors, Spacing, BorderRadius, withOpacity } from "@/constants/theme";

interface EditUnitSheetProps {
  visible: boolean;
  date: Date;
  onChangeDate: (date: Date) => void;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  showDelete: boolean;
  confirmLabel: string;
  cancelLabel: string;
  sheetTitle?: string;
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  deleteConfirmLabel: string;
  deleteCancelLabel: string;
  labels: ColumnLabel;
  orderByLabel: string;
  orderDmyLabel: string;
  orderMdyLabel: string;
  monthModeByLabel: string;
  monthModeNumberLabel: string;
  monthModeNameLabel: string;
  minDate?: Date;
}

export function EditUnitSheet({
  visible,
  date,
  onChangeDate,
  onCancel,
  onConfirm,
  onDelete,
  showDelete,
  confirmLabel,
  cancelLabel,
  sheetTitle,
  deleteConfirmTitle,
  deleteConfirmBody,
  deleteConfirmLabel,
  deleteCancelLabel,
  labels,
  orderByLabel,
  orderDmyLabel,
  orderMdyLabel,
  monthModeByLabel,
  monthModeNumberLabel,
  monthModeNameLabel,
  minDate,
}: EditUnitSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [order, setOrder] = useState<DateOrder>("dmy");
  const [monthMode, setMonthMode] = useState<MonthMode>("number");
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef<SheetWrapperHandle>(null);


  useEffect(() => {
    if (visible) {
      setBusy(false);
      setConfirmDelete(false);
    }
  }, [visible]);

  const startDismiss = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const handleSheetDismiss = useCallback(() => {
    setConfirmDelete(false);
    onCancel();
  }, [onCancel]);


  const handleConfirmPress = useCallback(() => {
    if (busy) return;
    setBusy(true);
    startDismiss();
    Promise.resolve(onConfirm()).catch(() => {});
  }, [busy, onConfirm, startDismiss]);

  const handleDelete = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setConfirmDelete(false);
    startDismiss();
    onDelete();
  }, [busy, onDelete, startDismiss]);

  if (!visible) return null;

  return (
    <SheetWrapper ref={sheetRef} onDismiss={handleSheetDismiss}>
      {sheetTitle || showDelete ? (
        <View style={styles.header}>
          <View style={styles.headerSide} />
          {sheetTitle ? (
            <AppText variant="heading">{sheetTitle}</AppText>
          ) : (
            <View />
          )}
          <View style={styles.headerSide}>
            {showDelete ? (
              <Pressable
                onPress={() => setConfirmDelete(true)}
                hitSlop={12}
                style={styles.headerIconButton}
              >
                <SymbolView
                  name={{ ios: "trash", android: "delete" }}
                  size={20}
                  tintColor={Colors.error}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.pickerRow}>
        <DatePickerWheel
          date={date}
          onChange={onChangeDate}
          order={order}
          monthMode={monthMode}
          labels={labels}
          minDate={minDate}
        />
      </View>

      <View style={styles.chipRow}>
        <Pressable
          style={({ pressed }) => [
            styles.chip,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => setOrder((o) => (o === "dmy" ? "mdy" : "dmy"))}
        >
          <SymbolView
            name={{ ios: "arrow.left.arrow.right", android: "swap_horiz" }}
            size={14}
            tintColor={Colors.primary}
          />
          <AppText variant="caption" color={Colors.primary} style={styles.chipText}>
            {orderByLabel}: {order === "dmy" ? orderDmyLabel : orderMdyLabel}
          </AppText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.chip,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => setMonthMode((m) => (m === "number" ? "name" : "number"))}
        >
          <SymbolView
            name={{ ios: "textformat", android: "text_format" }}
            size={14}
            tintColor={Colors.primary}
          />
          <AppText variant="caption" color={Colors.primary} style={styles.chipText}>
            {monthModeByLabel}: {monthMode === "number" ? monthModeNumberLabel : monthModeNameLabel}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={startDismiss}
        >
          <AppText variant="button" color={Colors.text}>
            {cancelLabel}
          </AppText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            (pressed || busy) && { opacity: 0.85 },
          ]}
          onPress={handleConfirmPress}
          disabled={busy}
        >
          <SymbolView
            name={{ ios: "checkmark", android: "check" }}
            size={18}
            tintColor={Colors.white}
          />
          <AppText variant="button" color={Colors.white}>
            {confirmLabel}
          </AppText>
        </Pressable>
      </View>

      {confirmDelete && showDelete ? (
        <View style={styles.overlay}>
          <View style={styles.overlayBackdrop} />
          <View style={styles.deleteDialog}>
            <View style={styles.confirmDeleteIcon}>
              <SymbolView
                name={{ ios: "trash.fill", android: "delete" }}
                size={32}
                tintColor={Colors.error}
              />
            </View>
            <AppText variant="heading" style={styles.deleteDialogTitle}>
              {deleteConfirmTitle}
            </AppText>
            <AppText
              variant="body"
              color={Colors.textSecondary}
              style={styles.confirmDeleteBody}
            >
              {deleteConfirmBody}
            </AppText>

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setConfirmDelete(false)}
              >
                <AppText variant="button" color={Colors.text}>
                  {deleteCancelLabel}
                </AppText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmDeleteButton,
                  (pressed || busy) && { opacity: 0.85 },
                ]}
                onPress={handleDelete}
                disabled={busy}
              >
                <SymbolView
                  name={{ ios: "trash.fill", android: "delete" }}
                  size={18}
                  tintColor={Colors.white}
                />
                <AppText variant="button" color={Colors.white}>
                  {deleteConfirmLabel}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SheetWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Spacing.sm,
    minHeight: 32,
  },
  headerSide: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  headerIconButton: {
    padding: Spacing.xs,
  },
  pickerRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    backgroundColor: withOpacity(Colors.primary, 0.1),
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
  },
  chipText: {
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
  },
  confirmDeleteContent: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  confirmDeleteIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: withOpacity(Colors.error, 0.12),
    justifyContent: "center",
    alignItems: "center",
  },
  confirmDeleteBody: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    elevation: 10,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.background,
  },
  deleteDialog: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderCurve: "continuous",
    padding: Spacing.lg,
    paddingVertical: Spacing.xl,
    marginHorizontal: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
    maxWidth: 300,
  },
  deleteDialogTitle: {
    textAlign: "center",
  },
  confirmDeleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
  },
});

export default EditUnitSheet;
