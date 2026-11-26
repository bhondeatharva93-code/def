'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { GoogleGenAI, Type } = require('@google/genai');

let cachedCatalog = null;
let liveCatalog = null;
let liveCatalogFetchedAt = 0;
const LIVE_CATALOG_TTL_MS = 2 * 60 * 1000;

function readFirebaseWebConfig() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'firebase-applet-config.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function decodeFirestoreValue(val) {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(decodeFirestoreValue).filter((x) => x !== undefined);
  }
  if ('mapValue' in val) {
    const out = {};
    const fields = val.mapValue.fields || {};
    Object.keys(fields).forEach((k) => {
      out[k] = decodeFirestoreValue(fields[k]);
    });
    return out;
  }
  return undefined;
}

function decodeFirestoreDoc(docObj) {
  const fields = docObj && docObj.fields ? docObj.fields : {};
  const out = {};
  Object.keys(fields).forEach((k) => {
    out[k] = decodeFirestoreValue(fields[k]);
  });
  if (!out.id && docObj && docObj.name) {
    out.id = docObj.name.split('/').pop();
  }
  return out;
}

function loadStoreCatalog() {
  if (cachedCatalog) return cachedCatalog;
  const ctx = {
    console,
    Intl,
    setTimeout,
    clearTimeout,
    localStorage: { getItem() { return null; }, setItem() {} },
    addEventListener() {},
    document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  ['config.js', 'util.js', 'icons.js', 'data.js'].forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  });
  const PCS = ctx.PCS;
  const products = (PCS.products || []).map((p) => ({
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
  cachedCatalog = {
    config: PCS.config,
    catById: PCS.catById,
    whatsappNumber: PCS.WHATSAPP_NUMBER || PCS.config.whatsapp,
    products,
    byId: PCS.byId
  };
  return cachedCatalog;
}

async function loadLiveStoreCatalog() {
  const base = loadStoreCatalog();
  if (liveCatalog && Date.now() - liveCatalogFetchedAt < LIVE_CATALOG_TTL_MS) {
    return liveCatalog;
  }
  const fbCfg = readFirebaseWebConfig();
  if (!fbCfg || !fbCfg.projectId || !fbCfg.firestoreDatabaseId || typeof fetch !== 'function') {
    return base;
  }
  try {
    const fetchCol = async (col) => {
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(fbCfg.projectId)}/databases/${encodeURIComponent(fbCfg.firestoreDatabaseId)}/documents/${col}?pageSize=500`;
      const res = await fetch(url, typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(4000) } : undefined);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json.documents || []).map(decodeFirestoreDoc);
    };
    const [remoteProducts, remoteParts] = await Promise.all([fetchCol('products'), fetchCol('builderParts')]);
    if (!remoteProducts.length && !remoteParts.length) {
      liveCatalog = base;
      liveCatalogFetchedAt = Date.now();
      return base;
    }
    const mergedMap = new Map();
    remoteProducts.concat(remoteParts).forEach((p) => {
      if (p && p.id && p.visible !== false && !mergedMap.has(p.id)) {
        mergedMap.set(p.id, p);
      }
    });
    const byId = {};
    const products = Array.from(mergedMap.values()).map((p) => {
      byId[p.id] = p;
      return {
        id: p.id,
        name: p.name,
        category: (base.catById[p.cat] && base.catById[p.cat].label) || p.cat,
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
    liveCatalog = {
      config: base.config,
      catById: base.catById,
      whatsappNumber: base.whatsappNumber,
      products,
      byId
    };
    liveCatalogFetchedAt = Date.now();
    return liveCatalog;
  } catch {
    return base;
  }
}

function buildSystemInstruction(store, pageProductId) {
  const cfg = store.config;
  const activeProduct = pageProductId && store.byId[pageProductId] ? store.byId[pageProductId] : null;
  const specialities = (cfg.specialities || []).map((s) => s.title);
  const coreValues = (cfg.coreValues || []).map((v) => v.title);
  return [
    `You are the friendly PC advisor for ${cfg.name}, a GST-registered computer sales, custom PC building and computer service business located in Sirohi, Rajasthan, India.`,
    'Keep every reply concise and under 60 words.',
    'Reply in the same language the customer uses.',
    'If the customer has not mentioned their use case (gaming, video editing, trading, office & education) or budget yet, warmly ask for both.',
    'Suggest /build whenever the customer wants a custom PC build or custom part selection.',
    specialities.length ? `${cfg.name} specialities you may state accurately: ${specialities.join('; ')}.` : '',
    coreValues.length ? `${cfg.name} core values: ${coreValues.join('; ')}. Official technology brand: WeblinkitTech.` : '',
    'Use ONLY the store settings and product JSON catalogue below. NEVER invent specs, prices, stock, discounts, EMI terms, warranty periods, or delivery promises.',
    'For orders, EMI approval, bulk quotes, or anything not covered in the data, tell them to message on WhatsApp or visit /contact.',
    'If the question is off-topic (not about PCs, hardware, or the store), politely steer the conversation back to PCs.',
    'Return JSON with "reply" (string) and "productIds" (array of up to 3 valid product id strings from the catalogue, ordered best first).',
    activeProduct ? `The customer is currently viewing: ${activeProduct.name} (${activeProduct.id}).` : '',
    `STORE INFO JSON: ${JSON.stringify({
      name: cfg.name,
      location: 'Sirohi, Rajasthan, India',
      techBrand: 'WeblinkitTech',
      phone: cfg.phone,
      whatsapp: store.whatsappNumber,
      hours: cfg.hours,
      gstIncluded: true,
      specialities,
      coreValues,
      shipping: cfg.shipping,
      emi: cfg.emi,
      faq: cfg.faq
    })}`,
    `PRODUCTS JSON: ${JSON.stringify(store.products)}`
  ].filter(Boolean).join('\n');
}

function sanitizeInput(body, storeOverride) {
  if (!body || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 16) {
    return null;
  }
  const store = storeOverride || loadStoreCatalog();
  const messages = [];
  for (const m of body.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return null;
    }
    const content = m.content.trim().slice(0, 600);
    if (content) messages.push({ role: m.role, content });
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  const productId = typeof body.productId === 'string' && store.byId[body.productId] ? body.productId : '';
  return { messages, productId };
}

async function askPcAdvisor(body) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const baseInput = sanitizeInput(body, loadStoreCatalog());
    if (!baseInput) {
      const err = new Error('Invalid chat request payload.');
      err.statusCode = 400;
      throw err;
    }
    const err = new Error('GEMINI_API_KEY is not configured on the server.');
    err.statusCode = 503;
    throw err;
  }

  const store = await loadLiveStoreCatalog();
  const input = sanitizeInput(body, store);
  if (!input) {
    const err = new Error('Invalid chat request payload.');
    err.statusCode = 400;
    throw err;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  const transcript = input.messages
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Advisor'}: ${m.content}`)
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: transcript,
    config: {
      systemInstruction: buildSystemInstruction(store, input.productId),
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'Friendly concise reply under 60 words using only catalogue data.'
          },
          productIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Up to 3 valid product IDs from the catalogue.'
          }
        },
        required: ['reply', 'productIds']
      }
    }
  });

  const rawText = (response.text || '').trim();
  if (!rawText) {
    const err = new Error('Empty response from Gemini.');
    err.statusCode = 502;
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (_e) {
    parsed = { reply: rawText, productIds: [] };
  }

  const reply = String(parsed.reply || '').trim().slice(0, 800);
  const ids = Array.isArray(parsed.productIds)
    ? parsed.productIds
        .map((id) => String(id || '').trim())
        .filter((id, idx, arr) => store.byId[id] && arr.indexOf(id) === idx)
        .slice(0, 3)
    : [];

  return {
    reply: reply || 'Tell me your use case and budget and I can suggest the right PC.',
    productIds: ids
  };
}

module.exports = {
  askPcAdvisor,
  loadStoreCatalog,
  sanitizeInput
};
