import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraRef } from "react-native-vision-camera";

const ZOOM_SYNC_INTERVAL_MS = 500;
const ZOOM_STEP = 0.5;

export type UseCameraControlsOptions = {
  cameraRef: React.RefObject<CameraRef | null>;
};


export function useCameraControls({ cameraRef }: UseCameraControlsOptions) {
  const [cameraPosition, setCameraPosition] = useState<"back" | "front">(
    "back",
  );
  const [torch, setTorch] = useState<"off" | "on">("off");
  const [zoomLabel, setZoomLabel] = useState("1.0x");
  const lastZoomRef = useRef("1.0x");

  const toggleTorch = useCallback(() => {
    setTorch((prev) => (prev === "off" ? "on" : "off"));
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraPosition((prev) => (prev === "back" ? "front" : "back"));
    setTorch("off");
    setZoomLabel("1.0x");
    lastZoomRef.current = "1.0x";
  }, []);


  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      const ctrl = cameraRef.current?.controller;
      if (ctrl?.isConnected) {
        ctrl.setTorchMode(torch).catch(() => {});
        return true;
      }
      return false;
    };
    if (sync()) return;
    const id = setInterval(() => {
      if (cancelled || sync()) clearInterval(id);
    }, 150);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [torch, cameraPosition, cameraRef]);

  const getZoom = useCallback(() => {
    try {
      return cameraRef.current?.controller?.zoom ?? 1;
    } catch {
      return 1;
    }
  }, [cameraRef]);

  const handleZoomIn = useCallback(() => {
    const ctrl = cameraRef.current?.controller;
    if (!ctrl?.isConnected) return;
    const next = Math.min(ctrl.maxZoom, +(getZoom() + ZOOM_STEP).toFixed(1));
    ctrl.startZoomAnimation(next, 2).catch(() => {});
    const lbl = `${next.toFixed(1)}x`;
    lastZoomRef.current = lbl;
    setZoomLabel(lbl);
  }, [cameraRef, getZoom]);

  const handleZoomOut = useCallback(() => {
    const ctrl = cameraRef.current?.controller;
    if (!ctrl?.isConnected) return;
    const next = Math.max(ctrl.minZoom, +(getZoom() - ZOOM_STEP).toFixed(1));
    ctrl.startZoomAnimation(next, 2).catch(() => {});
    const lbl = `${next.toFixed(1)}x`;
    lastZoomRef.current = lbl;
    setZoomLabel(lbl);
  }, [cameraRef, getZoom]);


  useEffect(() => {
    const interval = setInterval(() => {
      const ctrl = cameraRef.current?.controller;
      if (ctrl?.isConnected) {
        const raw = (ctrl as any).displayableZoomFactor ?? ctrl.zoom;
        const z = `${Number(raw).toFixed(1)}x`;
        if (z !== lastZoomRef.current) {
          lastZoomRef.current = z;
          setZoomLabel(z);
        }
      }
    }, ZOOM_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [cameraRef]);

  return {
    cameraPosition,
    torch,
    zoomLabel,
    toggleTorch,
    toggleCamera,
    handleZoomIn,
    handleZoomOut,
    resetForReload: useCallback(() => {
      setZoomLabel("1.0x");
      lastZoomRef.current = "1.0x";
    }, []),
  };
}
