import { clearCatalogCache, fetchPublicCatalog, readCachedCatalog } from './api';
import {
  CatalogItem,
  buildCatalogSearchText,
  normalizeCatalogItem,
} from './catalogHelpers';

interface PcsGlobal {
  products: CatalogItem[];
  _seedProducts?: CatalogItem[];
  _builderParts?: CatalogItem[];
  byId: Record<string, CatalogItem>;
  catById: Record<string, { id: string; label: string; group: string; icon: string; kw: string }>;
  useById: Record<string, { id: string; label: string; hue: string; text: string; icon: string; blurb: string }>;
  brands: string[];
  store?: {
    reload?: () => void;
  };
  api?: {
    fetchCatalog: typeof fetchPublicCatalog;
    clearCache: typeof clearCatalogCache;
    getBuilderParts: () => CatalogItem[];
  };
  catalogReady?: Promise<void>;
  onCatalogUpdate?: (cb: () => void) => void;
  _catalogListeners?: Array<() => void>;
}

declare global {
  interface Window {
    PCS: PcsGlobal;
  }
}

(function bootstrapPublicDataBridge() {
  if (typeof window === 'undefined' || !window.PCS) return;
  const PCS = window.PCS;

  // Snapshot original bundled sample data once before any hydration mutates PCS.products
  if (!PCS._seedProducts) {
    PCS._seedProducts = (PCS.products || []).map((p) => normalizeCatalogItem(p));
  }

  const listeners: Array<() => void> = (PCS._catalogListeners = PCS._catalogListeners || []);

  function applyCatalogToPcs(products: CatalogItem[], builderParts: CatalogItem[]): void {
    // Mutate PCS.products in-place so existing closures (e.g. assistant-brain.js) see live items
    PCS.products.length = 0;
    products.forEach((raw) => {
      const item = normalizeCatalogItem(raw);
      item._hay = buildCatalogSearchText(item);
      PCS.products.push(item);
    });

    // Mutate PCS.byId in-place so compat.js / build.js / store.js references stay synchronized
    Object.keys(PCS.byId).forEach((k) => {
      delete PCS.byId[k];
    });
    PCS.products.forEach((p) => {
      PCS.byId[p.id] = p;
    });

    PCS._builderParts = builderParts.map((b) => normalizeCatalogItem(b));
    PCS._builderParts.forEach((b) => {
      if (!PCS.byId[b.id]) PCS.byId[b.id] = b;
    });

    PCS.brands = Object.keys(
      PCS.products.reduce<Record<string, number>>((acc, p) => {
        if (p.brand) acc[p.brand] = 1;
        return acc;
      }, {})
    ).sort();

    if (PCS.store && typeof PCS.store.reload === 'function') {
      PCS.store.reload();
    }
  }

  function notifyListeners(): void {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('[catalog-listener]', err);
      }
    });
  }

  PCS.onCatalogUpdate = (cb: () => void) => {
    if (typeof cb === 'function') {
      listeners.push(cb);
    }
  };

  PCS.api = {
    fetchCatalog: (forceRefresh = false) =>
      fetchPublicCatalog(forceRefresh, PCS._seedProducts || []),
    clearCache: clearCatalogCache,
    getBuilderParts: () => PCS._builderParts || [],
  };

  // Synchronous hydration if 2-minute cache is already fresh in localStorage
  const cached = readCachedCatalog();
  if (cached && cached.products.length) {
    applyCatalogToPcs(cached.products, cached.builderParts);
  }

  // Asynchronous single-fetch refresh from Firestore (respecting 2-minute cache TTL)
  PCS.catalogReady = fetchPublicCatalog(false, PCS._seedProducts || [])
    .then((res) => {
      if (!res.fromCache && res.products.length) {
        applyCatalogToPcs(res.products, res.builderParts);
        notifyListeners();
      }
    })
    .catch((err) => {
      console.warn('[catalog] Using fallback catalog:', err);
    });
})();
