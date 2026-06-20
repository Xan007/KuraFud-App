import { memo, useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { DatePickerDialog } from "@expo/ui/jetpack-compose";
import SheetWrapper from "@/components/SheetWrapper";

type Props = {
  date: string;
  photoPath: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
};

/**
 * Bottom sheet that shows the cropped photo preview and the detected date,
 * letting the user confirm, edit, or cancel the result.
 */
const DatePreviewSheet = memo(function DatePreviewSheet({
  date: initialDate,
  photoPath,
  onConfirm,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(initialDate);
  const [showPicker, setShowPicker] = useState(false);

  const handleConfirm = useCallback(() => {
    onConfirm(date);
  }, [onConfirm, date]);

  return (
    <SheetWrapper onDismiss={onCancel}>
      {photoPath ? (
        <View style={styles.photoWrap}>
          <Image
            source={{ uri: photoPath }}
            style={styles.photo}
            resizeMode="contain"
          />
        </View>
      ) : null}

      <Text style={styles.label}>Fecha detectada</Text>
      <Text style={styles.dateText}>{date}</Text>

      <View style={styles.actions}>
        <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>Confirmar</Text>
        </Pressable>

        <Pressable style={styles.editBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.editBtnText}>Corregir</Text>
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </Pressable>
      </View>

      {showPicker && (
        <DatePickerDialog
          initialDate={date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")}
          onDateSelected={(d) => {
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            setDate(`${dd}/${mm}/${yyyy}`);
            setShowPicker(false);
          }}
          onDismissRequest={() => setShowPicker(false)}
        />
      )}
    </SheetWrapper>
  );
});

export default DatePreviewSheet;

const styles = StyleSheet.create({
  photoWrap: {
    width: "100%",
    height: 80,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 1,
    marginBottom: 20,
  },
  actions: {
    width: "100%",
    gap: 8,
  },
  confirmBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    borderCurve: "continuous",
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  editBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  editBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: "continuous",
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
});
