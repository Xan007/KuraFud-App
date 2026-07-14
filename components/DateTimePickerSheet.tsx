import { Platform, View, StyleSheet, Pressable } from "react-native";
import { Host } from "@expo/ui";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { AppText } from "./ui/Text";

interface DateTimePickerSheetProps {
  visible: boolean;
  mode: "date" | "time";
  value: Date;
  onChange: (date: Date) => void;
  onCancel: () => void;
  onConfirm: () => void;
}


export function DateTimePickerSheet({
  visible,
  mode,
  value,
  onChange,
  onCancel,
  onConfirm,
}: DateTimePickerSheetProps) {
  if (!visible) return null;


  if (Platform.OS === "android") {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="spinner"
        onChange={(event, selectedDate) => {
          if (event.type === "set" && selectedDate) {
            onChange(selectedDate);
            onConfirm();
          }
          if (event.type === "dismissed") {
            onCancel();
          }
        }}
      />
    );
  }


  return (
    <Host style={styles.hostContainer}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable onPress={onCancel}>
            <AppText variant="button" color={Colors.primary}>
              Cancelar
            </AppText>
          </Pressable>
          <Pressable onPress={onConfirm}>
            <AppText variant="button" color={Colors.primary}>
              Listo
            </AppText>
          </Pressable>
        </View>
        <DateTimePicker
          value={value}
          mode={mode}
          display="spinner"
          onChange={(event, date) => {
            if (date) {
              onChange(date);
            }
          }}
        />
      </View>
    </Host>
  );
}

const styles = StyleSheet.create({
  hostContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: "hidden",
    marginHorizontal: 32,
    width: "85%",
    maxWidth: 360,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderCurve: "continuous",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
});

export default DateTimePickerSheet;
