import { memo, useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, BorderRadius } from "@/constants/theme";
import { AppText } from "./ui/Text";
import { IconButton } from "./ui/IconButton";
import { SymbolView } from "expo-symbols";

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
          <AppText variant="heading" color={Colors.white}>
            Escanea la fecha de vencimiento
          </AppText>
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
          <AppText
            variant="body"
            color={Colors.overlayLight}
            style={styles.hint}
          >
            {onTakePhoto
              ? "Apunta a la fecha de vencimiento del producto"
              : statusText ?? "Buscando la fecha automáticamente…"}
          </AppText>
        </View>
      </View>

      <View style={[styles.bottomBtns, { paddingBottom: insets.bottom + 24 }]}>
        {onTakePhoto ? (
          <>
            <View style={styles.cancelBtn}>
              <IconButton
                variant="overlay"
                size="sm"
                icon={
                  <AppText variant="button" color={Colors.white}>
                    Cancelar
                  </AppText>
                }
                onPress={onCancel}
              />
            </View>

            <View
              style={styles.photoBtn}
            >
              <View style={styles.photoBtnOuter}>
                <View style={styles.photoBtnInner} />
              </View>
            </View>

            <View style={styles.spacer} />
          </>
        ) : (
          <View style={styles.cancelBtn}>
            <IconButton
              variant="overlay"
              size="sm"
              icon={
                <AppText variant="button" color={Colors.white}>
                  Cancelar
                </AppText>
              }
              onPress={onCancel}
            />
          </View>
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
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  guideRow: {
    flexDirection: "row",
    height: GUIDES * 2,
  },
  maskSide: {
    flex: 1,
    backgroundColor: Colors.overlay,
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
  maskBottom: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 32,
  },
  hint: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  photoBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.overlayLight,
  },
  photoBtnOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  photoBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: "#ddd",
  },
  spacer: {
    width: 72 + 24,
  },
});
