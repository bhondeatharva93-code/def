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
    ['Home', 'Shop', 'Offers', 'Custom PC Build', 'Tech Videos', 'Track Order', 'About Us', 'Contact Us']
  );
  assert.deepEqual(
    nav.map((item) => item.href),
    ['/', '/shop', '/offers', '/build', '/videos', '/track-order', '/about', '/contact']
  );
});

test('introLogic skips splash when returning from offers, about, videos, or track-order', () => {
  const ctx = createBrowserStub(false);
  ['video-config.js', 'intro.js'].forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  });
  const origin = 'http://localhost:3000';
  assert.equal(ctx.PCS.introLogic.shouldShowIntro({ search: '', referrer: origin + '/offers', origin }), false);
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

test('Computer Galaxy config, use labels, and WhatsApp quotation URL match client copy', () => {
  const ctx = createBrowserStub(true);
  ['config.js', 'util.js', 'icons.js', 'data.js'].forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  });

  assert.equal(ctx.PCS.config.name, 'Computer Galaxy');
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.PCS.config.ticker)), [
    'Genuine & Quality Products',
    'GST Invoice Available',
    'All India Delivery Available',
    'Product Warranty & Support'
  ]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(ctx.PCS.config.specialities.map((s) => s.title))),
    [
      'Genuine & Quality Products',
      'Customized Intel & AMD PC Builds',
      'Competitive & Transparent Pricing',
      'GST Invoice Available',
      'Professional Assembly & Testing',
      'Product Warranty & Support',
      'Safe & Secure Packaging',
      'All India Delivery Available',
      'After-Sales Customer Support'
    ]
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(ctx.PCS.uses.map((u) => [u.id, u.label]))),
    [
      ['gaming', 'Gaming'],
      ['editing', 'Video Editing'],
      ['trading', 'Trading'],
      ['office', 'Office & Education']
    ]
  );
  const waUrl = ctx.PCS.wa('Hello Computer Galaxy, I would like a quotation. My requirement: \nMy budget: ');
  assert.ok(waUrl.startsWith('https://wa.me/917014443922?text='));
  assert.deepEqual(
    JSON.parse(JSON.stringify(ctx.PCS.config.coreValues.map((v) => v.title))),
    [
      'Customer Satisfaction',
      'Quality & Reliability',
      'Honesty & Transparency',
      'Professional Service',
      'Continuous Innovation',
      'Long-Term Customer Trust'
    ]
  );
});

test('src/config/contact.ts stays in parity with PCS.contact and PCS.WHATSAPP_NUMBER', () => {
  const tsSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'config', 'contact.ts'), 'utf8');
  assert.match(tsSrc, /WHATSAPP_NUMBER\s*=\s*'917014443922'/);
  assert.match(tsSrc, /EMAIL\s*=\s*'computergalaxysirohi@gmail\.com'/);
  assert.match(tsSrc, /MAPS_QUERY\s*=\s*'Iskon Plaza, Near Weblink Computer, Sirohi 307001, Rajasthan, India'/);
  assert.match(tsSrc, /MAPS_EMBED_URL\s*=\s*''/);

  const ctx = createBrowserStub(false);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8'), ctx, { filename: 'config.js' });
  assert.equal(ctx.PCS.WHATSAPP_NUMBER, '917014443922');
  assert.equal(ctx.PCS.contact.whatsappNumber, '917014443922');
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.PCS.contact.phones)), [
    '+91 7014443922',
    '+91 8852834882',
    '+91 7425961962'
  ]);
  assert.equal(ctx.PCS.contact.email, 'computergalaxysirohi@gmail.com');
  assert.equal(ctx.PCS.contact.mapsQuery, 'Iskon Plaza, Near Weblink Computer, Sirohi 307001, Rajasthan, India');
  assert.equal(ctx.PCS.contact.mapsEmbedUrl, '');
});

