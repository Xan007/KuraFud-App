import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";
import { AppText } from "@/components/ui/Text";
import { Colors, Spacing, BorderRadius, withOpacity } from "@/constants/theme";

type Props = {
  visible: boolean;
  barcode: string;
  currentName: string;
  currentPhotoUri: string;
  index: number;
  total: number;
  hideSkip?: boolean;
  onConfirm: (name: string, photoUri?: string) => void;
  onSkip: () => void;
};

export const NameProductSheet = memo(function NameProductSheet({
  visible,
  barcode,
  currentName,
  currentPhotoUri,
  index,
  total,
  hideSkip = false,
  onConfirm,
  onSkip,
}: Props) {
  const [name, setName] = useState(currentName || barcode);
  const [photoUri, setPhotoUri] = useState(currentPhotoUri);
  const inputRef = useRef<TextInput>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setName(currentName || barcode);
      setPhotoUri(currentPhotoUri);
      focusedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || focusedRef.current) return;
    focusedRef.current = true;
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, [visible]);

  const handlePickPhoto = useCallback(async () => {
    try {
      const ImagePicker = await import("expo-image-picker");
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {}
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const ImagePicker = await import("expo-image-picker");
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {}
  }, []);

  const handleConfirm = useCallback(() => {
    Keyboard.dismiss();
    const n = name.trim();
    onConfirm(n || barcode, photoUri || undefined);
  }, [name, barcode, photoUri, onConfirm]);

  const handleSkip = useCallback(() => {
    Keyboard.dismiss();
    onSkip();
  }, [onSkip]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleSkip}>
        <View style={styles.center}>
          <Pressable onPress={() => {}}>
            <View style={styles.dialog}>
              {total > 1 && (
                <AppText variant="label" color={Colors.textSecondary} style={styles.stepLabel}>
                  {index + 1} / {total}
                </AppText>
              )}

              <View style={styles.photoContainer}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <SymbolView
                      name={{ ios: "camera.fill", android: "photo_camera" }}
                      size={28}
                      tintColor={withOpacity(Colors.text, 0.3)}
                    />
                  </View>
                )}
              </View>

              <AppText variant="caption" color={Colors.textSecondary} style={styles.barcodeLabel}>
                {barcode}
              </AppText>

              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre del producto"
                  placeholderTextColor={withOpacity(Colors.text, 0.3)}
                  selectTextOnFocus
                />
              </View>

              <View style={styles.photoRow}>
                <Pressable
                  style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.8 }]}
                  onPress={handlePickPhoto}
                >
                  <SymbolView
                    name={{ ios: "photo.on.rectangle", android: "photo_library" }}
                    size={16}
                    tintColor={Colors.primary}
                  />
                  <AppText variant="caption" color={Colors.primary}>
                    Galería
                  </AppText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleTakePhoto}
                >
                  <SymbolView
                    name={{ ios: "camera.viewfinder", android: "photo_camera" }}
                    size={16}
                    tintColor={Colors.primary}
                  />
                  <AppText variant="caption" color={Colors.primary}>
                    Cámara
                  </AppText>
                </Pressable>
              </View>

              <View style={styles.buttonRow}>
                {!hideSkip && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={handleSkip}
                  >
                    <AppText variant="button" color={Colors.textSecondary}>
                      Más tarde
                    </AppText>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.confirmButton,
                    hideSkip && { flex: 1 },
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={handleConfirm}
                >
                  <AppText variant="button" color={Colors.white}>
                    {total > 1 && index < total - 1 ? "Siguiente" : "Listo"}
                  </AppText>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
});

export default NameProductSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: 300,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderCurve: "continuous",
    padding: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  stepLabel: {
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  photoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  barcodeLabel: {
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  input: {
    height: 44,
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
  },
  photoRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
    marginTop: Spacing.sm,
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    backgroundColor: Colors.primary,
  },
});
