import { GoogleGenAI, Type } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  use: string;
  brand: string;
  price: number;
  mrp: number;
  discountPct: number;
  inStock: boolean;
  specs: string[];
  parts?: Record<string, string>;
}

function loadStoreCatalog() {
  const ctx: Record<string, any> = {
    console,
    Intl,
    setTimeout,
    clearTimeout,
    localStorage: { getItem: () => null, setItem: () => {} },
    addEventListener: () => {},
    document: { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const rootDir = process.cwd();
  ['config.js', 'util.js', 'icons.js', 'data.js'].forEach((file) => {
    const code = fs.readFileSync(path.join(rootDir, 'js', file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  });
  const PCS = ctx.PCS;
  const products: CatalogProduct[] = (PCS.products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    category: (PCS.catById[p.cat] && PCS.catById[p.cat].label) || p.cat,
    use: p.use || '',
    brand: p.brand,
    price: p.price,
    mrp: p.mrp,
    discountPct: PCS.discount(p),
    inStock: p.stock !== false,
    specs: p.specs,
    parts: p.parts || undefined
  }));
  return {
    config: PCS.config,
    whatsappNumber: PCS.WHATSAPP_NUMBER || PCS.config.whatsapp,
    products,
    byId: PCS.byId as Record<string, any>
  };
}

let liveCache: { data: any; fetchedAt: number } | null = null;

function decodeVal(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(decodeVal).filter((x: any) => x !== undefined);
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    Object.keys(val.mapValue.fields || {}).forEach((k) => {
      out[k] = decodeVal(val.mapValue.fields[k]);
    });
    return out;
  }
  return undefined;
}

async function loadLiveCatalog() {
  const base = loadStoreCatalog();
  if (liveCache && Date.now() - liveCache.fetchedAt < 120000) return liveCache.data;
  try {
    const fbCfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
    const fetchCol = async (col: string) => {
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(fbCfg.projectId)}/databases/${encodeURIComponent(fbCfg.firestoreDatabaseId)}/documents/${col}?pageSize=500`;
      const res = await fetch(url, typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(4000) } : undefined);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json();
      return (json.documents || []).map((d: any) => {
        const out: Record<string, any> = {};
        Object.keys(d.fields || {}).forEach((k) => { out[k] = decodeVal(d.fields[k]); });
        if (!out.id && d.name) out.id = d.name.split('/').pop();
        return out;
      });
    };
    const [remoteProds, remoteParts] = await Promise.all([fetchCol('products'), fetchCol('builderParts')]);
    if (!remoteProds.length && !remoteParts.length) {
      liveCache = { data: base, fetchedAt: Date.now() };
      return base;
    }
    const merged = new Map<string, any>();
    remoteProds.concat(remoteParts).forEach((p: any) => {
      if (p?.id && p.visible !== false && !merged.has(p.id)) merged.set(p.id, p);
    });
    const byId: Record<string, any> = {};
    const products: CatalogProduct[] = Array.from(merged.values()).map((p) => {
      byId[p.id] = p;
      return {
        id: p.id,
        name: p.name,
        category: p.cat,
        use: p.use || '',
        brand: p.brand,
        price: Number(p.price) || 0,
        mrp: Number(p.mrp) || Number(p.price) || 0,
        discountPct: p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0,
        inStock: p.stock !== false,
        specs: Array.isArray(p.specs) ? p.specs : [],
        parts: p.parts || undefined
      };
    });
    const live = { ...base, products, byId };
    liveCache = { data: live, fetchedAt: Date.now() };
    return live;
  } catch {
    return base;
  }
}

export const handler = async (event: { httpMethod?: string; body?: string | null }) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' })
    };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON request body.' })
    };
  }

  const store = await loadLiveCatalog();
  const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
  const messages = rawMessages
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m: any) => ({ role: m.role, content: m.content.trim().slice(0, 600) }))
    .filter((m: { content: string }) => Boolean(m.content))
    .slice(-16);

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Messages array must end with a user message.' })
    };
  }

  const productId = typeof body?.productId === 'string' && store.byId[body.productId] ? body.productId : '';
  const activeProduct = productId ? store.byId[productId] : null;
  const cfg = store.config;

  const specialities = (cfg.specialities || []).map((s: { title: string }) => s.title);
  const coreValues = (cfg.coreValues || []).map((v: { title: string }) => v.title);

  const systemInstruction = [
    `You are the friendly PC advisor for ${cfg.name}, a GST-registered computer sales, custom PC building and computer service business located in Sirohi, Rajasthan, India.`,
    'Keep every reply concise and under 60 words.',
    'Reply in the same language the customer uses.',
    'If the customer has not mentioned their use case or budget yet, warmly ask for both.',
    'Suggest /build whenever the customer wants a custom PC build.',
    specialities.length ? `${cfg.name} specialities you may state accurately: ${specialities.join('; ')}.` : '',
    coreValues.length ? `${cfg.name} core values: ${coreValues.join('; ')}. Official technology brand: WeblinkitTech.` : '',
    'Use ONLY the store settings and product JSON catalogue below. Never invent specs, prices, stock, discounts, EMI terms, warranty periods, or delivery promises.',
    'For orders, EMI approval, quotes, or anything unknown, hand off to WhatsApp or /contact.',
    'Politely steer off-topic questions back to PCs.',
    'Return JSON with "reply" and "productIds" (up to 3 valid product IDs).',
    activeProduct ? `Current product page: ${activeProduct.name} (${activeProduct.id}).` : '',
    `STORE INFO JSON: ${JSON.stringify({
      name: cfg.name,
      location: 'Sirohi, Rajasthan, India',
      techBrand: 'WeblinkitTech',
      phone: cfg.phone,
      whatsapp: store.whatsappNumber,
      hours: cfg.hours,
      specialities,
      coreValues,
      shipping: cfg.shipping,
      emi: cfg.emi,
      faq: cfg.faq
    })}`,
    `PRODUCTS JSON: ${JSON.stringify(store.products)}`
  ].filter(Boolean).join('\n');

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const transcript = messages
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Customer' : 'Advisor'}: ${m.content}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: transcript,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            productIds: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['reply', 'productIds']
        }
      }
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    const productIds = Array.isArray(parsed.productIds)
      ? parsed.productIds
          .map((id: unknown) => String(id || '').trim())
          .filter((id: string, idx: number, arr: string[]) => Boolean(store.byId[id]) && arr.indexOf(id) === idx)
          .slice(0, 3)
      : [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        reply: String(parsed.reply || '').trim().slice(0, 800),
        productIds
      })
    };
  } catch (err: any) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err?.message || 'Assistant temporarily unavailable.' })
    };
  }
};
