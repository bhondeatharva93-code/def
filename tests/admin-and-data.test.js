'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');

function loadTsModule(relPath) {
  const res = esbuild.buildSync({
    entryPoints: [path.join(ROOT, relPath)],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
  });
  const code = res.outputFiles[0].text;
  const mod = new Module(relPath);
  mod.paths = Module._nodeModulePaths(ROOT);
  mod._compile(code, path.join(ROOT, relPath));
  return mod.exports;
}

const catalogHelpers = loadTsModule('src/data/catalogHelpers.ts');
const csvHelpers = loadTsModule('src/data/csvHelpers.ts');
const seedCatalog = loadTsModule('src/data/seedCatalog.ts');
const imagesConfig = loadTsModule('src/config/images.ts');

test('seed catalog splits 93 starter items cleanly into 41 products and 52 builder parts', () => {
  assert.equal(seedCatalog.SEED_STOREFRONT_PRODUCTS.length, 41);
  assert.equal(seedCatalog.SEED_BUILDER_PARTS.length, 52);
  assert.equal(seedCatalog.SEED_ALL_ITEMS.length, 93);
});

test('calcDiscountPct, calcEmi, and catalog validation rules behave accurately', () => {
  assert.equal(catalogHelpers.calcDiscountPct(50000, 60000), 17);
  assert.equal(catalogHelpers.calcDiscountPct(60000, 50000), 0);
  assert.equal(Math.round(catalogHelpers.calcEmi(60000, 12, 0)), 5000);

  const badProd = catalogHelpers.validateCatalogItem(
    { id: 'bad id!', name: '', brand: '', cat: 'cpu', price: -5, mrp: 20000000 },
    'builderParts'
  );
  assert.ok(badProd.id);
  assert.ok(badProd.name);
  assert.ok(badProd.brand);
  assert.ok(badProd.price);
  assert.ok(badProd.mrp);
  assert.ok(badProd.socket);
  assert.ok(badProd.tdp);
});

test('mergeCatalogForStorefront filters hidden items and falls back cleanly when Firestore is empty', () => {
  const fallbackRes = catalogHelpers.mergeCatalogForStorefront([], [], seedCatalog.SEED_ALL_ITEMS);
  assert.equal(fallbackRes.usedFallback, true);
  assert.equal(fallbackRes.products.length, 93);
  assert.equal(fallbackRes.builderParts.length, 52);

  const remoteRes = catalogHelpers.mergeCatalogForStorefront(
    [
      { id: 'p-1', cat: 'prebuilt', brand: 'CG', name: 'Visible PC', price: 45000, mrp: 50000, stock: true, visible: true, specs: [], tags: [] },
      { id: 'p-2', cat: 'prebuilt', brand: 'CG', name: 'Hidden PC', price: 45000, mrp: 50000, stock: true, visible: false, specs: [], tags: [] },
    ],
    [
      { id: 'cpu-1', cat: 'cpu', brand: 'AMD', name: 'Ryzen 5', price: 15000, mrp: 17000, stock: true, visible: true, specs: [], tags: [], socket: 'AM5', tdp: 65 },
      { id: 'cpu-2', cat: 'cpu', brand: 'Intel', name: 'Hidden CPU', price: 15000, mrp: 17000, stock: true, visible: false, specs: [], tags: [], socket: 'LGA1700', tdp: 65 },
    ],
    seedCatalog.SEED_ALL_ITEMS
  );

  assert.equal(remoteRes.usedFallback, false);
  assert.deepEqual(
    remoteRes.products.map((i) => i.id),
    ['p-1', 'cpu-1']
  );
  assert.deepEqual(
    remoteRes.builderParts.map((i) => i.id),
    ['cpu-1']
  );
});

test('extractExistingCompatOptions collects known values for builder dropdowns', () => {
  const pools = catalogHelpers.extractExistingCompatOptions(seedCatalog.SEED_BUILDER_PARTS);
  assert.ok(pools.sockets.includes('AM4'));
  assert.ok(pools.sockets.includes('AM5'));
  assert.ok(pools.sockets.includes('LGA1700'));
  assert.ok(pools.ramTypes.includes('DDR4'));
  assert.ok(pools.ramTypes.includes('DDR5'));
  assert.ok(pools.forms.includes('ATX'));
  assert.ok(pools.forms.includes('mATX'));
});

test('prepareFirestorePayload strips non-Firestore _hay and enforces bounds', () => {
  const payload = catalogHelpers.prepareFirestorePayload(
    {
      id: 'pc-test',
      cat: 'prebuilt',
      brand: 'Computer Galaxy',
      name: 'Test Rig',
      price: 55000,
      mrp: 60000,
      stock: true,
      visible: true,
      specs: ['Spec 1'],
      tags: ['best'],
      _hay: 'should not persist',
    },
    'products'
  );
  assert.equal('_hay' in payload, false);
  assert.equal(payload.id, 'pc-test');
  assert.equal(payload.price, 55000);
});

