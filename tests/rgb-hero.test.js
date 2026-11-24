'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadStoreScripts() {
  const ctx = {
    console,
    Intl,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URLSearchParams,
    location: { search: '' }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  ['config.js', 'util.js', 'icons.js', 'data.js', 'rgb-hero.js'].forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  });
  return ctx.PCS;
}

test('selectFeaturedPcs returns in-stock gaming prebuilt PCs ordered by highlight tags', () => {
  const PCS = loadStoreScripts();
  const featured = PCS.rgbHeroLogic.selectFeaturedPcs(PCS.products);
  assert.ok(featured.length >= 2 && featured.length <= 4);
  featured.forEach((p) => {
    assert.equal(p.cat, 'prebuilt');
    assert.equal(p.use, 'gaming');
    assert.notEqual(p.stock, false);
  });
  assert.equal(featured[0].id, 'pc-gaming-2');
});

test('buildSearchHref builds valid shop.html query URLs', () => {
  const PCS = loadStoreScripts();
  assert.equal(PCS.rgbHeroLogic.buildSearchHref('  RTX 5060  '), 'shop.html?q=RTX%205060');
  assert.equal(PCS.rgbHeroLogic.buildSearchHref('   '), 'shop.html');
});

test('formatProductSummary computes real discount and EMI from catalogue data', () => {
  const PCS = loadStoreScripts();
  const p = PCS.byId['pc-gaming-2'];
  const summary = PCS.rgbHeroLogic.formatProductSummary(p, PCS.discount, PCS.util.emi, PCS.config.emi);
  assert.equal(summary.id, 'pc-gaming-2');
  assert.equal(summary.name, '1080p Gamer');
  assert.equal(summary.href, 'product.html?id=pc-gaming-2');
  assert.equal(summary.price, 68999);
  assert.equal(summary.mrp, 79999);
  assert.equal(summary.off, 14);
  assert.equal(summary.emiMonths, 12);
  assert.equal(Math.round(summary.monthly), 5750);
});

test('extractYoutubeId and buildYoutubeEmbedUrl configure 15-20s muted preview', () => {
  const PCS = loadStoreScripts();
  const id = PCS.rgbHeroLogic.extractYoutubeId('https://www.youtube.com/watch?v=U8A96GBDaaA');
  assert.equal(id, 'U8A96GBDaaA');
  const url = PCS.rgbHeroLogic.buildYoutubeEmbedUrl(id, 18, true);
  assert.ok(url.includes('/embed/U8A96GBDaaA?'));
  assert.ok(url.includes('autoplay=1'));
  assert.ok(url.includes('mute=1'));
  assert.ok(url.includes('start=0&end=18'));
});
