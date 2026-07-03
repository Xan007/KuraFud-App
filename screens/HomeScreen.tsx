import { useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Spacing, Colors } from "@/constants/theme";
import TopBar from "components/TopBar";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { getAllProducts, type ProductWithInventory } from "db/repository";

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      getAllProducts()
        .then((data) => {
          if (mounted) setProducts(data);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <View style={{ width, height }}>
      <TopBar title="Expirat" />

      {products.length === 0 && !loading ? (
        <View style={styles.body}>
          <SymbolView
            name={{ ios: "barcode.viewfinder", android: "barcode_scanner" }}
            size={48}
            tintColor={Colors.textSecondary}
          />
          <Text style={styles.subtitle}>
            Escanea codigos de barras de alimentos
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => router.push("/scanner")}
          >
            <Text style={styles.buttonText}>Escanear codigo de barras</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.barcode}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Tus productos</Text>
              <Pressable
                style={styles.addBtn}
                onPress={() => router.push("/scanner")}
              >
                <SymbolView
                  name={{ ios: "plus", android: "add" }}
                  size={18}
                  tintColor="#fff"
                />
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/product/${item.barcode}`)}
            >
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name || "Producto"}
                </Text>
                <Text style={styles.cardBarcode}>{item.barcode}</Text>
                {item.inventory.length > 0 && (
                  <View style={styles.expirationList}>
                    {item.inventory.map((inv) => (
                      <Text key={inv.id} style={styles.expirationItem}>
                        Vence: {inv.expirationDate}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right" }}
                size={16}
                tintColor={Colors.textSecondary}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: 16,
  },
  subtitle: {
    fontSize: 20,
    textAlign: "center",
    color: "#666",
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderCurve: "continuous",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    paddingBottom: 32,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderCurve: "continuous",
    gap: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  cardBarcode: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  expirationList: {
    marginTop: 4,
    gap: 2,
  },
  expirationItem: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
