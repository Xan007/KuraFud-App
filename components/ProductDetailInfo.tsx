import { memo, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import Animated, { FadeIn } from "react-native-reanimated";

import { Colors, Spacing, BorderRadius, withOpacity } from "@/constants/theme";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import ProductImages from "@/components/ProductImages";
import ExpandableText from "@/components/ExpandableText";
import NutritionTable from "@/components/NutritionTable";
import { lookupProduct } from "@/services/productService";
import i18n from "@/services/i18n";
import type { ProductInfo } from "types";
import { isManualBarcode } from "@/helpers/manualProduct";

type Lang = "es" | "en";

type LocalSnapshot = {
  name: string;
  brand: string;
  imageFrontUrl: string;
} | null | undefined;

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type Props = {
  barcode: string;
  localSnapshot?: LocalSnapshot;
  t: TFn;
};

type Status = "loading" | "found" | "not-found" | "offline";


export const ProductDetailInfo = memo(function ProductDetailInfo({
  barcode,
  localSnapshot,
  t,
}: Props) {
  if (isManualBarcode(barcode)) {
    return <ManualInfo localSnapshot={localSnapshot} t={t} />;
  }
  return <OffInfo barcode={barcode} localSnapshot={localSnapshot} t={t} />;
});



function ManualInfo({
  localSnapshot,
  t,
}: {
  localSnapshot: LocalSnapshot;
  t: TFn;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
    >
      <View style={styles.manualEmpty}>
        <SymbolView
          name={{ ios: "hand.raised.fill", android: "front_hand" }}
          size={40}
          tintColor={Colors.textSecondary}
        />
        <AppText variant="body" color={Colors.textSecondary}>
          {t("product.badgeManualLong")}
        </AppText>
      </View>

      {localSnapshot?.brand ? (
        <View style={styles.sectionCard}>
          <SectionLabel text={t("product.brand")} tone="primary" />
          <AppText variant="body" style={styles.sectionValue}>
            {localSnapshot.brand}
          </AppText>
        </View>
      ) : null}
    </ScrollView>
  );
}



function OffInfo({ barcode, t }: Props) {
  const insets = useSafeAreaInsets();
  const userLang: Lang = i18n.language === "en" ? "en" : "es";
  const [status, setStatus] = useState<Status>("loading");
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [displayLang, setDisplayLang] = useState<Lang>(userLang);

  useEffect(() => {
    let mounted = true;
    const MIN = 250;
    const start = Date.now();

    lookupProduct(barcode).then((result) => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN - elapsed);
      setTimeout(() => {
        if (!mounted) return;
        applyResult(result, setProduct, setDisplayLang, userLang, setStatus);
      }, remaining);
    });

    return () => {
      mounted = false;
    };
  }, [barcode, userLang]);

  const handleRetry = () => {
    setStatus("loading");
    setProduct(null);
    lookupProduct(barcode).then((result) => {
      applyResult(result, setProduct, setDisplayLang, userLang, setStatus);
    });
  };

  const handleTranslate = () => {
    if (!product) return;
    const target: Lang = displayLang === "es" ? "en" : "es";
    if (product.localizedNames && product.localizedNames[target]) {
      setDisplayLang(target);
    }
  };

  if (status === "loading") {
    return (
      <View style={styles.statusCenter}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <AppText
          variant="body"
          color={Colors.textSecondary}
          style={styles.statusMsg}
        >
          {t("product.searching")}
        </AppText>
      </View>
    );
  }

  if (status === "offline") {
    return (
      <View style={styles.statusCenter}>
        <SymbolView
          name={{ ios: "wifi.slash", android: "wifi_off" }}
          size={40}
          tintColor={Colors.textSecondary}
        />
        <AppText variant="subheading" style={styles.statusMsg}>
          {t("product.offline")}
        </AppText>
        <Button variant="secondary" size="sm" onPress={handleRetry}>
          {t("common.retry")}
        </Button>
      </View>
    );
  }

  if (status === "not-found") {
    return (
      <View style={styles.statusCenter}>
        <SymbolView
          name={{ ios: "questionmark.circle", android: "help_outline" }}
          size={40}
          tintColor={Colors.textSecondary}
        />
        <AppText
          variant="body"
          color={Colors.textSecondary}
          style={styles.statusMsg}
        >
          {t("product.notFound")}
        </AppText>
        <Pressable
          style={styles.linkBtn}
          onPress={() =>
            Linking.openURL(
              `https://world.openfoodfacts.org/product/${barcode}`,
            ).catch(() => {})
          }
        >
          <AppText variant="button" color={Colors.primary}>
            Open Food Facts
          </AppText>
        </Pressable>
      </View>
    );
  }

  const p = product!;
  const imageLabels = [
    t("product.imageFront"),
    t("product.imageBack"),
    t("product.imagePackaging"),
    t("product.imageNutrition"),
    t("product.imageIngredients"),
  ];
  const images = [
    { url: p.imageFrontUrl, label: imageLabels[0] },
    { url: p.imageBackUrl, label: imageLabels[1] },
    { url: p.imagePackagingUrl, label: imageLabels[2] },
    { url: p.imageNutritionUrl, label: imageLabels[3] },
    { url: p.imageIngredientsUrl, label: imageLabels[4] },
  ].filter((img) => Boolean(img.url));

  const loc = p.localizedNames || {};
  const locIng = p.localizedIngredients || {};
  const displayName = loc[displayLang] || p.name;
  const displayIngredients = locIng[displayLang] || p.ingredients;

  const langName = (code: string) => {
    const key = `product.languageSource_${code}`;
    const v = t(key);
    return v === key ? code.toUpperCase() : v;
  };

  const alternateLang: Lang = displayLang === "es" ? "en" : "es";
  const alternateAvailable = !!loc[alternateLang];
  const showingTranslated = displayLang !== userLang && !!loc[displayLang];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
    >
      <Animated.View entering={FadeIn}>
        {images.length > 0 ? (
          <ProductImages
            images={images.map((i) => i.url)}
            labels={images.map((i) => i.label)}
          />
        ) : null}


        {p.genericName ? (
          <View style={styles.descriptionWrap}>
            <AppText variant="body" color={Colors.textSecondary}>
              {p.genericName}
            </AppText>
          </View>
        ) : null}


        <View style={styles.translateRow}>
          {alternateAvailable ? (
            <Pressable
              style={styles.translatePill}
              onPress={handleTranslate}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("product.translateButton", {
                lang: langName(alternateLang),
              })}
            >
              <SymbolView
                name={{ ios: "globe", android: "public" }}
                size={16}
                tintColor={Colors.primary}
              />
              <AppText variant="button" color={Colors.primary}>
                {showingTranslated
                  ? langName(displayLang)
                  : langName(alternateLang)}
              </AppText>
            </Pressable>
          ) : null}
          {showingTranslated ? (
            <AppText variant="caption" color={Colors.textSecondary}>
              {t("product.translateButton", { lang: langName(displayLang) })}
            </AppText>
          ) : null}
        </View>


        <View style={styles.scoresRow}>
          {p.nutriscore ? (
            <ScoreBadge
              label="Nutri-Score"
              value={p.nutriscore.toUpperCase()}
              colors={nutriScoreColor(p.nutriscore)}
            />
          ) : null}
          {p.ecoscore ? (
            <ScoreBadge
              label="Eco-Score"
              value={p.ecoscore.toUpperCase()}
              colors={ecoScoreColor(p.ecoscore)}
            />
          ) : null}
          {p.novaGroup != null ? (
            <ScoreBadge
              label="NOVA"
              value={String(p.novaGroup)}
              colors={novaColor(p.novaGroup)}
            />
          ) : null}
        </View>


        {p.quantity ? (
          <View style={[styles.sectionCard, { backgroundColor: withOpacity(Colors.primary, 0.06) }]}>
            <SectionLabel text={t("product.quantity")} tone="primary" />
            <AppText variant="subheading" style={styles.sectionValue}>
              {p.quantity}
            </AppText>
          </View>
        ) : null}


        {p.labels ? (
          <View style={[styles.sectionCard, { backgroundColor: withOpacity("#3B82F6", 0.08) }]}>
            <SectionLabel text={t("product.labels")} tone="info" />
            <ExpandableText label="" text={p.labels} />
          </View>
        ) : null}


        {p.conservationConditions ? (
          <View style={[styles.sectionCard, { backgroundColor: withOpacity("#8B5CF6", 0.08) }]}>
            <SectionLabel text={t("product.conservation")} tone="violet" />
            <ExpandableText label="" text={p.conservationConditions} />
          </View>
        ) : null}


        {p.allergens ? (
          <View style={[styles.sectionCard, styles.sectionError]}>
            <SectionLabel text={t("product.allergens")} tone="error" />
            <ExpandableText label="" text={p.allergens} />
          </View>
        ) : null}


        {p.traces ? (
          <View style={[styles.sectionCard, styles.sectionWarning]}>
            <SectionLabel text={t("product.traces")} tone="warning" />
            <ExpandableText label="" text={p.traces} />
          </View>
        ) : null}


        {displayIngredients ? (
          <View style={styles.sectionCard}>
            <SectionLabel text={t("product.ingredients")} tone="neutral" />
            <ExpandableText label="" text={displayIngredients} />
          </View>
        ) : null}


        {p.categories ? (
          <View style={styles.sectionCard}>
            <SectionLabel text={t("product.categories")} tone="neutral" />
            <ExpandableText label="" text={p.categories} />
          </View>
        ) : null}


        <NutritionTable
          nutriments={p.nutriments}
          servingSize={p.servingSize}
          servingsPerContainer={p.servingsPerContainer}
          servingQuantity={p.servingQuantity}
        />
      </Animated.View>
    </ScrollView>
  );
}

