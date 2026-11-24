'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadStoreCatalog, sanitizeInput, askPcAdvisor } = require('../server/gemini-assistant');

test('loadStoreCatalog reads store config, WHATSAPP_NUMBER, and catalog products', () => {
  const store = loadStoreCatalog();
  assert.equal(store.config.name, 'YourBrand');
  assert.ok(/^\d{10,15}$/.test(store.whatsappNumber));
  assert.ok(Array.isArray(store.products) && store.products.length > 20);
  assert.ok(store.byId['pc-gaming-2']);
});

test('sanitizeInput validates roles, rejects empty payloads, and preserves known productId', () => {
  assert.equal(sanitizeInput(null), null);
  assert.equal(sanitizeInput({ messages: [] }), null);
  assert.equal(sanitizeInput({ messages: [{ role: 'assistant', content: 'Hello' }] }), null);

  const valid = sanitizeInput({
    messages: [
      { role: 'assistant', content: 'Hi! Tell me your budget.' },
      { role: 'user', content: '  Need a gaming PC under 70000  ' }
    ],
    productId: 'pc-gaming-2'
  });

  assert.deepEqual(valid, {
    messages: [
      { role: 'assistant', content: 'Hi! Tell me your budget.' },
      { role: 'user', content: 'Need a gaming PC under 70000' }
    ],
    productId: 'pc-gaming-2'
  });

  const unknownProd = sanitizeInput({
    messages: [{ role: 'user', content: 'Show me options' }],
    productId: 'non-existent-sku'
  });
  assert.equal(unknownProd.productId, '');
});

test('askPcAdvisor returns 503 error cleanly when GEMINI_API_KEY is absent', async () => {
  const prev = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(
      () => askPcAdvisor({ messages: [{ role: 'user', content: 'Gaming PC under 70k' }] }),
      (err) => err && err.statusCode === 503
    );
  } finally {
    if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
  }
});
