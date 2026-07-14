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
  countdownSeconds?: number | null;
};

const GUIDES = 60;
const CORNER = 24;


const DateScannerOverlay = memo(function DateScannerOverlay({
  onLayoutGuide,
  statusText,
  countdownSeconds,
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

      <View style={[styles.statusPill, { top: insets.top + 12 }]}>
        <AppText variant="caption" color={Colors.white}>
          {statusText ?? "Buscando la fecha automáticamente…"}
        </AppText>
      </View>


      {countdownSeconds !== null && (
        <View style={[styles.countdownBadge, { top: insets.top + 80, right: 16 }]}>
          <AppText variant="caption" color={Colors.white} style={styles.countdownText}>
            {countdownSeconds}s
          </AppText>
        </View>
      )}


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
  countdownBadge: {
    position: "absolute",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  countdownText: {
    fontWeight: "600",
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
