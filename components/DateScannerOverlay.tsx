import { memo, useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type GuideLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  onCancel: () => void;
  onLayoutGuide?: (layout: GuideLayout) => void;
  /** Manual shutter handler. When omitted, the overlay runs in auto mode. */
  onTakePhoto?: () => void;
  /** Live status line shown under the guide while auto-scanning. */
  statusText?: string;
};

const GUIDES = 60;
const CORNER = 24;

/**
 * Semi-transparent overlay shown when scanning an expiration date.
 * It draws a rectangular cut-out guide and provides a shutter / cancel
 * button row at the bottom.
 */
const DateScannerOverlay = memo(function DateScannerOverlay({
  onTakePhoto,
  onCancel,
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
      pointerEvents="box-none"
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.maskTop, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>Escanea la fecha de vencimiento</Text>
        </View>

        <View style={styles.guideRow}>
          <View style={styles.maskSide} />
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
          <View style={styles.maskSide} />
        </View>

        <View style={styles.maskBottom}>
          <Text style={styles.hint}>
            {onTakePhoto
              ? "Apunta a la fecha de vencimiento del producto"
              : statusText ?? "Buscando la fecha automáticamente…"}
          </Text>
        </View>
      </View>

      <View style={[styles.bottomBtns, { paddingBottom: insets.bottom + 24 }]}>
        {onTakePhoto ? (
          <>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>

            <Pressable style={styles.photoBtn} onPress={onTakePhoto}>
              <View style={styles.photoBtnOuter}>
                <View style={styles.photoBtnInner} />
              </View>
            </Pressable>

            <View style={styles.spacer} />
          </>
        ) : (
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </Pressable>
        )}
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
  maskTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  guideRow: {
    flexDirection: "row",
    height: GUIDES * 2,
  },
  maskSide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    borderColor: "#fff",
    borderTopLeftRadius: 8,
  },
  guideCornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#fff",
    borderTopRightRadius: 8,
  },
  guideCornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#fff",
    borderBottomLeftRadius: 8,
  },
  guideCornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#fff",
    borderBottomRightRadius: 8,
  },
  maskBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 32,
  },
  hint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  bottomBtns: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 32,
  },
  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  cancelBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  photoBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  photoBtnOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  photoBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#ddd",
  },
  spacer: {
    width: 72 + 24,
  },
});