test('PCS.contactLogic builds URLs, validates fields, and formats enquiry messages cleanly', () => {
  const ctx = createBrowserStub(false);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'contact.js'), 'utf8'), ctx, { filename: 'contact.js' });
  const c = ctx.PCS.contactLogic;

  assert.equal(c.buildTelHref('+91 7014443922'), 'tel:+917014443922');
  assert.equal(
    c.buildWhatsAppHref('917014443922', 'Hello Computer Galaxy, I need help with: '),
    'https://wa.me/917014443922?text=Hello%20Computer%20Galaxy%2C%20I%20need%20help%20with%3A%20'
  );
  assert.equal(
    c.buildDirectionsHref('Iskon Plaza, Near Weblink Computer, Sirohi 307001, Rajasthan, India'),
    'https://www.google.com/maps/dir/?api=1&destination=Iskon%20Plaza%2C%20Near%20Weblink%20Computer%2C%20Sirohi%20307001%2C%20Rajasthan%2C%20India'
  );
  assert.equal(
    c.buildMapEmbedUrl('Iskon Plaza, Near Weblink Computer, Sirohi 307001, Rajasthan, India', ''),
    'https://www.google.com/maps?q=Iskon%20Plaza%2C%20Near%20Weblink%20Computer%2C%20Sirohi%20307001%2C%20Rajasthan%2C%20India&output=embed'
  );
  assert.equal(
    c.buildMapEmbedUrl('ignored', 'https://www.google.com/maps/embed?pb=custom'),
    'https://www.google.com/maps/embed?pb=custom'
  );

  const invalid = c.validateEnquiry({
    name: 'A',
    phone: '1234567890',
    email: 'not-an-email',
    pin: '3070',
    budget: '50k'
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.pin);
  assert.ok(invalid.errors.budget);

  const minValid = c.validateEnquiry({
    name: 'Ravi Kumar',
    phone: '7014443922',
    email: '',
    pin: '',
    budget: ''
  });
  assert.equal(minValid.ok, true);

  const msgMinimal = c.buildEnquiryMessage({
    name: 'Ravi Kumar',
    phone: '7014443922',
    email: '',
    city: '',
    pin: '',
    config: '',
    budget: '',
    msg: ''
  });
  assert.equal(
    msgMinimal,
    'Hello Computer Galaxy, I would like to make an enquiry.\nFull Name: Ravi Kumar\nMobile Number: 7014443922'
  );

  const msgFull = c.buildEnquiryMessage({
    name: 'Asha Sharma',
    phone: '9876543210',
    email: 'asha@example.com',
    city: 'Sirohi, Rajasthan',
    pin: '307001',
    config: 'Ryzen 5 7600 + RTX 4060',
    budget: '75000',
    msg: 'Need GST invoice'
  });
  assert.equal(
    msgFull,
    [
      'Hello Computer Galaxy, I would like to make an enquiry.',
      'Full Name: Asha Sharma',
      'Mobile Number: 9876543210',
      'Email Address: asha@example.com',
      'City & State: Sirohi, Rajasthan',
      'PIN Code: 307001',
      'Required PC Configuration: Ryzen 5 7600 + RTX 4060',
      'Budget: ₹75000',
      'Message: Need GST invoice'
    ].join('\n')
  );
});

test('PCS.offersLogic defines all 7 exact offers with existing image files and valid shop filters', () => {
  const ctx = createBrowserStub(false);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'offers.js'), 'utf8'), ctx, { filename: 'offers.js' });
  const offers = JSON.parse(JSON.stringify(ctx.PCS.offersLogic.OFFERS));

  assert.deepEqual(
    offers.map((o) => o.title),
    [
      'Budget PC Deals',
      'Gaming PC Offers',
      'Complete Computer Setup Deals',
      'Festival Special Offers',
      'Computer Components Offers',
      'Limited-Time Discounts',
      'Exclusive Online Deals'
    ]
  );

  offers.forEach((o) => {
    assert.ok(o.href.startsWith('/shop?'), `Offer "${o.title}" should link to filtered /shop URL`);
    const diskPath = path.join(__dirname, '..', o.img.replace(/^\//, ''));
    assert.ok(fs.existsSync(diskPath), `Image file should exist for "${o.title}": ${o.img}`);
  });

  assert.equal(
    ctx.PCS.offersLogic.buildQuotationMessage(),
    'Hello Computer Galaxy, I would like a quotation. My requirement: \nMy budget: '
  );
});
