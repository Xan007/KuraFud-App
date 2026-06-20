import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Camera, type CameraRef } from "react-native-vision-camera";
import type { useBarcodeScannerOutput } from "react-native-vision-camera-barcode-scanner";
import type { useCameraDevice } from "react-native-vision-camera";

export type CameraSectionProps = {
  device: NonNullable<ReturnType<typeof useCameraDevice>>;
  scannerOutput: ReturnType<typeof useBarcodeScannerOutput>;
  cameraRef: React.RefObject<CameraRef | null>;
  torch: "off" | "on";
  zoomLabel: string;
  onToggleTorch: () => void;
  onToggleCamera: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onBack: () => void;
  insets: { top: number; bottom: number };
  hasTorch: boolean;
};

const CameraSection = memo(function CameraSection({
  device,
  scannerOutput,
  cameraRef,
  torch,
  zoomLabel,
  onToggleTorch,
  onToggleCamera,
  onZoomIn,
  onZoomOut,
  onBack,
  insets,
  hasTorch,
}: CameraSectionProps) {
  const outputs = useMemo(() => [scannerOutput], [scannerOutput]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        device={device}
        isActive
        enableNativeTapToFocusGesture
        enableNativeZoomGesture
        outputs={outputs}
      />

      <View
        style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
        pointerEvents="box-none"
      >
        {/* Back button */}
        <Pressable
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={onBack}
        >
          <SymbolView
            name={{ ios: "chevron.left", android: "chevron_left" }}
            size={24}
            tintColor="#fff"
          />
        </Pressable>

        {/* Flash + flip */}
        <View style={[styles.controls, { top: insets.top + 8 }]}>
          {hasTorch ? (
            <Pressable
              style={[styles.ctrlBtn, torch === "on" && styles.ctrlActive]}
              onPress={onToggleTorch}
            >
              <SymbolView
                name={{
                  ios: torch === "off" ? "bolt.slash" : "bolt.fill",
                  android: torch === "off" ? "flash_off" : "flash_on",
                }}
                size={20}
                tintColor="#fff"
              />
            </Pressable>
          ) : null}
          <Pressable style={styles.ctrlBtn} onPress={onToggleCamera}>
            <SymbolView
              name={{
                ios: "arrow.triangle.2.circlepath",
                android: "flip_camera_android",
              }}
              size={20}
              tintColor="#fff"
            />
          </Pressable>
        </View>

        {/* Zoom */}
        <View style={styles.zoom}>
          <Pressable style={styles.zoomBtn} onPress={onZoomIn}>
            <Text style={styles.zoomBtnText}>+</Text>
          </Pressable>
          <Text style={styles.zoomLabel}>{zoomLabel}</Text>
          <Pressable style={styles.zoomBtn} onPress={onZoomOut}>
            <Text style={styles.zoomBtnText}>-</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

export default CameraSection;

const styles = StyleSheet.create({
  backBtn: {
    position: "absolute",
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderCurve: "continuous",
  },
  controls: {
    position: "absolute",
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderCurve: "continuous",
  },
  ctrlActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  zoom: {
    position: "absolute",
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderCurve: "continuous",
  },
  zoomBtnText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 24,
  },
  zoomLabel: {
    color: "#fff",
    fontSize: 11,
    marginVertical: 4,
    textAlign: "center",
  },
});
