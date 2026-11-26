export type BuilderSlotId =
  | 'cpu'
  | 'motherboard'
  | 'ram'
  | 'gpu'
  | 'ssd'
  | 'cooler'
  | 'psu'
  | 'case';

export interface PrebuiltParts {
  cpu?: string;
  gpu?: string;
  ram?: string;
  ssd?: string;
  psu?: string;
  case?: string;
  motherboard?: string;
  cooler?: string;
}

export interface CatalogItem {
  id: string;
  cat: string;
  subcategory?: string;
  brand: string;
  name: string;
  price: number;
  mrp: number;
  stock: boolean;
  visible: boolean;
  featured?: boolean;
  sortOrder?: number;
  specs: string[];
  tags: string[];
  use?: string;
  parts?: PrebuiltParts;
  description?: string;
  img?: string;
  images?: string[];
  socket?: string;
  ramType?: string;
  type?: string;
  form?: string;
  watt?: number;
  tdp?: number;
  igpu?: boolean;
  sockets?: string[];
  supports?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
  _hay?: string;
}

export interface CategoryMeta {
  id: string;
  label: string;
  group: 'systems' | 'parts' | 'gear' | 'office';
  icon: string;
  kw: string;
}

export interface UseMeta {
  id: 'gaming' | 'editing' | 'trading' | 'office';
  label: string;
  hue: string;
  text: string;
  icon: string;
  blurb: string;
}

export const GROUPS = [
  { id: 'systems', label: 'PCs and laptops' },
  { id: 'parts', label: 'Components' },
  { id: 'gear', label: 'Peripherals' },
  { id: 'office', label: 'Office and security' },
] as const;

export const CATEGORIES: CategoryMeta[] = [
  { id: 'prebuilt', label: 'Prebuilt PCs', group: 'systems', icon: 'tower', kw: 'pc computer desktop' },
  { id: 'laptop', label: 'Laptops', group: 'systems', icon: 'laptop', kw: 'notebook' },
  { id: 'cpu', label: 'Processors', group: 'parts', icon: 'cpu', kw: 'cpu ryzen core intel amd' },
  { id: 'motherboard', label: 'Motherboards', group: 'parts', icon: 'board', kw: 'mobo board' },
  { id: 'ram', label: 'Memory (RAM)', group: 'parts', icon: 'ram', kw: 'ram ddr4 ddr5 memory' },
  { id: 'gpu', label: 'Graphics cards', group: 'parts', icon: 'gpu', kw: 'gpu video geforce radeon rtx nvidia' },
  { id: 'ssd', label: 'SSD and storage', group: 'parts', icon: 'ssd', kw: 'ssd nvme hdd hard disk drive' },
  { id: 'cooler', label: 'CPU coolers', group: 'parts', icon: 'fan', kw: 'cooler fan aio liquid heatsink' },
  { id: 'case', label: 'Cabinets', group: 'parts', icon: 'case', kw: 'case cabinet chassis' },
  { id: 'psu', label: 'Power supplies', group: 'parts', icon: 'psu', kw: 'psu smps power supply' },
  { id: 'monitor', label: 'Monitors', group: 'gear', icon: 'monitor', kw: 'display screen' },
  { id: 'keyboard', label: 'Keyboards', group: 'gear', icon: 'keyboard', kw: 'keyboard mechanical' },
  { id: 'mouse', label: 'Mice', group: 'gear', icon: 'mouse', kw: 'mouse' },
  { id: 'headset', label: 'Headsets', group: 'gear', icon: 'headset', kw: 'headphone headphones' },
  { id: 'speaker', label: 'Speakers', group: 'gear', icon: 'speaker', kw: 'speaker soundbar audio' },
  { id: 'gamepad', label: 'Controllers', group: 'gear', icon: 'gamepad', kw: 'gamepad joystick' },
  { id: 'ups', label: 'UPS', group: 'office', icon: 'ups', kw: 'ups battery backup inverter' },
  { id: 'printer', label: 'Printers', group: 'office', icon: 'printer', kw: 'printer inkjet laser' },
  { id: 'cctv', label: 'CCTV cameras', group: 'office', icon: 'cctv', kw: 'camera security surveillance' },
];

