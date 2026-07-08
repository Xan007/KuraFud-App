import { StyleSheet, Text, View } from "react-native";
import type { Nutriments } from "types";
import { Colors } from "@/constants/theme";
import { fmt, perServing, hasNutriments } from "@/helpers/format";

type RowProps = {
  label: string;
  col1: string | null;
  col2: string | null;
  indent?: 0 | 1 | 2;
};

function Row({ label, col1, col2, indent = 0 }: RowProps) {
  if (col2 == null) return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, indent > 0 && { paddingLeft: indent * 14 }]}>
        {label}
      </Text>
      <Text style={[styles.value, col1 == null && styles.full]}>
        {col1 ?? "-"}
      </Text>
      <Text style={[styles.value, styles.valueDim]}>{col2}</Text>
    </View>
  );
}

type Props = {
  nutriments: Nutriments;
  servingSize: string;
  servingsPerContainer: string | null;
  servingQuantity: number | null;
};

export default function NutritionTable({
  nutriments: n,
  servingSize,
  servingsPerContainer,
  servingQuantity: sq,
}: Props) {
  if (!hasNutriments(n)) return null;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Informacion nutricional</Text>
      {servingSize ? (
        <Text style={styles.serving}>Tamano de porcion: {servingSize}</Text>
      ) : null}
      {servingsPerContainer ? (
        <Text style={styles.serving}>
          Porciones por envase: {servingsPerContainer}
        </Text>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label} />
        {sq != null && <Text style={styles.value}>Por porcion</Text>}
        <Text style={[styles.value, styles.valueDim]}>Por 100g</Text>
      </View>

      <Row
        label="Calorias (kcal)"
        col1={
          sq != null && n.energyKcal100g != null
            ? fmt(perServing(n.energyKcal100g, sq))
            : null
        }
        col2={fmt(n.energyKcal100g)}
      />

      <Row
        label="Grasa total (g)"
        col1={
          sq != null && n.fat100g != null
            ? fmt(perServing(n.fat100g, sq))
            : null
        }
        col2={fmt(n.fat100g)}
      />
      <Row
        label="Grasa saturada (g)"
        indent={1}
        col1={
          sq != null && n.saturatedFat100g != null
            ? fmt(perServing(n.saturatedFat100g, sq))
            : null
        }
        col2={fmt(n.saturatedFat100g)}
      />
      <Row
        label="Grasa trans (g)"
        indent={1}
        col1={
          sq != null && n.transFat100g != null
            ? fmt(perServing(n.transFat100g, sq))
            : null
        }
        col2={fmt(n.transFat100g)}
      />

      <Row
        label="Carbohidratos totales (g)"
        col1={
          sq != null && n.carbohydrates100g != null
            ? fmt(perServing(n.carbohydrates100g, sq))
            : null
        }
        col2={fmt(n.carbohydrates100g)}
      />
      <Row
        label="Fibra dietaria (g)"
        indent={1}
        col1={
          sq != null && n.fiber100g != null
            ? fmt(perServing(n.fiber100g, sq))
            : null
        }
        col2={fmt(n.fiber100g)}
      />
      <Row
        label="Azucares totales (g)"
        indent={1}
        col1={
          sq != null && n.sugars100g != null
            ? fmt(perServing(n.sugars100g, sq))
            : null
        }
        col2={fmt(n.sugars100g)}
      />
      <Row
        label="Azucares anadidos (g)"
        indent={2}
        col1={
          sq != null && n.addedSugars100g != null
            ? fmt(perServing(n.addedSugars100g, sq))
            : null
        }
        col2={fmt(n.addedSugars100g)}
      />

      <Row
        label="Proteina (g)"
        col1={
          sq != null && n.proteins100g != null
            ? fmt(perServing(n.proteins100g, sq))
            : null
        }
        col2={fmt(n.proteins100g)}
      />

      {n.sodium100g != null && (
        <Row
          label="Sodio (mg)"
          col1={sq != null ? fmt(perServing(n.sodium100g, sq) * 1000) : null}
          col2={fmt(n.sodium100g * 1000)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
    borderCurve: "continuous",
  },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  serving: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  label: { fontSize: 14, flex: 2 },
  value: { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
  valueDim: { color: Colors.textSecondary },
  full: { flex: 2 },
});