test('CSV export and import preview handle RFC-4180 quoting, create/update, and pre-write errors', () => {
  const sample = seedCatalog.SEED_STOREFRONT_PRODUCTS.slice(0, 2);
  const csv = csvHelpers.exportCatalogCsv(sample, 'products');
  const existing = new Set([sample[0].id]);

  // Blank ID row should be marked create; existing ID row should be marked update
  const lines = csv.split('\r\n');
  const row2Cells = csvHelpers.parseCsvMatrix(lines[2])[0];
  row2Cells[0] = '';
  const mutatedCsv = [lines[0], lines[1], row2Cells.map(csvHelpers.escapeCsvCell).join(',')].join('\r\n');

  const preview = csvHelpers.previewCsvImport(mutatedCsv, 'products', existing);
  assert.equal(preview.errors.length, 0);
  assert.equal(preview.updateCount, 1);
  assert.equal(preview.createCount, 1);

  // Invalid row reports error before any database write
  const badCsv = 'id,cat,brand,name,price,mrp\nbad-1,prebuilt,CG,Broken Price,notanumber,50000';
  const badPreview = csvHelpers.previewCsvImport(badCsv, 'products', existing);
  assert.equal(badPreview.errors.length, 1);
  assert.equal(badPreview.validRows.length, 0);
});

test('Cloudinary config defaults to URL-only mode with no committed secrets', () => {
  assert.equal(imagesConfig.CLOUDINARY_CLOUD_NAME, '');
  assert.equal(imagesConfig.CLOUDINARY_UPLOAD_PRESET, '');
  assert.equal(imagesConfig.isCloudinaryConfigured(), false);
});

test('Admin routes are noindex, hidden from public site, and configured across all hosting targets', () => {
  const adminHtml = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
  assert.match(adminHtml, /<meta\s+name="robots"\s+content="noindex,\s*nofollow">/i);

  const publicHtmlFiles = fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith('.html') && f !== 'admin.html');
  for (const file of publicHtmlFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.ok(content.includes('/dist/data-api.js'), `${file} must load /dist/data-api.js`);
    assert.equal(content.includes('/admin'), false, `${file} must not link to /admin`);
  }

  const publicJsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js'));
  for (const file of publicJsFiles) {
    const content = fs.readFileSync(path.join(ROOT, 'js', file), 'utf8');
    if (file === 'ui.js') {
      assert.match(content, /<a href="\/admin" rel="nofollow">Admin<\/a>/);
    } else {
      assert.equal(content.includes('/admin'), false, `js/${file} must not link to /admin`);
    }
  }

  const redirects = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');
  assert.match(redirects, /\/admin\s+\/admin\.html\s+200/);
  assert.match(redirects, /\/admin\/\*\s+\/admin\.html\s+200/);

  const netlifyToml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  assert.match(netlifyToml, /from = "\/admin"/);
  assert.match(netlifyToml, /to = "\/admin\.html"/);

  const htaccess = fs.readFileSync(path.join(ROOT, '.htaccess'), 'utf8');
  assert.match(htaccess, /RewriteRule \^admin\(\?:\/\.\*\)\?\$ admin\.html \[L\]/);

  const serverJs = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.match(serverJs, /\/admin/);
  assert.match(serverJs, /admin\.html/);
  assert.match(serverJs, /ensureClientBundles/);
  assert.match(serverJs, /path\.extname\(req\.path\)/);
});

test('Admin entry wraps AdminApp in ErrorBoundary with Reload button and AdminApp calls all hooks before early returns', () => {
  const mainTsx = fs.readFileSync(path.join(ROOT, 'src/admin/main.tsx'), 'utf8');
  assert.match(mainTsx, /<ErrorBoundary>\s*<AdminApp\s*\/>\s*<\/ErrorBoundary>/);

  const ebTsx = fs.readFileSync(path.join(ROOT, 'src/admin/components/ErrorBoundary.tsx'), 'utf8');
  assert.match(ebTsx, /getDerivedStateFromError/);
  assert.match(ebTsx, /componentDidCatch/);
  assert.match(ebTsx, />\s*Reload\s*</);

  const appTsx = fs.readFileSync(path.join(ROOT, 'src/admin/App.tsx'), 'utf8');
  const firstEarlyReturnIdx = appTsx.search(/if\s*\(!authReady[^)]*\)\s*\{\s*return\s*\(/);
  assert.ok(firstEarlyReturnIdx > 0, 'AdminApp should have authReady JSX early return');
  const afterFirstReturn = appTsx.slice(firstEarlyReturnIdx);
  assert.equal(
    /\buse(State|Effect|Callback|Memo|Ref)\s*\(/.test(afterFirstReturn),
    false,
    'No React hooks may be called after conditional early returns in AdminApp'
  );

  const emptyNormalized = catalogHelpers.normalizeCatalogItem({});
  assert.equal(emptyNormalized.name, '');
  assert.equal(emptyNormalized.brand, '');
  assert.equal(emptyNormalized.price, 0);
  assert.deepEqual(emptyNormalized.specs, []);
  assert.deepEqual(emptyNormalized.tags, []);
});

