import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lookupProduct } from "services/productService";
import type { ProductInfo } from "types";
import { Colors } from "@/constants/theme";
import ExpandableText from "components/ExpandableText";
import NutritionTable from "components/NutritionTable";
import ProductImages from "components/ProductImages";
import TopBar from "components/TopBar";

type Status = "loading" | "result" | "not-found";

export default function ProductScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!barcode) return;
    const MIN = 300;
    const start = Date.now();
    lookupProduct(barcode)
      .then((p) => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, MIN - elapsed);
        setTimeout(() => {
          if (p) {
            setProduct(p);
            setStatus("result");
          } else {
            setStatus("not-found");
          }
        }, remaining);
      })
      .catch(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, MIN - elapsed);
        setTimeout(() => setStatus("not-found"), remaining);
      });
  }, [barcode]);

  // ── Loading ──────────────────────────────────────────────

  if (status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingMsg}>Buscando producto...</Text>
        </View>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  // ── Not found ────────────────────────────────────────────

  if (status === "not-found") {
    return (
      <Animated.View entering={FadeIn} style={styles.center}>
        <Text style={styles.code}>{barcode}</Text>
        <Text style={styles.msg}>
          Producto no encontrado en Open Food Facts
        </Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Volver</Text>
        </Pressable>
      </Animated.View>
    );
  }

  // ── Result ───────────────────────────────────────────────

  const p = product!;
  const images = [
    p.imageFrontUrl,
    p.imageBackUrl,
    p.imagePackagingUrl,
    p.imageNutritionUrl,
    p.imageIngredientsUrl,
  ].filter(Boolean);

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <TopBar showBack onBack={() => router.back()} title="Expirat" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ProductImages images={images} />

        <View>
          <Text style={styles.name}>{p.name}</Text>
          {p.brand ? <Text style={styles.brand}>{p.brand}</Text> : null}
          {p.quantity ? (
            <Text style={styles.detail}>Cantidad: {p.quantity}</Text>
          ) : null}
          <ExpandableText label="Ingredientes" text={p.ingredients} />
          <ExpandableText label="Categorias" text={p.categories} />
          {p.nutriscore ? (
            <Text style={styles.detail}>
              Nutriscore: {p.nutriscore.toUpperCase()}
            </Text>
          ) : null}
        </View>

        <NutritionTable
          nutriments={p.nutriments}
          servingSize={p.servingSize}
          servingsPerContainer={p.servingsPerContainer}
          servingQuantity={p.servingQuantity}
        />
      </ScrollView>

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.scanBtn,
            pressed && styles.scanBtnPressed,
          ]}
        >
          <SymbolView
            name={{ ios: "barcode.viewfinder", android: "barcode_scanner" }}
            size={22}
            weight="medium"
            tintColor="#fff"
          />
          <Text style={styles.scanBtnText}>Escanear otro</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  brand: { fontSize: 16, color: Colors.textSecondary, marginBottom: 12 },
  detail: { fontSize: 14, marginBottom: 6, lineHeight: 20 },

  bottomArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 14,
    borderCurve: "continuous",
    boxShadow: "0 4px 14px rgba(52, 168, 83, 0.35)",
  },
  scanBtnPressed: {
    opacity: 0.85,
  },
  scanBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  msg: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  code: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    fontFamily: "monospace",
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    borderCurve: "continuous",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  loadingContainer: { flex: 1, backgroundColor: Colors.background },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingMsg: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    fontWeight: "500",
  },
  cancelBtn: {
    alignSelf: "center",
    marginBottom: 40,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: Colors.surface,
  },
  cancelBtnText: { fontSize: 16, fontWeight: "600", color: Colors.text },
});
