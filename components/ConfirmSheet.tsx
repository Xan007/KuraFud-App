import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { AppText } from "@/components/ui/Text";
import { Colors, Spacing, BorderRadius, withOpacity } from "@/constants/theme";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

interface ConfirmSheetProps {
  visible: boolean;
  icon: SymbolName;
  iconColor?: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;

  variant?: "primary" | "error";
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

const ANIM_DURATION = 200;

export function ConfirmSheet({
  visible,
  icon,
  iconColor = Colors.primary,
  title,
  body,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const [mounted, setMounted] = useState(false);
  const animatingOut = useRef(false);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  const handleAnimComplete = useCallback(() => {
    if (animatingOut.current) {
      animatingOut.current = false;
      setMounted(false);
      onCancelRef.current();
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      animatingOut.current = false;
      scale.value = withTiming(1, { duration: ANIM_DURATION });
      opacity.value = withTiming(1, { duration: ANIM_DURATION });
    } else if (mounted) {
      animatingOut.current = true;
      scale.value = withTiming(0, { duration: ANIM_DURATION }, (finished) => {
        if (finished) runOnJS(handleAnimComplete)();
      });
      opacity.value = withTiming(0, { duration: ANIM_DURATION });
    }

  }, [visible]);

  const rBackdrop = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.5,
  }));

  const rDialog = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const startOut = useCallback(() => {
    animatingOut.current = true;
    scale.value = withTiming(0, { duration: ANIM_DURATION }, (finished) => {
      if (finished) runOnJS(handleAnimComplete)();
    });
    opacity.value = withTiming(0, { duration: ANIM_DURATION });
  }, [scale, opacity, handleAnimComplete]);


  const handleConfirm = useCallback(() => {
    startOut();
    onConfirmRef.current();
  }, [startOut]);

  const handleCancel = useCallback(() => {
    startOut();
  }, [startOut]);

  if (!mounted) return null;

  const confirmBg = variant === "error" ? Colors.error : Colors.primary;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, rBackdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
      </Animated.View>

      <Animated.View style={[styles.dialog, rDialog]}>
        <View
          style={[
            styles.iconContainer,
            variant === "error" && { backgroundColor: withOpacity(Colors.error, 0.12) },
          ]}
        >
          <SymbolView
            name={icon}
            size={32}
            tintColor={iconColor}
          />
        </View>
        <AppText variant="heading" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="body" color={Colors.textSecondary} style={styles.body}>
          {body}
        </AppText>

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleCancel}
          >
            <AppText variant="button" color={Colors.text}>
              {cancelLabel}
            </AppText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              { backgroundColor: confirmBg },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleConfirm}
          >
            <AppText variant="button" color={Colors.white}>
              {confirmLabel}
            </AppText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    elevation: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.overlay,
  },
  dialog: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderCurve: "continuous",
    padding: Spacing.lg,
    paddingVertical: Spacing.xl,
    marginHorizontal: Spacing.xl * 2,
    alignItems: "center",
    gap: Spacing.sm,
    maxWidth: 300,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: withOpacity(Colors.primary, 0.12),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  title: {
    textAlign: "center",
    marginBottom: 2,
  },
  body: {
    textAlign: "center",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
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
  },
});

export default ConfirmSheet;
