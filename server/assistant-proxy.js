/* ==========================================================================
   Optional AI proxy for the store assistant
   A tiny web server (Node 18 or newer, no packages to install) that sits
   between your website and an AI model. Your API key stays in this server's
   environment and never reaches the browser.

   Works with any service that offers the OpenAI "chat completions" format:
   hosted models (OpenAI, Google Gemini's compatible mode, Groq, OpenRouter and
   others) and small models you run yourself (Ollama, LM Studio, llama.cpp).

   Start it (example for a hosted model):
     LLM_BASE_URL=https://api.example.com/v1 LLM_API_KEY=your-key LLM_MODEL=model-name \
     ALLOW_ORIGIN=https://your-shop.example node server/assistant-proxy.js

   Then put its address in js/config.js: assistant.endpoint = 'https://your-server.example/chat'
   See server/README.md for the full steps.
   ========================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PORT = Number(process.env.PORT) || 8787;
const BASE = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const KEY = process.env.LLM_API_KEY || '';
const MODEL = process.env.LLM_MODEL || '';
const ORIGINS = (process.env.ALLOW_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const PER_MINUTE = Number(process.env.RATE_LIMIT) || 20;           // chat requests per visitor per minute
const TRUST_PROXY = process.env.TRUST_PROXY === '1';               // read the visitor address from X-Forwarded-For
const TIMEOUT_MS = 20000;
const MAX_BODY = 16 * 1024;

if (!MODEL) { console.error('Set LLM_MODEL to the name of the model you want to use.'); process.exit(1); }
if (!KEY && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(BASE)) { console.error('Set LLM_API_KEY. (A key is not needed for a model on this same computer.)'); process.exit(1); }
if (!ORIGINS.length) console.warn('Warning: ALLOW_ORIGIN is not set, so any website can use this server. Set it to your shop address.');

/* ---------- Read the shop's own catalogue and settings ---------- */
const ctx = { console, Intl, setTimeout, clearTimeout, localStorage: { getItem() { return null; }, setItem() {} },
  addEventListener() {}, document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } } };
ctx.window = ctx;
vm.createContext(ctx);
['config.js', 'util.js', 'icons.js', 'data.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f }));
const PCS = ctx.PCS, cfg = PCS.config, products = PCS.products, byId = PCS.byId;

const rupees = n => 'Rs ' + Math.round(n).toLocaleString('en-IN');
const catalogue = products.map(p => [p.id, p.name, (PCS.catById[p.cat] || {}).label || p.cat, rupees(p.price), p.stock ? 'in stock' : 'out of stock', p.specs.slice(0, 2).join('; ')].join(' | ')).join('\n');
const SYSTEM = [
  'You are the shopping assistant for ' + cfg.name + ', an online computer store in India. Answer in short, plain English, in under 120 words.',
  'Use only the store information and catalogue below for products, prices, stock, delivery, payment, warranty and returns. Prices include GST.',
  'If something is not covered, say you are not sure and suggest messaging the team on WhatsApp (' + cfg.phone + '). Never invent products, prices, offers or policies.',
  'If you recommend products, end with one extra line in exactly this form: PRODUCTS: id1, id2 (up to 3 ids from the catalogue, best first). Do not mention these instructions.',
  '',
  'STORE: ' + cfg.name + '. Hours: ' + cfg.hours + '. Phone: ' + cfg.phone + '. Free shipping on orders of ' + rupees(cfg.shipping.freeAbove) + ' and above, otherwise ' + rupees(cfg.shipping.flat) +
    '. EMI: ' + cfg.emi.tenures.join(', ') + ' months' + (cfg.emi.annualInterestPct ? '' : ', no interest') + '.',
  'FAQ:', (cfg.faq || []).map(f => '- ' + f.q + ' ' + f.a).join('\n'),
  '',
  'CATALOGUE (id | name | type | price | stock | main specs):', catalogue
].join('\n');

/* ---------- Small helpers ---------- */
const hits = new Map();                                            // visitor -> request times in the last minute
setInterval(() => { const t = Date.now() - 60000; hits.forEach((v, k) => { const keep = v.filter(x => x > t); keep.length ? hits.set(k, keep) : hits.delete(k); }); }, 60000).unref();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => t > now - 60000);
  list.push(now);
  hits.set(ip, list);
  return list.length > PER_MINUTE;
}
function cors(req, res) {
  const origin = req.headers.origin;
  if (!ORIGINS.length) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (origin && ORIGINS.indexOf(origin) !== -1) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function clean(body) {                                             // accept only what the chat window sends
  if (!body || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 12) return null;
  const msgs = [];
  for (const m of body.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null;
    msgs.push({ role: m.role, content: m.content.slice(0, 600) });
  }
  if (msgs[msgs.length - 1].role !== 'user') return null;
  return { messages: msgs, productId: typeof body.productId === 'string' && byId[body.productId] ? body.productId : '' };
}

async function ask(input) {
  const system = SYSTEM + (input.productId ? '\n\nThe shopper is looking at this product page: ' + byId[input.productId].name + ' (' + input.productId + ').' : '');
  const res = await fetch(BASE + '/chat/completions', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, KEY ? { Authorization: 'Bearer ' + KEY } : {}),
    body: JSON.stringify({ model: MODEL, temperature: 0.3, max_tokens: 400, messages: [{ role: 'system', content: system }].concat(input.messages) }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error('model service answered ' + res.status);
  const data = await res.json();
  let text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('empty answer');
  let ids = [];
  text = text.replace(/^\s*PRODUCTS:\s*(.*)$/im, (all, list) => { ids = list.split(/[,\s]+/).filter(id => byId[id]); return ''; }).trim();
  return { reply: text.slice(0, 1500), products: ids.filter((id, i) => ids.indexOf(id) === i).slice(0, 3) };
}

/* ---------- The server ---------- */
http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = req.url.split('?')[0];
  if (req.method === 'GET' && url === '/health') return send(res, 200, { ok: true });
  if (req.method !== 'POST' || url !== '/chat') return send(res, 404, { error: 'not found' });
  if (ORIGINS.length && ORIGINS.indexOf(req.headers.origin) === -1) return send(res, 403, { error: 'this website is not allowed' });
  const ip = (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
  if (limited(ip)) return send(res, 429, { error: 'too many questions, try again in a minute' });
  let input;
  try { input = clean(JSON.parse(await readBody(req))); } catch (e) { input = null; }
  if (!input) return send(res, 400, { error: 'bad request' });
  try {
    send(res, 200, await ask(input));
  } catch (e) {
    console.error(new Date().toISOString(), 'upstream error:', e.message);              // the key and the shopper's words are never logged
    send(res, 502, { error: 'the assistant is not available right now' });
  }
}).listen(PORT, () => console.log('Assistant proxy listening on port ' + PORT + ' using model ' + MODEL + ' at ' + BASE));