export const USES: UseMeta[] = [
  { id: 'gaming', label: 'Gaming', hue: '#8b3dff', text: '#ffffff', icon: 'gamepad', blurb: 'High frame rates in Valorant, GTA V and Cyberpunk.' },
  { id: 'editing', label: 'Video Editing', hue: '#ff7a1a', text: '#1a0f00', icon: 'film', blurb: 'Smooth timelines in Premiere Pro, DaVinci Resolve and After Effects.' },
  { id: 'trading', label: 'Trading', hue: '#16a765', text: '#02180d', icon: 'chart', blurb: 'Many monitors, fast charts and no lag when the market moves.' },
  { id: 'office', label: 'Office & Education', hue: '#2760f0', text: '#ffffff', icon: 'briefcase', blurb: 'Tally, billing, online classes, coding and family use.' },
];

export const BUILDER_SLOTS: { id: BuilderSlotId; label: string }[] = [
  { id: 'cpu', label: 'CPU' },
  { id: 'motherboard', label: 'Motherboard' },
  { id: 'ram', label: 'RAM' },
  { id: 'gpu', label: 'GPU' },
  { id: 'ssd', label: 'SSD' },
  { id: 'cooler', label: 'Cooler' },
  { id: 'psu', label: 'PSU' },
  { id: 'case', label: 'Case' },
];

export const BUILDER_SLOT_IDS: BuilderSlotId[] = BUILDER_SLOTS.map((s) => s.id);

export const AVAILABLE_TAGS = ['best', 'hot', 'new', 'rgb'] as const;

export const CAT_BY_ID: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export const USE_BY_ID: Record<string, UseMeta> = Object.fromEntries(
  USES.map((u) => [u.id, u])
);

export function isBuilderSlotCategory(cat: string): cat is BuilderSlotId {
  return (BUILDER_SLOT_IDS as string[]).includes(cat);
}

export function calcDiscountPct(price: number, mrp: number): number {
  return mrp > price && mrp > 0 ? Math.round((1 - price / mrp) * 100) : 0;
}

