/* Shop page: filters, sorting, URL sync and "show more".
   Filters live in the address bar, so a filtered page can be shared:
   shop.html?cat=gpu&max=40000&sort=price-asc&brand=NVIDIA,AMD */
(function (PCS) {
  'use strict';
  const { $, $$, esc, money, short } = PCS.util;
  const ui = PCS.ui, icon = PCS.icon, store = PCS.store;
  const PAGE_SIZE = 12;

  const SORTS = {
    popular: 'Popular',
    'price-asc': 'Price: low to high',
    'price-desc': 'Price: high to low',
    discount: 'Biggest discount',
    name: 'Name: A to Z'
  };
  const RANGES = [
    ['Under ' + short(10000), 0, 10000], [short(10000) + ' to ' + short(25000), 10000, 25000],
    [short(25000) + ' to ' + short(50000), 25000, 50000], [short(50000) + ' to ' + short(100000), 50000, 100000],
    ['Over ' + short(100000), 100000, 0]
  ];

  const qs = PCS.util.params();
  const state = {
    cat: PCS.catById[qs.get('cat')] ? qs.get('cat') : '',
    group: PCS.groups.some(g => g.id === qs.get('group')) ? qs.get('group') : '',
    use: PCS.useById[qs.get('use')] ? qs.get('use') : '',
    q: (qs.get('q') || '').trim(),
    min: Number(qs.get('min')) || 0,
    max: Number(qs.get('max')) || 0,
    sort: SORTS[qs.get('sort')] ? qs.get('sort') : 'popular',
    brands: (qs.get('brand') || '').split(',').filter(Boolean),
    stock: qs.get('stock') === '1',
    wish: qs.get('wish') === '1',
    shown: PAGE_SIZE
  };

  ui.mount('shop', 'Shop');

  /* ---------- Filtering ---------- */
  const popularity = p => (p.tags.includes('best') ? 2 : 0) + (p.tags.includes('hot') ? 1 : 0);

  /* Products that pass every filter except the ones named in `skip` (used for counts). */
  function run(skip) {
    skip = skip || {};
    let list = state.wish ? store.wish.list() : PCS.products.slice();
    if (state.q) {
      const order = PCS.search(state.q);
      const ids = new Set(order.map(p => p.id));
      list = list.filter(p => ids.has(p.id));
      if (state.sort === 'popular') list.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }
    if (!skip.cat && state.group) list = list.filter(p => PCS.catById[p.cat].group === state.group);
    if (!skip.cat && state.cat) list = list.filter(p => p.cat === state.cat);
    if (state.use) list = list.filter(p => p.use === state.use);
    if (state.min) list = list.filter(p => p.price >= state.min);
    if (state.max) list = list.filter(p => p.price <= state.max);
    if (!skip.brand && state.brands.length) list = list.filter(p => state.brands.includes(p.brand));
    if (state.stock) list = list.filter(p => p.stock);
    return list;
  }

  function sorted(list) {
    const l = list.slice();
    switch (state.sort) {
      case 'price-asc': return l.sort((a, b) => a.price - b.price);
      case 'price-desc': return l.sort((a, b) => b.price - a.price);
      case 'discount': return l.sort((a, b) => PCS.discount(b) - PCS.discount(a));
      case 'name': return l.sort((a, b) => a.name.localeCompare(b.name));
      default: return state.q ? l : l.sort((a, b) => popularity(b) - popularity(a));
    }
  }

  /* ---------- Sidebar ---------- */
  const side = $('#filters');

  function drawFilters() {
    const forCats = run({ cat: true });
    const countFor = id => forCats.filter(p => p.cat === id).length;
    const catList = PCS.groups.map(g => {
      const items = PCS.categories.filter(c => c.group === g.id && countFor(c.id));
      return items.length ? `<h4 class="note" style="margin:10px 0 2px;font-family:var(--body)">${esc(g.label)}</h4><ul>${items.map(c =>
        `<li><button class="flink" type="button" data-k="cat:${c.id}" aria-current="${state.cat === c.id}">${esc(c.label)}<small>${countFor(c.id)}</small></button></li>`).join('')}</ul>` : '';
    }).join('');

    const showUse = !state.cat || state.cat === 'prebuilt';
    const brandPool = run({ brand: true });
    const brands = Array.from(new Set(brandPool.map(p => p.brand))).sort();

    side.innerHTML = `
      <div class="filters__top"><h2>Filters</h2>
        <button class="icon-btn filters__close" type="button" data-close aria-label="Close filters">${icon('x', 22)}</button></div>
      <div class="fgroup"><h3>Category</h3>
        <ul><li><button class="flink" type="button" data-k="cat:" aria-current="${!state.cat && !state.group}">All products<small>${forCats.length}</small></button></li></ul>
        ${catList}</div>
      ${showUse ? `<div class="fgroup"><h3>Made for</h3><div class="chips">${PCS.uses.map(u =>
        `<button class="chip" type="button" data-k="use:${u.id}" aria-pressed="${state.use === u.id}">${esc(u.label)}</button>`).join('')}</div></div>` : ''}
      <div class="fgroup"><h3>Price</h3>
        <div class="pricefields">
          <div class="field" style="margin:0"><label for="f-min">Min</label><input class="input" id="f-min" inputmode="numeric" placeholder="0" value="${state.min || ''}"></div>
          <div class="field" style="margin:0"><label for="f-max">Max</label><input class="input" id="f-max" inputmode="numeric" placeholder="Any" value="${state.max || ''}"></div>
        </div>
        <ul>${RANGES.map((r, i) => `<li><button class="flink" type="button" data-k="range:${i}" aria-current="${state.min === r[1] && state.max === r[2]}">${r[0]}</button></li>`).join('')}</ul></div>
      ${brands.length > 1 || state.brands.length ? `<div class="fgroup"><h3>Brand</h3>${brands.map(b =>
        `<label class="check"><input type="checkbox" data-k="brand:${esc(b)}" ${state.brands.includes(b) ? 'checked' : ''}>${esc(b)}</label>`).join('')}</div>` : ''}
      <div class="fgroup"><label class="check"><input type="checkbox" data-k="stock" ${state.stock ? 'checked' : ''}>In stock only</label></div>
      <button class="btn btn--block filters__apply" type="button" data-close>Show results</button>`;
  }

  /* Redraw the sidebar without losing keyboard focus */
  function keepFocus(fn) {
    const a = document.activeElement;
    const key = a && side.contains(a) ? (a.id || a.dataset.k) : null;
    fn();
    if (key) {
      const n = side.querySelector('[id="' + key + '"]') || side.querySelector('[data-k="' + key + '"]');
      if (n) n.focus();
    }
  }

  side.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { closeDrawer(); return; }
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    const [kind, val] = b.dataset.k.split(':');
    if (kind === 'cat') { state.cat = val; state.group = ''; if (val && val !== 'prebuilt') state.use = ''; }
    if (kind === 'use') state.use = state.use === val ? '' : val;
    if (kind === 'range') {
      const r = RANGES[Number(val)];
      const same = state.min === r[1] && state.max === r[2];
      state.min = same ? 0 : r[1]; state.max = same ? 0 : r[2];
    }
    update();
  });
  side.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'f-min' || t.id === 'f-max') {
      const n = Math.max(0, parseInt(String(t.value).replace(/[^\d]/g, ''), 10) || 0);
      if (t.id === 'f-min') state.min = n; else state.max = n;
      if (state.min && state.max && state.min > state.max) { const x = state.min; state.min = state.max; state.max = x; }
      update(); return;
    }
    const k = t.dataset.k || '';
    if (k.indexOf('brand:') === 0) {
      const b = k.slice(6);
      state.brands = t.checked ? state.brands.concat(b) : state.brands.filter(x => x !== b);
      update();
    } else if (k === 'stock') { state.stock = t.checked; update(); }
  });

  /* Mobile drawer */
  const openBtn = $('#open-filters');
  let scrim = null;
  function openDrawer() {
    side.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.addEventListener('click', closeDrawer);
    document.body.appendChild(scrim);
    const c = $('.filters__close', side); if (c) c.focus();
  }
  function closeDrawer() {
    side.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    if (scrim) { scrim.remove(); scrim = null; }
    openBtn.focus();
  }
  openBtn.addEventListener('click', openDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && side.classList.contains('is-open')) closeDrawer(); });

  /* ---------- Active filter pills, title, results ---------- */
  function pills() {
    const out = [];
    if (state.q) out.push(['q', 'Search: ' + state.q]);
    if (state.cat) out.push(['cat', PCS.catById[state.cat].label]);
    if (state.group && !state.cat) out.push(['group', PCS.groups.filter(g => g.id === state.group)[0].label]);
    if (state.use) out.push(['use', PCS.useById[state.use].label]);
    if (state.min || state.max) out.push(['price', state.min && state.max ? money(state.min) + ' to ' + money(state.max) : state.max ? 'Up to ' + money(state.max) : 'From ' + money(state.min)]);
    state.brands.forEach(b => out.push(['brand:' + b, b]));
    if (state.stock) out.push(['stock', 'In stock']);
    return out;
  }
  $('#pills').addEventListener('click', e => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const k = b.dataset.x;
    if (k === 'q') state.q = '';
    else if (k === 'cat') state.cat = '';
    else if (k === 'group') state.group = '';
    else if (k === 'use') state.use = '';
    else if (k === 'price') { state.min = 0; state.max = 0; }
    else if (k === 'stock') state.stock = false;
    else if (k.indexOf('brand:') === 0) state.brands = state.brands.filter(x => x !== k.slice(6));
    update();
  });
  $('#results').addEventListener('click', e => { if (e.target.closest('[data-clear]')) clearAll(); });
  function clearAll() {
    Object.assign(state, { cat: '', group: '', use: '', q: '', min: 0, max: 0, brands: [], stock: false });
    update();
  }

  function heading() {
    if (state.wish) return ['Your wishlist', 'Products you saved on this device.'];
    if (state.q) return ['Results for “' + state.q + '”', ''];
    if (state.cat) return [PCS.catById[state.cat].label, ''];
    if (state.group) return [PCS.groups.filter(g => g.id === state.group)[0].label, ''];
    if (state.sort === 'discount') return ['Deals', 'Products with the biggest price cuts first.'];
    return ['All products', 'Prebuilt PCs, components, peripherals and office gear.'];
  }

  function syncUrl() {
    const u = new URLSearchParams();
    if (state.cat) u.set('cat', state.cat);
    if (state.group && !state.cat) u.set('group', state.group);
    if (state.use) u.set('use', state.use);
    if (state.q) u.set('q', state.q);
    if (state.min) u.set('min', state.min);
    if (state.max) u.set('max', state.max);
    if (state.sort !== 'popular') u.set('sort', state.sort);
    if (state.brands.length) u.set('brand', state.brands.join(','));
    if (state.stock) u.set('stock', '1');
    if (state.wish) u.set('wish', '1');
    const s = u.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')); } catch (err) { /* some browsers block this on file:// pages */ }
  }

  function draw(resetShown) {
    if (resetShown) state.shown = PAGE_SIZE;
    const list = sorted(run());
    const h = heading();
    $('#shop-title').textContent = h[0];
    $('#shop-sub').textContent = h[1];
    $('#shop-sub').hidden = !h[1];
    $('#crumb-here').textContent = h[0];
    document.title = h[0] + ' | ' + PCS.config.name;
    $('#count').textContent = list.length + (list.length === 1 ? ' product' : ' products');
    $('#sort').innerHTML = Object.keys(SORTS).map(k => `<option value="${k}"${k === state.sort ? ' selected' : ''}>${SORTS[k]}</option>`).join('');
    const p = pills();
    openBtn.innerHTML = icon('sliders', 18) + 'Filters' + (p.length ? ' (' + p.length + ')' : '');
    $('#pills').innerHTML = p.map(x => `<button class="pill-x" type="button" data-x="${esc(x[0])}">${esc(x[1])}${icon('x', 16)}<span class="sr"> remove filter</span></button>`).join('');

    const res = $('#results'), more = $('#more-wrap');
    if (!list.length) {
      res.innerHTML = `<div class="empty"><h3>${state.wish ? 'Nothing saved yet' : 'No products match'}</h3>
        <p>${state.wish ? 'Tap the heart on any product to save it here.' : 'Try removing a filter or searching for something else.'}</p>
        ${state.wish ? '<a class="btn btn--primary" href="/shop">Browse products</a>' : '<button class="btn btn--primary" type="button" data-clear>Clear all filters</button>'}</div>`;
      more.innerHTML = '';
    } else {
      const wide = state.cat === 'prebuilt';
      res.innerHTML = `<div class="grid${wide ? ' grid--pc' : ''}">${list.slice(0, state.shown).map(ui.card).join('')}</div>`;
      const left = list.length - state.shown;
      more.innerHTML = left > 0 ? `<button class="btn btn--outline" type="button" id="show-more">Show ${Math.min(PAGE_SIZE, left)} more (${left} left)</button>` : '';
    }
    ui.refresh();
  }

  function update() {
    syncUrl();
    keepFocus(drawFilters);
    draw(true);
  }

  $('#sort').addEventListener('change', e => { state.sort = e.target.value; update(); });
  $('#more-wrap').addEventListener('click', e => {
    if (e.target.closest('#show-more')) { state.shown += PAGE_SIZE; draw(false); }
  });

  drawFilters();
  draw(true);
})(window.PCS);
