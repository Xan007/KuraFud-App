import { useCallback, useRef, useState } from "react";
import { scanSessionRepository } from "@/db/repositories";
import { scanSession } from "@/db/schema";
import { emptyProduct } from "types";
import type { SessionItem } from "@/components/ScanSessionSheet";

type ScanSessionUpdatePatch = Partial<
  Omit<typeof scanSession.$inferInsert, "id">
>;


export function useScanSessionStore() {
  const [items, setItems] = useState<SessionItem[]>([]);
  const keyToDbIdRef = useRef<Map<string, number>>(new Map());
  const keyCounterRef = useRef(0);

  const loadPersisted = useCallback(async () => {
    const rows = await scanSessionRepository.loadSession();
    if (rows.length === 0) return;
    const map = new Map<string, number>();
    const loaded: SessionItem[] = rows.map((row) => {
      const key = String(row.id);
      map.set(key, row.id);
      return {
        key,
        barcode: row.barcode,
        product: row.productJson
          ? JSON.parse(row.productJson)
          : { ...emptyProduct, barcode: row.barcode },
        date: row.date ?? undefined,
        datePhotoUri: row.datePhotoUri ?? undefined,
      };
    });
    keyToDbIdRef.current = map;
    setItems(loaded);
    keyCounterRef.current =
      Math.max(...loaded.map((i) => parseInt(i.key, 10)), 0) + 1;
  }, []);

  const nextKey = useCallback(() => {
    return String(keyCounterRef.current++);
  }, []);

  const persistNewItem = useCallback(
    async (item: SessionItem) => {
      const dbId = await scanSessionRepository.insertItem({
        barcode: item.barcode,
        productJson: JSON.stringify(item.product),
        date: item.date,
        datePhotoUri: item.datePhotoUri,
        createdAt: new Date(),
      });
      keyToDbIdRef.current.set(item.key, dbId);
      return dbId;
    },
    [],
  );

  const persistUpdate = useCallback(
    async (key: string, patch: ScanSessionUpdatePatch) => {
      const dbId = keyToDbIdRef.current.get(key);
      if (dbId == null) return;
      await scanSessionRepository.updateItem(dbId, patch);
    },
    [],
  );

  const persistDelete = useCallback(async (key: string) => {
    const dbId = keyToDbIdRef.current.get(key);
    if (dbId != null) {
      await scanSessionRepository.deleteItem(dbId);
      keyToDbIdRef.current.delete(key);
    }
  }, []);

  const clearAll = useCallback(async () => {
    await scanSessionRepository.clearSession();
    keyToDbIdRef.current.clear();
  }, []);

  return {
    items,
    setItems,
    loadPersisted,
    nextKey,
    persistNewItem,
    persistUpdate,
    persistDelete,
    clearAll,
    keyToDbIdRef,
  };
}
