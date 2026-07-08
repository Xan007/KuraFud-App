import { memo, useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, BorderRadius } from "@/constants/theme";
import { AppText } from "./ui/Text";

type GuideLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  onLayoutGuide?: (layout: GuideLayout) => void;
  statusText?: string;
};

const GUIDES = 60;
const CORNER = 24;

/**
 * Non-blocking overlay shown when auto-scanning an expiration date.
 * Paints corner guide brackets (used for ROI cropping) and a floating
 * status pill.  Does NOT block barcode scanning — pointerEvents="none"
 * on the entire overlay.
 *
 * The corner-guide onLayout is still required: it feeds computeRoiRect
 * so the OCR pipeline can crop to the date area for better accuracy.
 */
const DateScannerOverlay = memo(function DateScannerOverlay({
  onLayoutGuide,
  statusText,
}: Props) {
  const insets = useSafeAreaInsets();
  const guideBoxRef = useRef<View>(null);
  const hasReported = useRef(false);

  const handleGuideLayout = useCallback(() => {
    if (hasReported.current || !onLayoutGuide) return;
    requestAnimationFrame(() => {
      guideBoxRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          hasReported.current = true;
          onLayoutGuide({ x, y, width, height });
        }
      });
    });
  }, [onLayoutGuide]);

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.overlay]}
      pointerEvents="none"
    >
      {/* Floating status pill near the top */}
      <View style={[styles.statusPill, { top: insets.top + 12 }]}>
        <AppText variant="caption" color={Colors.white}>
          {statusText ?? "Buscando la fecha automáticamente…"}
        </AppText>
      </View>

      {/* Corner guide box centered vertically */}
      <View style={styles.guideRow}>
        <View
          ref={guideBoxRef}
          style={styles.guideBox}
          onLayout={handleGuideLayout}
        >
          <View style={styles.guideCornerTL} />
          <View style={styles.guideCornerTR} />
          <View style={styles.guideCornerBL} />
          <View style={styles.guideCornerBR} />
        </View>
      </View>
    </View>
  );
});

export default DateScannerOverlay;

const styles = StyleSheet.create({
  overlay: {
    zIndex: 100,
    elevation: 10,
  },
  statusPill: {
    position: "absolute",
    left: 32,
    right: 32,
    alignItems: "center",
  },
  guideRow: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  guideBox: {
    width: GUIDES * 4,
    height: GUIDES * 2,
    position: "relative",
  },
  guideCornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.white,
    borderTopLeftRadius: BorderRadius.sm,
  },
  guideCornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.white,
    borderTopRightRadius: BorderRadius.sm,
  },
  guideCornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.white,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  guideCornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.white,
    borderBottomRightRadius: BorderRadius.sm,
  },
});