export function calcEmi(amount: number, months = 12, annualPct = 0): number {
  if (!months || months <= 0) return amount;
  if (!annualPct) return amount / months;
  const r = annualPct / 12 / 100;
  const f = Math.pow(1 + r, months);
  return (amount * r * f) / (f - 1);
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

export function buildCatalogSearchText(p: CatalogItem): string {
  const cat = CAT_BY_ID[p.cat];
  const use = p.use && USE_BY_ID[p.use] ? USE_BY_ID[p.use].label : '';
  const parts = p.parts
    ? Object.keys(p.parts)
        .map((k) => (p.parts as Record<string, string>)[k])
        .filter(Boolean)
        .join(' ')
    : '';
  return [
    p.name,
    p.brand,
    cat ? cat.label : p.cat,
    cat ? cat.kw : '',
    p.subcategory || '',
    use,
    (p.specs || []).join(' '),
    parts,
    p.description || '',
  ]
    .join(' ')
    .toLowerCase();
}

export function normalizeCatalogItem(raw: Partial<CatalogItem>): CatalogItem {
  const images = Array.isArray(raw.images)
    ? raw.images.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 12)
    : [];
  const primaryImg = String(raw.img || '').trim() || images[0] || '';
  const price = Number(raw.price) || 0;
  const mrp = Number(raw.mrp) || price;

  const item: CatalogItem = {
    id: String(raw.id || '').trim(),
    cat: String(raw.cat || 'prebuilt').trim(),
    brand: String(raw.brand || '').trim(),
    name: String(raw.name || '').trim(),
    price,
    mrp,
    stock: raw.stock !== false,
    visible: raw.visible !== false,
    featured: Boolean(raw.featured),
    sortOrder: typeof raw.sortOrder === 'number' && Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0,
    specs: Array.isArray(raw.specs)
      ? raw.specs.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 30)
      : [],
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 12)
      : [],
  };

  if (raw.subcategory) item.subcategory = String(raw.subcategory).trim();
  if (raw.use) item.use = String(raw.use).trim();
  if (raw.description) item.description = String(raw.description).trim();
  if (primaryImg) item.img = primaryImg;
  if (images.length) item.images = images;
  if (raw.parts && typeof raw.parts === 'object') {
    const cleanParts: PrebuiltParts = {};
    for (const k of ['cpu', 'gpu', 'ram', 'ssd', 'psu', 'case', 'motherboard', 'cooler'] as const) {
      const val = (raw.parts as Record<string, unknown>)[k];
      if (typeof val === 'string' && val.trim()) {
        cleanParts[k] = val.trim().slice(0, 200);
      }
    }
    if (Object.keys(cleanParts).length) item.parts = cleanParts;
  }

  if (raw.socket) item.socket = String(raw.socket).trim();
  if (raw.ramType) item.ramType = String(raw.ramType).trim();
  if (raw.type) item.type = String(raw.type).trim();
  if (raw.form) item.form = String(raw.form).trim();
  if (typeof raw.watt === 'number' && Number.isFinite(raw.watt)) item.watt = raw.watt;
  if (typeof raw.tdp === 'number' && Number.isFinite(raw.tdp)) item.tdp = raw.tdp;
  if (typeof raw.igpu === 'boolean') item.igpu = raw.igpu;
  if (Array.isArray(raw.sockets)) {
    item.sockets = raw.sockets.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 20);
  }
  if (Array.isArray(raw.supports)) {
    item.supports = raw.supports.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 20);
  }
  if (raw.createdAt !== undefined) item.createdAt = raw.createdAt;
  if (raw.updatedAt !== undefined) item.updatedAt = raw.updatedAt;

  item._hay = buildCatalogSearchText(item);
  return item;
}

/**
 * Merge remote Firestore collections for storefront reads, keeping only visible items
 * and falling back to bundled sample data if Firestore has zero items total.
 */
export function mergeCatalogForStorefront(
  remoteProducts: CatalogItem[],
  remoteBuilderParts: CatalogItem[],
  fallbackItems: CatalogItem[]
): {
  products: CatalogItem[];
  builderParts: CatalogItem[];
  usedFallback: boolean;
} {
  const totalRemoteCount = remoteProducts.length + remoteBuilderParts.length;
  if (totalRemoteCount === 0) {
    const normalizedFallback = fallbackItems.map((item) => normalizeCatalogItem(item));
    return {
      products: normalizedFallback.filter((i) => i.visible !== false),
      builderParts: normalizedFallback.filter((i) => i.visible !== false && isBuilderSlotCategory(i.cat)),
      usedFallback: true,
    };
  }

  const visibleProducts = remoteProducts
    .map((i) => normalizeCatalogItem(i))
    .filter((i) => i.visible !== false);
  const visibleParts = remoteBuilderParts
    .map((i) => normalizeCatalogItem(i))
    .filter((i) => i.visible !== false);

  const byId = new Map<string, CatalogItem>();
  visibleProducts.forEach((p) => byId.set(p.id, p));
  visibleParts.forEach((part) => {
    if (!byId.has(part.id)) byId.set(part.id, part);
  });

  const sortCatalog = (a: CatalogItem, b: CatalogItem) => {
    const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
    const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
    if (sa !== sb) return sa - sb;
    return 0;
  };

  const mergedProducts = Array.from(byId.values()).sort(sortCatalog);
  const mergedBuilder = (visibleParts.length ? visibleParts : mergedProducts.filter((i) => isBuilderSlotCategory(i.cat))).sort(
    sortCatalog
  );

  return {
    products: mergedProducts,
    builderParts: mergedBuilder,
    usedFallback: false,
  };
}

