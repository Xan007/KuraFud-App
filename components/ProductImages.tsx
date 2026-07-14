import { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import Carousel from "react-native-reanimated-carousel";
import { Image } from "expo-image";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { ImageViewer } from "@/components/ImageViewer";

type DotProps = {
  index: number;
  progress: SharedValue<number>;
};

function Dot({ index, progress }: DotProps) {
  const animStyle = useAnimatedStyle(() => {
    const dist = Math.abs(progress.value - index);
    const t = Math.max(0, 1 - dist);
    return {
      width: withSpring(7 + t * 11, { damping: 18, stiffness: 120 }),
      opacity: withSpring(0.35 + t * 0.65, { damping: 18 }),
    };
  });

  return <Animated.View style={[styles.dot, animStyle]} />;
}

type Props = {
  images: string[];

  labels?: string[];
};

export default function ProductImages({ images, labels }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const progress = useSharedValue(0);
  const [page, setPage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  if (images.length === 0) return null;

  const imgWidth = screenWidth - 32;

  return (
    <View style={styles.box}>
      <Carousel
        loop={false}
        width={imgWidth}
        height={300}
        data={images}
        pagingEnabled
        snapEnabled
        onSnapToItem={setPage}
        onProgressChange={(_, abs) => {
          progress.value = abs;
        }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              setPage(index);
              setViewerOpen(true);
            }}
            style={styles.imageWrap}
          >
            <Image
              source={item}
              style={styles.image}
              contentFit="contain"
              transition={300}
            />
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {images.map((_, i) => (
            <Dot key={i} index={i} progress={progress} />
          ))}
        </View>
        <Text style={styles.label}>
          {page + 1}/{images.length}
        </Text>
      </View>

      <ImageViewer
        images={images}
        labels={labels}
        visible={viewerOpen}
        startIndex={page}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderCurve: "continuous",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  },
  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: 300 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dots: { flexDirection: "row", gap: 5 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.border,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
