import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testConnection } from '../config/firebase';
import {
  CatalogItem,
  mergeCatalogForStorefront,
  normalizeCatalogItem,
} from './catalogHelpers';
import { SEED_ALL_ITEMS } from './seedCatalog';

export const CACHE_STORAGE_KEY = 'cg.catalog.cache.v1';
export const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export interface PublicCatalogResult {
  products: CatalogItem[];
  builderParts: CatalogItem[];
  usedFallback: boolean;
  fromCache: boolean;
  fetchedAt: number;
}

interface StoredCachePayload {
  fetchedAt: number;
  products: CatalogItem[];
  builderParts: CatalogItem[];
  usedFallback: boolean;
}

let memoryCache: PublicCatalogResult | null = null;
let inflightPromise: Promise<PublicCatalogResult> | null = null;

export function isCacheFresh(fetchedAt: number, now = Date.now()): boolean {
  return Number.isFinite(fetchedAt) && now - fetchedAt >= 0 && now - fetchedAt < CACHE_TTL_MS;
}

export function readCachedCatalog(now = Date.now()): PublicCatalogResult | null {
  if (memoryCache && isCacheFresh(memoryCache.fetchedAt, now)) {
    return { ...memoryCache, fromCache: true };
  }
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCachePayload;
    if (!parsed || !isCacheFresh(parsed.fetchedAt, now) || !Array.isArray(parsed.products)) {
      return null;
    }
    const hydrated: PublicCatalogResult = {
      products: parsed.products.map((i) => normalizeCatalogItem(i)),
      builderParts: (parsed.builderParts || []).map((i) => normalizeCatalogItem(i)),
      usedFallback: Boolean(parsed.usedFallback),
      fromCache: true,
      fetchedAt: parsed.fetchedAt,
    };
    memoryCache = hydrated;
    return hydrated;
  } catch {
    return null;
  }
}

export function writeCachedCatalog(result: PublicCatalogResult): void {
  memoryCache = result;
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: StoredCachePayload = {
      fetchedAt: result.fetchedAt,
      products: result.products,
      builderParts: result.builderParts,
      usedFallback: result.usedFallback,
    };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore private-mode / quota errors
  }
}

export function clearCatalogCache(): void {
  memoryCache = null;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(CACHE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Single-fetch public catalog read (no live onSnapshot listeners on public pages).
 * Caches in memory and localStorage for 2 minutes and falls back cleanly to bundled sample data.
 */
export async function fetchPublicCatalog(
  forceRefresh = false,
  fallbackItems: CatalogItem[] = SEED_ALL_ITEMS
): Promise<PublicCatalogResult> {
  if (!forceRefresh) {
    const cached = readCachedCatalog();
    if (cached) return cached;
  }

  if (inflightPromise && !forceRefresh) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      await testConnection();

      let remoteProducts: CatalogItem[] = [];
      let remoteParts: CatalogItem[] = [];

      try {
        const snap = await getDocs(collection(db, 'products'));
        remoteProducts = snap.docs.map((d) => normalizeCatalogItem({ ...d.data(), id: d.id }));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }

      try {
        const snap = await getDocs(collection(db, 'builderParts'));
        remoteParts = snap.docs.map((d) => normalizeCatalogItem({ ...d.data(), id: d.id }));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'builderParts');
      }

      const merged = mergeCatalogForStorefront(remoteProducts, remoteParts, fallbackItems);
      const result: PublicCatalogResult = {
        products: merged.products,
        builderParts: merged.builderParts,
        usedFallback: merged.usedFallback,
        fromCache: false,
        fetchedAt: Date.now(),
      };
      writeCachedCatalog(result);
      return result;
    } catch (err) {
      console.warn('[catalog] Falling back to bundled sample catalog:', err);
      const fallback = mergeCatalogForStorefront([], [], fallbackItems);
      const result: PublicCatalogResult = {
        products: fallback.products,
        builderParts: fallback.builderParts,
        usedFallback: true,
        fromCache: false,
        fetchedAt: Date.now(),
      };
      return result;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}