export interface CompatOptionPools {
  sockets: string[];
  ramTypes: string[];
  forms: string[];
  tdps: number[];
  watts: number[];
}

export function extractExistingCompatOptions(parts: CatalogItem[]): CompatOptionPools {
  const sockets = new Set<string>(['AM4', 'AM5', 'LGA1700', 'LGA1851']);
  const ramTypes = new Set<string>(['DDR4', 'DDR5']);
  const forms = new Set<string>(['ATX', 'mATX', 'ITX']);
  const tdps = new Set<number>();
  const watts = new Set<number>();

  parts.forEach((p) => {
    if (p.socket) sockets.add(p.socket);
    if (Array.isArray(p.sockets)) p.sockets.forEach((s) => s && sockets.add(s));
    if (p.ramType) ramTypes.add(p.ramType);
    if (p.type) ramTypes.add(p.type);
    if (p.form) forms.add(p.form);
    if (Array.isArray(p.supports)) p.supports.forEach((f) => f && forms.add(f));
    if (typeof p.tdp === 'number' && p.tdp > 0) tdps.add(p.tdp);
    if (typeof p.watt === 'number' && p.watt > 0) watts.add(p.watt);
  });

  return {
    sockets: Array.from(sockets).sort(),
    ramTypes: Array.from(ramTypes).sort(),
    forms: Array.from(forms).sort(),
    tdps: Array.from(tdps).sort((a, b) => a - b),
    watts: Array.from(watts).sort((a, b) => a - b),
  };
}

export function slugifyId(text: string, prefix = 'item'): string {
  const clean = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${clean || 'entry'}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
}

export function validateCatalogItem(
  item: Partial<CatalogItem>,
  mode: 'products' | 'builderParts'
): Record<string, string> {
  const errors: Record<string, string> = {};
  const id = String(item.id || '').trim();
  if (!id) {
    errors.id = 'ID is required.';
  } else if (id.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    errors.id = 'ID may only contain letters, numbers, "-" and "_" (max 128 chars).';
  }

  const name = String(item.name || '').trim();
  if (!name) errors.name = 'Name is required.';
  else if (name.length > 240) errors.name = 'Name must be 240 characters or less.';

  const brand = String(item.brand || '').trim();
  if (!brand) errors.brand = 'Brand is required.';
  else if (brand.length > 120) errors.brand = 'Brand must be 120 characters or less.';

  const cat = String(item.cat || '').trim();
  if (!cat) {
    errors.cat = 'Category is required.';
  } else if (mode === 'builderParts' && !isBuilderSlotCategory(cat)) {
    errors.cat = 'Builder part category must be one of cpu, motherboard, ram, gpu, ssd, cooler, psu, case.';
  } else if (!CAT_BY_ID[cat]) {
    errors.cat = `Unknown category "${cat}".`;
  }

  const price = Number(item.price);
  if (!Number.isFinite(price) || price < 0 || price > 10000000) {
    errors.price = 'Price must be between 0 and 1,00,00,000.';
  }

  const mrp = Number(item.mrp);
  if (!Number.isFinite(mrp) || mrp < 0 || mrp > 10000000) {
    errors.mrp = 'Old price (MRP) must be between 0 and 1,00,00,000.';
  }

  if (item.description && String(item.description).length >= 2000) {
    errors.description = 'Description must be under 2,000 characters.';
  }
  if (item.img && String(item.img).length >= 2000) {
    errors.img = 'Image URL must be under 2,000 characters.';
  }

  if (mode === 'builderParts' || isBuilderSlotCategory(cat)) {
    if (cat === 'cpu') {
      if (!String(item.socket || '').trim()) errors.socket = 'CPU socket is required.';
      if (typeof item.tdp !== 'number' || !Number.isFinite(item.tdp) || item.tdp < 0) {
        errors.tdp = 'Valid TDP (watts) is required.';
      }
    } else if (cat === 'motherboard') {
      if (!String(item.socket || '').trim()) errors.socket = 'Motherboard socket is required.';
      if (!String(item.ramType || '').trim()) errors.ramType = 'Memory type (DDR4/DDR5) is required.';
      if (!String(item.form || '').trim()) errors.form = 'Board size (ATX/mATX/ITX) is required.';
    } else if (cat === 'ram') {
      if (!String(item.type || '').trim()) errors.type = 'Memory type (DDR4/DDR5) is required.';
    } else if (cat === 'gpu') {
      if (typeof item.tdp !== 'number' || !Number.isFinite(item.tdp) || item.tdp < 0) {
        errors.tdp = 'GPU power draw (TDP) is required.';
      }
    } else if (cat === 'psu') {
      if (typeof item.watt !== 'number' || !Number.isFinite(item.watt) || item.watt <= 0) {
        errors.watt = 'PSU wattage is required.';
      }
    } else if (cat === 'cooler') {
      if (!Array.isArray(item.sockets) || !item.sockets.length) {
        errors.sockets = 'Select at least one supported socket.';
      }
    } else if (cat === 'case') {
      if (!Array.isArray(item.supports) || !item.supports.length) {
        errors.supports = 'Select at least one supported board size.';
      }
    }
  }

  return errors;
}

