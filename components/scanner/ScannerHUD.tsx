import { memo, useEffect, useRef } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/Text";
import { Colors, BorderRadius } from "@/constants/theme";
import { withOpacity } from "@/constants/theme";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import type { ScanPhase, ScanFeedback } from "@/hooks/useScannerFlow";

export type GuideRect = { x: number; y: number; width: number; height: number };

type Props = {
  phase: ScanPhase;
  statusText: string;
  feedback: ScanFeedback | null;
  countdownSeconds: number | null;
  onSkipDate: () => void;
  onGuideLayout?: (rect: GuideRect) => void;
};

const SCREEN_W = Dimensions.get("window").width;
const FRAME_W = Math.min(SCREEN_W - 56, 340);
const FRAME_H = 175;
const CORNER = 30;
const CORNER_THICKNESS = 3;
const LASER_INSET = 10;

const SHADE = "rgba(3,12,8,0.55)";
const ACCENT_BARCODE = Colors.primary;
const ACCENT_DATE = Colors.primaryLight;
const CHIP_BG = "rgba(4,16,10,0.72)";

const FEEDBACK_COLORS: Record<ScanFeedback["kind"], string> = {
  success: ACCENT_BARCODE,
  warning: Colors.warning,
  info: Colors.white,
};

const ScannerHUD = memo(function ScannerHUD({
  phase,
  statusText,
  feedback,
  countdownSeconds,
  onSkipDate,
  onGuideLayout,
}: Props) {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const frameRef = useRef<View>(null);

  const accent = phase === "date" ? ACCENT_DATE : ACCENT_BARCODE;

  const sweep = useSharedValue(0);
  const pulse = useSharedValue(1);
  const flash = useSharedValue(0);
  const dot = useSharedValue(0.35);

  useEffect(() => {
    sweep.value = 0;
    sweep.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    pulse.value = withSequence(
      withTiming(1.05, { duration: 110 }),
      withSpring(1, { damping: 12, stiffness: 180 }),
    );
  }, [phase, sweep, pulse]);

  useEffect(() => {
    dot.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [dot]);

  useEffect(() => {
    if (feedback?.kind === "success") {
      flash.value = withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(0, { duration: 520 }),
      );
    }
  }, [feedback?.id, feedback?.kind, flash]);

  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const laserHorizontalStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: sweep.value * (FRAME_H - LASER_INSET * 2 - 2) },
    ],
  }));

  const laserVerticalStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: sweep.value * (FRAME_W - LASER_INSET * 2 - 2) },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dot.value,
  }));

  const handleFrameLayout = () => {
    requestAnimationFrame(() => {
      frameRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          onGuideLayout?.({ x, y, width, height });
        }
      });
    });
  };

  const cornerStyle = { borderColor: accent };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Sombra superior con etiqueta de modo */}
      <View style={[styles.shade, styles.shadeTop]} pointerEvents="none">
        <AppText variant="label" color={accent} style={styles.modeLabel}>
          {phase === "date" ? t("scanner.modeDate") : t("scanner.modeBarcode")}
        </AppText>
      </View>

      {/* Fila central: marco de escaneo */}
      <View style={styles.middleRow} pointerEvents="none">
        <View style={[styles.shade, styles.shadeSide]} />
        <Animated.View style={[styles.frame, frameStyle]}>
          <View
            ref={frameRef}
            style={StyleSheet.absoluteFill}
            onLayout={handleFrameLayout}
          />

          <View style={[styles.corner, styles.cornerTL, cornerStyle]} />
          <View style={[styles.corner, styles.cornerTR, cornerStyle]} />
          <View style={[styles.corner, styles.cornerBL, cornerStyle]} />
          <View style={[styles.corner, styles.cornerBR, cornerStyle]} />

          {phase === "barcode" ? (
            <Animated.View style={[styles.laserVertical, laserVerticalStyle]}>
              <LinearGradient
                colors={["transparent", ACCENT_BARCODE, "transparent"]}
                style={styles.laserFill}
              />
            </Animated.View>
          ) : (
            <Animated.View
              style={[styles.laserHorizontal, laserHorizontalStyle]}
            >
              <LinearGradient
                colors={["transparent", ACCENT_DATE, "transparent"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.laserFill}
              />
            </Animated.View>
          )}

          <Animated.View
            style={[styles.flash, { borderColor: accent }, flashStyle]}
          />
        </Animated.View>
        <View style={[styles.shade, styles.shadeSide]} />
      </View>

      {/* Sombra inferior: estado + acción */}
      <View style={[styles.shade, styles.shadeBottom]} pointerEvents="box-none">
        <View style={styles.statusChip}>
          <Animated.View
            style={[styles.statusDot, { backgroundColor: accent }, dotStyle]}
          />
          <AppText variant="caption" color={Colors.white}>
            {statusText}
          </AppText>
        </View>

        {phase === "date" && (
          <Animated.View entering={FadeInUp.duration(220)}>
            <View style={styles.dateActions}>
              {countdownSeconds != null && (
                <AppText variant="caption" color={withOpacity(Colors.white, 0.55)}>
                  ↻ {t("scanner.countdownDate", { seconds: countdownSeconds })}
                </AppText>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.skipButton,
                  pressed && styles.skipButtonPressed,
                ]}
                onPress={onSkipDate}
                hitSlop={8}
              >
                <AppText variant="caption" color={Colors.white}>
                  {t("scanner.skipDate")} ›
                </AppText>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Banner de feedback transitorio */}
      {feedback && (
        <Animated.View
          key={feedback.id}
          entering={FadeInDown.duration(250)}
          exiting={FadeOut.duration(180)}
          style={[styles.feedbackBanner, { top: insets.top + 60 }]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.feedbackDot,
              { backgroundColor: FEEDBACK_COLORS[feedback.kind] },
            ]}
          />
          <AppText
            variant="caption"
            color={Colors.white}
            style={styles.feedbackText}
          >
            {feedback.text}
          </AppText>
        </Animated.View>
      )}
    </View>
  );
});

export default ScannerHUD;

const styles = StyleSheet.create({
  shade: {
    backgroundColor: SHADE,
  },
  shadeTop: {
    flex: 0.85,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 16,
  },
  middleRow: {
    height: FRAME_H,
    flexDirection: "row",
  },
  shadeSide: {
    flex: 1,
  },
  shadeBottom: {
    flex: 1.35,
    alignItems: "center",
    paddingTop: 20,
    gap: 14,
  },
  modeLabel: {
    letterSpacing: 3,
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: BorderRadius.md,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: BorderRadius.md,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: BorderRadius.md,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: BorderRadius.md,
  },
  laserVertical: {
    position: "absolute",
    top: LASER_INSET,
    bottom: LASER_INSET,
    left: LASER_INSET,
    width: 2,
  },
  laserHorizontal: {
    position: "absolute",
    left: LASER_INSET,
    right: LASER_INSET,
    top: LASER_INSET,
    height: 2,
  },
  laserFill: {
    flex: 1,
    borderRadius: 1,
  },
  flash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    backgroundColor: withOpacity(Colors.primaryLight, 0.12),
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.pill,
    backgroundColor: CHIP_BG,
    maxWidth: SCREEN_W - 48,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  skipButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  feedbackBanner: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    backgroundColor: CHIP_BG,
    maxWidth: SCREEN_W - 40,
  },
  feedbackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  feedbackText: {
    flexShrink: 1,
  },
});
