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

  const store = loadStoreCatalog();
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

  const systemInstruction = [
    `You are the friendly PC advisor for ${cfg.name}, an online computer store in India.`,
    'Keep every reply concise and under 60 words.',
    'Reply in the same language the customer uses.',
    'If the customer has not mentioned their use case or budget yet, warmly ask for both.',
    'Suggest /build whenever the customer wants a custom PC build.',
    'Use ONLY the store settings and product JSON catalogue below. Never invent specs, prices, stock, discounts, EMI terms, warranty, or delivery promises.',
    'For orders, EMI approval, quotes, or anything unknown, hand off to WhatsApp or /contact.',
    'Politely steer off-topic questions back to PCs.',
    'Return JSON with "reply" and "productIds" (up to 3 valid product IDs).',
    activeProduct ? `Current product page: ${activeProduct.name} (${activeProduct.id}).` : '',
    `STORE INFO JSON: ${JSON.stringify({
      name: cfg.name,
      phone: cfg.phone,
      whatsapp: store.whatsappNumber,
      hours: cfg.hours,
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
