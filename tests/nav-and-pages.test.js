'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createBrowserStub(withDom) {
  const ctx = {
    console,
    Intl,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    localStorage: { getItem() { return null; }, setItem() {} },
    addEventListener() {},
    location: { hash: '', search: '', origin: 'http://localhost:3000' },
    history: {}
  };
  if (withDom) {
    ctx.document = {
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      body: { dataset: {} }
    };
  }
  ctx.window = ctx;
  vm.createContext(ctx);
  return ctx;
}

test('header NAV removes Build/Contact and places new items in expected sequence', () => {
  const ctx = createBrowserStub(true);
  ['config.js', 'util.js', 'icons.js', 'data.js', 'store.js', 'ui.js'].forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  });

  const nav = JSON.parse(JSON.stringify(ctx.PCS.ui.NAV));
  assert.deepEqual(
    nav.map((item) => item.label),
    ['Home', 'Shop', 'Custom PC Build', 'Tech Videos', 'Track Order', 'About Us', 'Contact Us']
  );
  assert.deepEqual(
    nav.map((item) => item.href),
    ['/', '/shop', '/build', '/videos', '/track-order', '/about', '/contact']
  );
});

test('introLogic skips splash when returning from about, videos, or track-order', () => {
  const ctx = createBrowserStub(false);
  ['video-config.js', 'intro.js'].forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  });
  const origin = 'http://localhost:3000';
  assert.equal(ctx.PCS.introLogic.shouldShowIntro({ search: '', referrer: origin + '/about', origin }), false);
  assert.equal(ctx.PCS.introLogic.shouldShowIntro({ search: '', referrer: origin + '/videos', origin }), false);
  assert.equal(ctx.PCS.introLogic.shouldShowIntro({ search: '', referrer: origin + '/track-order', origin }), false);
});

test('trackLogic finds saved orders case-insensitively and computes stage progress', () => {
  const ctx = createBrowserStub(false);
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'track-order.js'), 'utf8');
  vm.runInContext(code, ctx, { filename: 'track-order.js' });

  const { findOrder, getStageIndex } = ctx.PCS.trackLogic;
  const orders = [
    {
      id: 'ORD-TEST123',
      date: '2026-11-24T00:00:00.000Z',
      total: 68999,
      customer: { name: 'Asha', phone: '+91 98765 43210' }
    }
  ];

  assert.equal(findOrder(orders, '  ord-test123  ', '')?.id, 'ORD-TEST123');
  assert.equal(findOrder(orders, 'ORD-TEST123', '9876543210')?.id, 'ORD-TEST123');
  assert.equal(findOrder(orders, 'ORD-TEST123', '9999999999'), null);
  assert.equal(findOrder(orders, 'ORD-MISSING', ''), null);

  const created = new Date('2026-11-24T00:00:00.000Z').getTime();
  assert.equal(getStageIndex(orders[0], created + 30 * 60 * 1000), 0);
  assert.equal(getStageIndex(orders[0], created + 3 * 3600 * 1000), 1);
  assert.equal(getStageIndex(orders[0], created + 15 * 3600 * 1000), 2);
  assert.equal(getStageIndex(orders[0], created + 30 * 3600 * 1000), 3);
  assert.equal(getStageIndex(orders[0], created + 60 * 3600 * 1000), 4);
});