function applyResult(
  result: Awaited<ReturnType<typeof lookupProduct>>,
  setProduct: (p: ProductInfo | null) => void,
  setDisplayLang: (l: Lang) => void,
  userLang: Lang,
  setStatus: (s: Status) => void,
) {
  if (result.kind === "found") {
    setProduct(result.product);
    const langs = result.product.availableLanguages;
    const pick =
      langs.includes(userLang)
        ? userLang
        : langs.includes("en")
          ? "en"
          : langs.includes("es")
            ? "es"
            : sourceLangToTwo(result.product.sourceLanguage);
    setDisplayLang(pick);
    setStatus("found");
  } else if (result.kind === "offline") {
    setStatus("offline");
  } else {
    setStatus("not-found");
  }
}

function sourceLangToTwo(lang: string): Lang {
  return lang === "en" || lang === "es" ? lang : "en";
}



type Tone = "primary" | "info" | "violet" | "error" | "warning" | "neutral";

const TONE_COLORS: Record<Tone, string> = {
  primary: Colors.primary,
  info: "#3B82F6",
  violet: "#8B5CF6",
  error: Colors.error,
  warning: Colors.warning,
  neutral: Colors.textSecondary,
};

function SectionLabel({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: Tone;
}) {
  return (
    <View style={[styles.sectionLabelWrap, { backgroundColor: TONE_COLORS[tone] }]}>
      <AppText
        variant="label"
        color={tone === "neutral" ? Colors.white : "#fff"}
      >
        {text}
      </AppText>
    </View>
  );
}

