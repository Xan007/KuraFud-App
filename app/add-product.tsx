import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EditUnitSheet } from "@/components/EditUnitSheet";
import {
  productRepository,
  inventoryRepository,
} from "@/db/repositories";
import type { ProductWithInventory } from "@/db/schema";
import { showToast } from "@/helpers/toast";
import {
  lookupProductOrNull,
  searchProducts,
} from "@/services/productService";
import type { ProductSearchHit } from "types";
import { isManualBarcode } from "@/helpers/manualProduct";
import { formatDateString } from "@/helpers/format";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { SearchLoadingTips } from "@/components/SearchLoadingTips";
import { CannonConfetti } from "react-native-fast-confetti";
import * as Haptics from "expo-haptics";

type Phase =
  | "choose"
  | "select-existing"
  | "search-off"
  | "new-product-form"
  | "add-dates";

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useAppTranslation();

  const [phase, setPhase] = useState<Phase>("choose");


  const [allProducts, setAllProducts] = useState<ProductWithInventory[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");


  const OFF_PAGE_SIZE = 20;
  const [offQuery, setOffQuery] = useState("");
  const [offHits, setOffHits] = useState<ProductSearchHit[]>([]);
  const [offStatus, setOffStatus] = useState<"idle" | "searching" | "ok" | "offline">("idle");
  const [offPage, setOffPage] = useState(1);
  const [offHasMore, setOffHasMore] = useState(true);
  const [offLoadingMore, setOffLoadingMore] = useState(false);


  const [selectedProduct, setSelectedProduct] = useState<{
    barcode: string;
    name: string;
    brand: string;
    imageUrl: string;
  } | null>(null);


  const [pickingBarcode, setPickingBarcode] = useState<string | null>(null);
  const pickingRef = useRef<AbortController | null>(null);


  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState<string | null>(null);


  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const [showEditDateSheet, setShowEditDateSheet] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDate, setEditDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const [confettiVisible, setConfettiVisible] = useState(false);


  useEffect(() => {
    if (!confettiVisible) return;
    const t = setTimeout(() => setConfettiVisible(false), 3200);
    return () => clearTimeout(t);
  }, [confettiVisible]);

  useEffect(() => {
    if (phase === "select-existing") {
      setLoadingProducts(true);
      productRepository
        .getOwnedProducts()
        .then(setAllProducts)
        .catch(() => showToast(t("common.error")))
        .finally(() => setLoadingProducts(false));
    }
  }, [phase, t]);

  const filteredProducts = allProducts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      p.barcode.toLowerCase().includes(q)
    );
  });


  const { activeProducts, historyProducts } = (() => {
    const active: typeof filteredProducts = [];
    const history: typeof filteredProducts = [];
    for (const p of filteredProducts) {
      if (p.inventory.length > 0) {
        active.push(p);
      } else {
        history.push(p);
      }
    }
    return { activeProducts: active, historyProducts: history };
  })();


  const lastSearchedQueryRef = useRef<string>("");
  useEffect(() => {
    if (phase !== "search-off") return;
    const q = offQuery.trim();
    if (q.length < 2) {
      lastSearchedQueryRef.current = "";
      setOffHits([]);
      setOffStatus("idle");
      setOffPage(1);
      setOffHasMore(false);
      return;
    }


    if (q === lastSearchedQueryRef.current && offStatus === "ok") {
      return;
    }

    setOffStatus("searching");
    setOffHits([]);
    setOffPage(1);
    let cancelled = false;
    const id = setTimeout(async () => {
      const result = await searchProducts(q, { pageSize: OFF_PAGE_SIZE, page: 1 });
      if (cancelled) return;
      if (result.kind === "ok") {
        lastSearchedQueryRef.current = q;
        setOffHits(result.hits);
        const total = result.totalCount ?? result.hits.length;
        setOffHasMore(result.hits.length < total && result.hits.length >= OFF_PAGE_SIZE);
        setOffPage(2);
        setOffStatus("ok");
      } else {
        setOffHits([]);
        setOffStatus("offline");
        setOffHasMore(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [offQuery, phase, offStatus]);


  const handleLoadMore = useCallback(async () => {
    if (offLoadingMore || !offHasMore || offStatus !== "ok") return;
    const q = offQuery.trim();
    if (q.length < 2) return;

    setOffLoadingMore(true);
    try {
      const result = await searchProducts(q, { pageSize: OFF_PAGE_SIZE, page: offPage });
      if (result.kind === "ok") {
        setOffHits((prev) => {
          const seen = new Set(prev.map((h) => h.barcode));
          const merged = [...prev, ...result.hits.filter((h) => !seen.has(h.barcode))];
          return merged;
        });
        setOffHasMore(result.hits.length >= OFF_PAGE_SIZE);
        setOffPage((p) => p + 1);
      } else {
        setOffHasMore(false);
      }
    } catch {
      setOffHasMore(false);
    } finally {
      setOffLoadingMore(false);
    }
  }, [offLoadingMore, offHasMore, offStatus, offQuery, offPage]);


  const [datesOrigin, setDatesOrigin] = useState<Phase>("choose");

  const handlePickExisting = (product: ProductWithInventory) => {
    setSelectedProduct({
      barcode: product.barcode,
      name: product.name || t("product.title"),
      brand: product.brand || "",
      imageUrl: product.imageFrontUrl || "",
    });
    setPendingDates([]);
    setDatesOrigin("select-existing");
    setPhase("add-dates");
  };

  const handlePickOffHit = (hit: ProductSearchHit) => {

    if (pickingRef.current) {
      pickingRef.current.abort();
    }
    const controller = new AbortController();
    pickingRef.current = controller;
    setPickingBarcode(hit.barcode);


    setSelectedProduct({
      barcode: hit.barcode,
      name: hit.name || t("product.title"),
      brand: hit.brand,
      imageUrl: hit.imageUrl || "",
    });
    setPendingDates([]);
    setDatesOrigin("search-off");
    setPhase("add-dates");


    lookupProductOrNull(hit.barcode)
      .catch(() => null)
      .finally(() => {
        if (!controller.signal.aborted) {
          setPickingBarcode((current) =>
            current === hit.barcode ? null : current,
          );
        }
      });
  };

  const handleNewProductContinue = () => {
    if (!newName.trim()) {
      showToast(t("addProduct.nameRequired"));
      return;
    }
    setPendingDates([]);
    setDatesOrigin("new-product-form");
    setPhase("add-dates");
  };

  const handlePickPhoto = async () => {
    try {
      const ImagePicker = await import("expo-image-picker");
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast(t("addProduct.galleryPermission"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        setNewPhoto(result.assets[0].uri);
      }
    } catch {
      showToast(t("addProduct.galleryRebuild"));
    }
  };

  const handleAddDate = () => {
    setEditDate(new Date());
    setEditingIndex(null);
    setShowEditDateSheet(true);
  };

  const handleTapDate = (index: number) => {
    const parts = pendingDates[index].split("/");
    setEditDate(new Date(Date.UTC(+parts[2], +parts[1] - 1, +parts[0])));
    setEditingIndex(index);
    setShowEditDateSheet(true);
  };

  const handleDateConfirm = (date: Date) => {
    const formatted = formatDateString(date);
    setPendingDates((prev) => {
      if (editingIndex !== null) {
        const next = [...prev];
        next[editingIndex] = formatted;
        return next;
      }
      return [...prev, formatted];
    });
    setShowEditDateSheet(false);
  };

  const handleRemoveDate = (index: number) => {
    setPendingDates((prev) => prev.filter((_, i) => i !== index));
  };

  const resetAll = () => {
    setPendingDates([]);
    setShowEditDateSheet(false);
    setEditingIndex(null);
    setSelectedProduct(null);
    setPickingBarcode(null);
    if (pickingRef.current) pickingRef.current.abort();
    setNewName("");
    setNewPhoto(null);
    setSearchQuery("");
    setOffQuery("");
    setOffHits([]);
    setOffStatus("idle");
    lastSearchedQueryRef.current = "";
    setDatesOrigin("choose");
    setPhase("choose");
  };


  const resetSelectionKeepSearch = () => {
    setPendingDates([]);
    setShowEditDateSheet(false);
    setEditingIndex(null);
    setSelectedProduct(null);
    setPickingBarcode(null);
    if (pickingRef.current) pickingRef.current.abort();
    setNewName("");
    setNewPhoto(null);
    setDatesOrigin("choose");
  };

  const handleSave = async () => {
    if (pendingDates.length === 0) {
      showToast(t("addProduct.addAtLeastOneDate"));
      return;
    }

    setSaving(true);

    try {
      let barcode: string;

      if (selectedProduct) {

        barcode = selectedProduct.barcode;
        if (!isManualBarcode(barcode)) {

          try {
            const info = await lookupProductOrNull(barcode);
            if (info) {
              await productRepository.upsertProduct({
                barcode: info.barcode,
                name: info.name,
                brand: info.brand,
                quantity: info.quantity,
                ingredients: info.ingredients,
                imageFrontUrl: info.imageFrontUrl,
                categories: info.categories,
                nutriscore: info.nutriscore,
                dataJson: JSON.stringify(info),
                createdAt: new Date(),
              });
            }
          } catch {

          }
        }
      } else {

        barcode = `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await productRepository.upsertProduct({
          barcode,
          name: newName.trim(),
          brand: "",
          quantity: "",
          ingredients: "",
          imageFrontUrl: newPhoto || "",
          categories: "",
          nutriscore: "",
          createdAt: new Date(),
        });
      }

      for (const date of pendingDates) {
        await inventoryRepository.addInventoryItem({
          barcode,
          expirationDate: date,
          createdAt: new Date(),
        });
      }


      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const origin = datesOrigin;

      setConfettiVisible(true);
      resetSelectionKeepSearch();
      if (origin === "search-off") {
        setPhase("search-off");
      } else if (origin === "select-existing") {
        setPhase("select-existing");
      } else {
        setPhase("choose");
      }
      setSaving(false);
    } catch {
      showToast(t("addProduct.errorSaving"));
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (phase === "choose") {
      router.back();
    } else if (
      phase === "select-existing" ||
      phase === "new-product-form" ||
      phase === "search-off"
    ) {
      setPhase("choose");
    } else {

      setPhase(datesOrigin);
    }
  };


  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;


  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleBackRef.current();
        return true;
      },
    );
    return () => subscription.remove();
  }, []);

  const getTitle = () => {
    switch (phase) {
      case "choose":
        return t("addProduct.title");
      case "select-existing":
        return t("addProduct.selectProduct");
      case "search-off":
        return t("addProduct.searchOn");
      case "new-product-form":
        return t("addProduct.newProductForm");
      case "add-dates":
        return t("addProduct.addDates");
    }
  };

  const renderChoose = () => (
    <ScrollView
      contentContainerStyle={[styles.chooseContainer, { paddingBottom: insets.bottom + Spacing.lg }]}
    >
      <AppText variant="subheading" color={Colors.textSecondary} style={styles.chooseHeader}>
        {t("addProduct.choose")}
      </AppText>

      <ChooseCard
        icon={{ ios: "magnifyingglass", android: "search" }}
        title={t("addProduct.searchOn")}
        hint={t("addProduct.searchOnHint")}
        onPress={() => setPhase("search-off")}
      />
      <ChooseCard
        icon={{ ios: "arrow.triangle.swap", android: "swap_horiz" }}
        title={t("addProduct.existingProduct")}
        hint={t("addProduct.existingProductHint")}
        onPress={() => setPhase("select-existing")}
      />
      <ChooseCard
        icon={{ ios: "plus.square", android: "add_box" }}
        title={t("addProduct.newProduct")}
        hint={t("addProduct.newProductHint")}
        onPress={() => setPhase("new-product-form")}
      />
    </ScrollView>
  );

  const renderSelectExisting = () => {
    const sections: {
      title: string;
      data: ProductWithInventory[];
    }[] = [];


    if (activeProducts.length > 0) {
      sections.push({
        title: t("addProduct.activeInventorySection"),
        data: activeProducts,
      });
    }
    if (historyProducts.length > 0) {
      sections.push({
        title: t("addProduct.historyProductsSection"),
        data: historyProducts,
      });
    }

    const isEmpty =
      !loadingProducts &&
      activeProducts.length === 0 &&
      historyProducts.length === 0;

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <SymbolView
              name={{ ios: "magnifyingglass", android: "search" }}
              size={18}
              tintColor={Colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t("addProduct.searchLocalPlaceholder")}
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <SymbolView
                  name={{ ios: "xmark.circle.fill", android: "cancel" }}
                  size={18}
                  tintColor={Colors.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.barcode}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <AppText variant="label" color={Colors.textSecondary}>
                {title}
              </AppText>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.productRow, pressed && styles.rowPressed]}
              onPress={() => handlePickExisting(item)}
            >
              <View style={styles.productRowInfo}>
                <AppText variant="subheading" numberOfLines={1}>
                  {item.name || t("product.title")}
                </AppText>
                {item.brand ? (
                  <AppText variant="caption" color={Colors.textSecondary}>
                    {item.brand}
                  </AppText>
                ) : null}
              </View>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right" }}
                size={16}
                tintColor={Colors.textSecondary}
              />
            </Pressable>
          )}
          ListEmptyComponent={
            isEmpty ? (
              loadingProducts ? (
                <View style={styles.emptyContainer}>
                  <AppText variant="body" color={Colors.textSecondary}>
                    {t("addProduct.loadingProducts")}
                  </AppText>
                </View>
              ) : (
                <EmptyState
                  icon={
                    <SymbolView
                      name={{ ios: "tray", android: "inbox" }}
                      size={40}
                      tintColor={Colors.textSecondary}
                    />
                  }
                  title={searchQuery ? t("addProduct.noResults") : t("addProduct.noProducts")}
                  subtitle={
                    searchQuery
                      ? t("addProduct.noResultsHint")
                      : t("addProduct.noProductsHint")
                  }
                />
              )
            ) : null
          }
        />
      </View>
    );
  };

  const renderSearchOff = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search" }}
            size={18}
            tintColor={Colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t("addProduct.searchOffPlaceholder")}
            placeholderTextColor={Colors.textSecondary}
            value={offQuery}
            onChangeText={setOffQuery}
            returnKeyType="search"
          />
          {offQuery ? (
            <Pressable onPress={() => setOffQuery("")} hitSlop={8}>
              <SymbolView
                name={{ ios: "xmark.circle.fill", android: "cancel" }}
                size={18}
                tintColor={Colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={offHits}
        keyExtractor={(item) => item.barcode}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={renderOffEmpty()}
        ListFooterComponent={
          offLoadingMore ? (
            <View style={styles.loadMoreFooter}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <AppText variant="caption" color={Colors.textSecondary}>
                {t("addProduct.loadingMore")}
              </AppText>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isPicking = pickingBarcode === item.barcode;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.productRow,
                (pressed || isPicking) && styles.rowPressed,
              ]}
              onPress={() => handlePickOffHit(item)}
              disabled={!!pickingBarcode}
            >
              <View style={styles.offRowImageWrap}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.offRowImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.offRowPlaceholder}>
                    <SymbolView
                      name={{ ios: "photo", android: "image" }}
                      size={18}
                      tintColor={Colors.textSecondary}
                    />
                  </View>
                )}
              </View>
              <View style={styles.productRowInfo}>
                <AppText variant="subheading" numberOfLines={2}>
                  {item.name}
                </AppText>
                {item.brand ? (
                  <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
                    {item.brand}
                  </AppText>
                ) : null}
                <AppText variant="caption" color={Colors.textSecondary}>
                  {item.barcode}
                </AppText>
              </View>
              {isPicking ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <SymbolView
                  name={{ ios: "chevron.right", android: "chevron_right" }}
                  size={16}
                  tintColor={Colors.textSecondary}
                />
              )}
            </Pressable>
          );
        }}
      />

      <View style={[styles.bottomHint, { paddingBottom: insets.bottom + Spacing.md }]}>
        <AppText variant="caption" color={Colors.textSecondary}>
          {t("addProduct.existsPrompt")}
        </AppText>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => setPhase("select-existing")}
        >
          {t("addProduct.existingProduct")}
        </Button>
      </View>
    </View>
  );

  const renderOffEmpty = () => {
    if (offStatus === "idle") {
      return (
        <EmptyState
          icon={
            <SymbolView
              name={{ ios: "person.crop.circle.badge.questionmark", android: "person_search" }}
              size={44}
              tintColor={Colors.textSecondary}
            />
          }
          title={t("addProduct.searchOn")}
          subtitle={t("addProduct.searchOnHint")}
        />
      );
    }
    if (offStatus === "searching") {
      return <SearchLoadingTips />;
    }
    if (offStatus === "offline") {
      return (
        <EmptyState
          icon={
            <SymbolView
              name={{ ios: "wifi.slash", android: "wifi_off" }}
              size={40}
              tintColor={Colors.textSecondary}
            />
          }
          title={t("product.offline")}
          subtitle={t("addProduct.searchOffline")}
        />
      );
    }

    if (offQuery.trim().length < 2) {
      return (
        <EmptyState
          icon={
            <SymbolView
              name={{ ios: "keyboard", android: "keyboard" }}
              size={40}
              tintColor={Colors.textSecondary}
            />
          }
          title={t("addProduct.searchTooShort")}
        />
      );
    }
    return (
      <EmptyState
        icon={
          <SymbolView
            name={{ ios: "tray", android: "inbox" }}
            size={40}
            tintColor={Colors.textSecondary}
          />
        }
        title={t("addProduct.noResults")}
        subtitle={t("addProduct.noResultsHint")}
      />
    );
  };

  const renderNewProductForm = () => (
    <ScrollView
      contentContainerStyle={[
        styles.formContent,
        { paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.photoSection}>
        <Pressable
          style={({ pressed }) => [
            styles.photoButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handlePickPhoto}
        >
          {newPhoto ? (
            <Image
              source={{ uri: newPhoto }}
              style={styles.photoPreview}
              contentFit="cover"
              cachePolicy="none"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <SymbolView
                name={{ ios: "camera", android: "photo_camera" }}
                size={32}
                tintColor={Colors.textSecondary}
              />
              <AppText variant="caption" color={Colors.textSecondary}>
                {t("addProduct.addPhoto")}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      <AppText variant="label" color={Colors.textSecondary} style={styles.fieldLabel}>
        {t("addProduct.labelName")}
      </AppText>
      <TextInput
        style={styles.textInput}
        placeholder={t("addProduct.enterName")}
        placeholderTextColor={Colors.textSecondary}
        value={newName}
        onChangeText={setNewName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleNewProductContinue}
      />

      <View style={styles.formActions}>
        <Button variant="secondary" onPress={() => setPhase("choose")}>
          {t("addProduct.back")}
        </Button>
        <Button
          variant="primary"
          onPress={handleNewProductContinue}
          disabled={!newName.trim()}
          style={{ flex: 1 }}
        >
          {t("addProduct.continue")}
        </Button>
      </View>
    </ScrollView>
  );

  const renderAddDates = () => {
    const productName = selectedProduct?.name || newName.trim();
    const productImage = selectedProduct?.imageUrl || newPhoto;

    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.datesContent,
            { paddingBottom: insets.bottom + 130 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.productHeader}>
            <View style={styles.productHeaderImage}>
              {productImage ? (
                <Image
                  source={{ uri: productImage }}
                  style={styles.productThumb}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.productThumbPlaceholder}>
                  <SymbolView
                    name={{ ios: "photo", android: "image" }}
                    size={22}
                    tintColor={Colors.textSecondary}
                  />
                </View>
              )}
            </View>
            <View style={styles.productHeaderInfo}>
              <AppText variant="subheading" numberOfLines={2}>
                {productName}
              </AppText>
              {selectedProduct && selectedProduct.brand ? (
                <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
                  {selectedProduct.brand}
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.sectionDivider} />

          <AppText variant="label" color={Colors.textSecondary} style={styles.datesLabel}>
            {t("addProduct.labelDates")}
          </AppText>

          {pendingDates.length === 0 ? (
            <View style={styles.noDates}>
              <AppText variant="body" color={Colors.textSecondary}>
                {t("addProduct.noDatesYet")}
              </AppText>
            </View>
          ) : (
            pendingDates.map((date, index) => (
              <View key={index} style={styles.dateRow}>
                <Pressable
                  style={styles.dateRowContent}
                  onPress={() => handleTapDate(index)}
                >
                  <View style={styles.dateIcon}>
                    <SymbolView
                      name={{ ios: "calendar", android: "calendar_month" }}
                      size={18}
                      tintColor={Colors.primary}
                    />
                  </View>
                  <AppText variant="subheading" style={{ fontFamily: "monospace" }}>
                    {date}
                  </AppText>
                </Pressable>
                <Pressable onPress={() => handleRemoveDate(index)} hitSlop={12}>
                  <SymbolView
                    name={{ ios: "trash.fill", android: "delete" }}
                    size={18}
                    tintColor={Colors.error}
                  />
                </Pressable>
              </View>
            ))
          )}

          <Pressable
            style={({ pressed }) => [
              styles.addDateButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleAddDate}
          >
            <SymbolView
              name={{ ios: "plus.circle", android: "add_circle" }}
              size={20}
              tintColor={Colors.primary}
            />
            <AppText variant="subheading" color={Colors.primary}>
              {t("addProduct.addDate")}
            </AppText>
          </Pressable>
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
        >
          <Button
            variant="secondary"
            onPress={resetAll}
            style={{ flex: 1 }}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onPress={handleSave}
            disabled={pendingDates.length === 0 || saving}
            style={{ flex: 2 }}
          >
            {saving
              ? t("addProduct.saving")
              : t("addProduct.saveN", { count: pendingDates.length })}
          </Button>
        </View>

        <EditUnitSheet
          visible={showEditDateSheet}
          date={editDate}
          onChangeDate={setEditDate}
          onCancel={() => setShowEditDateSheet(false)}
          onConfirm={() => handleDateConfirm(editDate)}
          onDelete={() => {}}
          showDelete={false}
          confirmLabel={t("common.save")}
          cancelLabel={t("common.cancel")}
          sheetTitle=""
          deleteConfirmTitle=""
          deleteConfirmBody=""
          deleteConfirmLabel=""
          deleteCancelLabel=""
          labels={{
            day: t("product.labelDay"),
            month: t("product.labelMonth"),
            year: t("product.labelYear"),
          }}
          orderByLabel={t("product.selectOrderBy")}
          orderDmyLabel={t("product.orderDmy")}
          orderMdyLabel={t("product.orderMdy")}
          monthModeByLabel={t("product.selectMonthModeBy")}
          monthModeNumberLabel={t("product.monthModeNumber")}
          monthModeNameLabel={t("product.monthModeName")}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title={getTitle()} showBack onBack={handleBack} />
      {phase === "choose" && renderChoose()}
      {phase === "select-existing" && renderSelectExisting()}
      {phase === "search-off" && renderSearchOff()}
      {phase === "new-product-form" && renderNewProductForm()}
      {phase === "add-dates" && renderAddDates()}


      {confettiVisible ? (
        <CannonConfetti
          autoplay
          gravity={2}
          containerStyle={StyleSheet.absoluteFill}
        >
          <CannonConfetti.Origin
            position="bottom-left"
            count={80}
            initialSpeed={3}
          >
            <CannonConfetti.Flake size={12} radius={6} />
          </CannonConfetti.Origin>
          <CannonConfetti.Origin
            position="bottom-right"
            count={80}
            initialSpeed={3}
          >
            <CannonConfetti.Flake size={12} radius={6} />
          </CannonConfetti.Origin>
        </CannonConfetti>
      ) : null}
    </View>
  );
}



function ChooseCard({
  icon,
  title,
  hint,
  onPress,
}: {
  icon: { ios: string; android: string };
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chooseCard, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={[styles.chooseIcon, { backgroundColor: Colors.primary + "1A" }]}>
        <SymbolView name={icon as any} size={26} tintColor={Colors.primary} />
      </View>
      <View style={styles.chooseCardContent}>
        <AppText variant="subheading">{title}</AppText>
        <AppText variant="body" color={Colors.textSecondary}>
          {hint}
        </AppText>
      </View>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right" }}
        size={16}
        tintColor={Colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },


  chooseContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  chooseHeader: {
    marginBottom: Spacing.sm,
  },
  chooseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    gap: Spacing.lg,
  },
  cardPressed: {
    opacity: 0.7,
  },
  chooseIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  chooseCardContent: {
    flex: 1,
    gap: Spacing.xs,
  },


  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    backgroundColor: Colors.background,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  productRowInfo: {
    flex: 1,
    gap: 2,
  },
  offRowImageWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  offRowImage: {
    width: "100%",
    height: "100%",
  },
  offRowPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  bottomHint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  loadMoreFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },


  formContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  fieldLabel: {
    marginBottom: -Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  textInput: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },


  datesContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  productHeaderImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  productThumb: {
    width: "100%",
    height: "100%",
  },
  productThumbPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  productHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  datesLabel: {
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  noDates: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  dateRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dateIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
  },
  addDateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    borderCurve: "continuous",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