/**
 * Strip non-Firestore fields (_hay, undefined) and strictly enforce field whitelist + size bounds.
 */
export function prepareFirestorePayload(
  raw: Partial<CatalogItem>,
  mode: 'products' | 'builderParts'
): Record<string, unknown> {
  const n = normalizeCatalogItem(raw);
  const out: Record<string, unknown> = {
    id: n.id,
    cat: n.cat,
    brand: n.brand.slice(0, 120),
    name: n.name.slice(0, 240),
    price: Math.min(10000000, Math.max(0, Math.round(n.price))),
    mrp: Math.min(10000000, Math.max(0, Math.round(n.mrp))),
    stock: Boolean(n.stock),
    visible: Boolean(n.visible),
    featured: Boolean(n.featured),
    sortOrder: typeof n.sortOrder === 'number' && Number.isFinite(n.sortOrder) ? n.sortOrder : 0,
    specs: n.specs.map((s) => s.slice(0, 500)).slice(0, 30),
    tags: n.tags.map((s) => s.slice(0, 40)).slice(0, 12),
  };

  if (n.subcategory) out.subcategory = n.subcategory.slice(0, 80);
  if (n.description) out.description = n.description.slice(0, 1999);
  if (n.img) out.img = n.img.slice(0, 1999);
  if (n.images && n.images.length) out.images = n.images.map((u) => u.slice(0, 1999)).slice(0, 12);

  if (mode === 'products') {
    if (n.use) out.use = n.use.slice(0, 40);
    if (n.parts && Object.keys(n.parts).length) out.parts = n.parts;
  }

  if (n.socket) out.socket = n.socket.slice(0, 40);
  if (n.ramType) out.ramType = n.ramType.slice(0, 40);
  if (n.type) out.type = n.type.slice(0, 40);
  if (n.form) out.form = n.form.slice(0, 40);
  if (typeof n.watt === 'number') out.watt = Math.min(5000, Math.max(0, n.watt));
  if (typeof n.tdp === 'number') out.tdp = Math.min(2000, Math.max(0, n.tdp));
  if (typeof n.igpu === 'boolean') out.igpu = n.igpu;
  if (n.sockets && n.sockets.length) out.sockets = n.sockets.slice(0, 20);
  if (n.supports && n.supports.length) out.supports = n.supports.slice(0, 20);

  return out;
}