type ScoreColors = { bg: string; fg: string };

function nutriScoreColor(grade: string): ScoreColors {
  switch (grade.toLowerCase()) {
    case "a":
      return { bg: "#22A35A", fg: "#fff" };
    case "b":
      return { bg: "#85C267", fg: "#fff" };
    case "c":
      return { bg: "#FFC937", fg: "#1B1B1B" };
    case "d":
      return { bg: "#EE8A2A", fg: "#fff" };
    case "e":
      return { bg: "#E53935", fg: "#fff" };
    default:
      return { bg: Colors.surface, fg: Colors.text };
  }
}

function ecoScoreColor(grade: string): ScoreColors {
  switch (grade.toLowerCase()) {
    case "a":
      return { bg: "#1B873F", fg: "#fff" };
    case "b":
      return { bg: "#5FA854", fg: "#fff" };
    case "c":
      return { bg: "#FFC937", fg: "#1B1B1B" };
    case "d":
      return { bg: "#EE8A2A", fg: "#fff" };
    case "e":
      return { bg: "#E53935", fg: "#fff" };
    default:
      return { bg: Colors.surface, fg: Colors.text };
  }
}

function novaColor(group: number): ScoreColors {
  switch (group) {
    case 1:
      return { bg: "#22A35A", fg: "#fff" };
    case 2:
      return { bg: "#85C267", fg: "#fff" };
    case 3:
      return { bg: "#FFC937", fg: "#1B1B1B" };
    case 4:
      return { bg: "#E53935", fg: "#fff" };
    default:
      return { bg: Colors.surface, fg: Colors.text };
  }
}

function ScoreBadge({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ScoreColors;
}) {
  return (
    <View
      style={[
        styles.scoreBadge,
        { backgroundColor: colors.bg },
      ]}
    >
      <AppText variant="caption" color={colors.fg} style={{ opacity: 0.85 }}>
        {label}
      </AppText>
      <AppText variant="title" color={colors.fg} style={styles.scoreValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  statusCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  statusMsg: { textAlign: "center" },
  linkBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  manualEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  descriptionWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  translateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  translatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.pill,
    backgroundColor: withOpacity(Colors.primary, 0.1),
  },
  scoresRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    flexWrap: "wrap",
    marginBottom: Spacing.md,
  },
  scoreBadge: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    gap: 2,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  sectionCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  sectionError: {
    backgroundColor: withOpacity(Colors.error, 0.08),
  },
  sectionWarning: {
    backgroundColor: withOpacity(Colors.warning, 0.1),
  },
  sectionLabelWrap: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  sectionValue: {
    marginTop: 4,
  },
});

export default ProductDetailInfo;
