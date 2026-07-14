import { memo, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  Modal,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import Carousel from "react-native-reanimated-carousel";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { AppText } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";

type ImageViewerProps = {

  images: string[];

  visible: boolean;

  startIndex?: number;

  onClose: () => void;

  labels?: string[];
};

const { width: SCREEN_W } = Dimensions.get("window");


export const ImageViewer = memo(function ImageViewer({
  images,
  visible,
  startIndex = 0,
  onClose,
  labels,
}: ImageViewerProps) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(startIndex);

  useEffect(() => {
    if (visible) {
      setPage(startIndex >= 0 && startIndex < images.length ? startIndex : 0);
    }
  }, [visible, startIndex, images.length]);

  if (images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <StatusBar hidden />
        <View
          style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}
          pointerEvents="box-none"
        >
          <IconButton
            variant="overlay"
            size="md"
            icon={
              <SymbolView
                name={{ ios: "xmark", android: "close" }}
                size={20}
                tintColor="#fff"
              />
            }
            onPress={onClose}
          />
          <View style={styles.counter}>
            <AppText variant="subheading" color="#fff">
              {page + 1} / {images.length}
            </AppText>
            {labels && labels[page] ? (
              <AppText variant="caption" color="#ffffffcc">
                {labels[page]}
              </AppText>
            ) : null}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <Carousel
          loop={false}
          width={SCREEN_W}
          height={SCREEN_W}
          data={images}
          defaultIndex={page}
          pagingEnabled
          snapEnabled
          onSnapToItem={(i) => setPage(i)}
          renderItem={({ item }) => (
            <Pressable onPress={onClose} style={styles.imageWrap}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </Pressable>
          )}
        />

        <View
          style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}
        >
          <View style={styles.dots} pointerEvents="none">
            {images.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === page ? styles.dotActive : styles.dotIdle,
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "transparent",
  },
  counter: {
    alignItems: "center",
    gap: 2,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_W,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: BorderRadius.xl,
    borderCurve: "continuous",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotIdle: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 18,
  },
});

export default ImageViewer;
