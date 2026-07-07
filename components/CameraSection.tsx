import { memo, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Camera, type CameraRef } from "react-native-vision-camera";
import { Colors, BorderRadius } from "@/constants/theme";
import { AppText } from "./ui/Text";
import { IconButton } from "./ui/IconButton";

export type CameraLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CameraSectionProps = {
  device: NonNullable<
    ReturnType<typeof import("react-native-vision-camera").useCameraDevice>
  >;
  outputs?: any[];
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
  onCameraLayout?: (layout: CameraLayout) => void;
};

/**
 * Full-screen camera view with overlay controls: back button, torch toggle,
 * camera flip, and zoom buttons. Reports its measured layout back to the
 * parent to align cropping with the visible viewport.
 */
const CameraSection = memo(function CameraSection({
  device,
  outputs,
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
  onCameraLayout,
}: CameraSectionProps) {
  const rootRef = useRef<View>(null);
  const hasReported = useRef(false);

  useEffect(() => {
    if (!onCameraLayout || hasReported.current) return;
    const id = requestAnimationFrame(() => {
      rootRef.current?.measureInWindow((left, top, width, height) => {
        if (!hasReported.current && width > 0 && height > 0) {
          hasReported.current = true;
          onCameraLayout({ left, top, width, height });
        }
      });
    });
    return () => cancelAnimationFrame(id);
  }, [onCameraLayout]);

  return (
    <View style={StyleSheet.absoluteFill} ref={rootRef}>
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
        <View style={[styles.backBtn, { top: insets.top + 8 }]}>
          <IconButton
            variant="overlay"
            size="md"
            icon={
              <SymbolView
                name={{ ios: "chevron.left", android: "chevron_left" }}
                size={24}
                tintColor={Colors.white}
              />
            }
            onPress={onBack}
          />
        </View>

        <View style={[styles.controls, { top: insets.top + 8 }]}>
          {hasTorch ? (
            <View style={torch === "on" && styles.ctrlActive}>
              <IconButton
                variant="overlay"
                size="md"
                icon={
                  <SymbolView
                    name={{
                      ios: torch === "off" ? "bolt.slash" : "bolt.fill",
                      android: torch === "off" ? "flash_off" : "flash_on",
                    }}
                    size={20}
                    tintColor={Colors.white}
                  />
                }
                onPress={onToggleTorch}
              />
            </View>
          ) : null}
          <IconButton
            variant="overlay"
            size="md"
            icon={
              <SymbolView
                name={{
                  ios: "arrow.triangle.2.circlepath",
                  android: "flip_camera_android",
                }}
                size={20}
                tintColor={Colors.white}
              />
            }
            onPress={onToggleCamera}
          />
        </View>

        <View style={styles.zoom}>
          <IconButton
            variant="overlay"
            size="md"
            icon={
              <AppText variant="button" color={Colors.white}>
                +
              </AppText>
            }
            onPress={onZoomIn}
          />
          <AppText variant="caption" color={Colors.white} style={styles.zoomLabel}>
            {zoomLabel}
          </AppText>
          <IconButton
            variant="overlay"
            size="md"
            icon={
              <AppText variant="button" color={Colors.white}>
                -
              </AppText>
            }
            onPress={onZoomOut}
          />
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
    justifyContent: "center",
    alignItems: "center",
  },
  controls: {
    position: "absolute",
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  ctrlActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.overlayLight,
    justifyContent: "center",
    alignItems: "center",
  },
  zoom: {
    position: "absolute",
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomLabel: {
    marginVertical: 4,
    textAlign: "center",
  },
});
