/* Product page. Open it as product.html?id=<product id>. */
(function (PCS) {
  'use strict';
  const { $, $$, esc, money, emi } = PCS.util;
  const cfg = PCS.config, ui = PCS.ui, icon = PCS.icon, store = PCS.store;

  const p = PCS.byId[PCS.util.params().get('id')];
  ui.mount('product', p ? p.name : 'Product not found');

  if (!p) {
    $('#crumbs').innerHTML = '<li><a href="/">Home</a></li><li>Product not found</li>';
    $('#pdp').innerHTML = `<div class="empty" style="margin-bottom:4.5rem"><h3>We could not find that product</h3>
      <p>The link may be old, or the product may have been removed.</p><a class="btn btn--primary" href="/shop">Browse all products</a></div>`;
    return;
  }

  const cat = PCS.catById[p.cat], group = PCS.groups.filter(g => g.id === cat.group)[0];
  const use = p.use ? PCS.useById[p.use] : null;
  const off = PCS.discount(p);
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', p.name + ': ' + p.specs.join(', ') + '.');
  store.recent.push(p.id);

  $('#crumbs').innerHTML = `<li><a href="/">Home</a></li>
    <li><a href="/shop?cat=${cat.id}">${esc(cat.label)}</a></li><li>${esc(p.name)}</li>`;

  /* ---------- Spec rows ---------- */
  const PART_LABELS = [['cpu', 'Processor'], ['gpu', 'Graphics'], ['ram', 'Memory'], ['ssd', 'Storage'], ['psu', 'Power supply'], ['case', 'Cabinet']];
  const ATTRS = [
    ['socket', 'Socket'], ['ramType', 'Memory type'], ['type', 'Memory type'], ['form', 'Board size'],
    ['supports', 'Fits boards'], ['sockets', 'Mounts on'], ['watt', 'Power output'], ['tdp', 'Power draw'], ['igpu', 'Built-in graphics']
  ];
  function specRows() {
    if (p.parts) return PART_LABELS.filter(r => p.parts[r[0]]).map(r => [r[1], p.parts[r[0]]]);
    const rows = p.specs.map((s, i) => [i === 0 ? 'Highlights' : '', s]).filter(r => r[0]);
    const extra = ATTRS.filter(a => p[a[0]] !== undefined).map(a => {
      let v = p[a[0]];
      if (Array.isArray(v)) v = v.join(', ');
      else if (typeof v === 'boolean') v = v ? 'Yes' : 'No';
      else if (a[0] === 'watt' || a[0] === 'tdp') v = v + ' W';
      return [a[1], v];
    });
    return p.specs.map((s, i) => ['Detail ' + (i + 1), s]).concat(extra);
  }
  const rows = specRows();

  /* ---------- Buy box ---------- */
  const monthly = emi(p.price, 12, cfg.emi.annualInterestPct);
  const freeAt = money(cfg.shipping.freeAbove);
  const waText = 'Hi, I am interested in: ' + p.name + ' (' + money(p.price) + ').\n' + location.href;
  const quick = (p.cat === 'prebuilt'
    ? ['Assembled and stress-tested before dispatch', 'Packed to survive the courier trip']
    : ['Genuine part with brand warranty']
  ).concat(['Free shipping above ' + freeAt, 'GST invoice with every order']);

  $('#pdp').innerHTML = `
    <div class="pdp">
      <div class="pdp__art"${use ? ` style="--c:${use.hue}"` : ''}>${PCS.art(p, true)}</div>
      <div class="pdp__buy">
        <p class="pdp__brand">${use ? esc(use.label) + ' PC by ' + esc(p.brand) : esc(p.brand)}</p>
        <h1>${esc(p.name)}</h1>
        <ul class="card__specs" style="font-size:1.0625rem">${p.specs.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        <p class="pdp__price"><strong>${money(p.price)}</strong>${p.mrp > p.price ? `<s>${money(p.mrp)}</s>` : ''}${off ? `<em>${off}% off</em>` : ''}</p>
        <p class="pdp__emi">${p.price >= 10000 ? `EMI from ${money(monthly)} a month for 12 months. Pick EMI at checkout.` : 'Prices include GST.'}</p>
        ${p.stock ? `
        <div class="buyrow">
          <div class="qty" role="group" aria-label="Quantity">
            <button type="button" id="q-dec" aria-label="Decrease quantity">${icon('minus', 18)}</button>
            <output id="q-out" aria-live="polite">1</output>
            <button type="button" id="q-inc" aria-label="Increase quantity">${icon('plus', 18)}</button>
          </div>
          <button class="btn btn--primary" type="button" id="add" data-add="${p.id}" data-qty="1">Add to cart</button>
          <button class="btn btn--outline" type="button" id="buy">Buy now</button>
        </div>` : `
        <div class="buyrow"><button class="btn btn--outline" type="button" disabled>Out of stock</button>
          <a class="btn btn--outline" href="${esc(PCS.wa('Hi, please tell me when this is back in stock: ' + p.name))}" target="_blank" rel="noopener noreferrer">Ask when it is back</a></div>`}
        <div class="btn-row" style="margin-top:0.375rem">
          <a class="btn btn--outline btn--sm" href="${esc(PCS.wa(waText))}" target="_blank" rel="noopener noreferrer">${icon('chat', 18)}Ask about this on WhatsApp</a>
          <button class="btn btn--outline btn--sm" type="button" data-wish="${p.id}" aria-pressed="${store.wish.has(p.id)}">${icon('heart', 18)}Save to wishlist</button>
        </div>
        <ul class="pdp__quick">${quick.map(t => `<li>${icon('check', 18)}<span>${esc(t)}</span></li>`).join('')}</ul>
      </div>
    </div>`;

  if (p.stock) {
    let qty = 1;
    const out = $('#q-out'), add = $('#add');
    const set = n => { qty = Math.max(1, Math.min(10, n)); out.textContent = qty; add.dataset.qty = qty; };
    $('#q-dec').addEventListener('click', () => set(qty - 1));
    $('#q-inc').addEventListener('click', () => set(qty + 1));
    $('#buy').addEventListener('click', () => { store.cart.add(p.id, qty); location.href = '/cart'; });
  }

  /* ---------- Specs, delivery, related, recent ---------- */
  const related = PCS.products
    .filter(x => x.cat === p.cat && x.id !== p.id)
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price)).slice(0, 4);
  const recent = store.recent.list().filter(x => x.id !== p.id).slice(0, 4);

  $('#below').innerHTML = `
    <div class="pdp__more">
      <section class="panel" aria-labelledby="h-specs">
        <h2 id="h-specs">${p.parts ? 'Every part inside' : 'Specifications'}</h2>
        <dl class="sheet">${rows.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
        ${p.parts ? `<p class="note" style="margin-top:0.875rem">Want to change a part? <a href="${esc(PCS.wa('Hi, I want to change a part in ' + p.name + '.'))}" target="_blank" rel="noopener noreferrer">Message us</a> or <a href="/build">build your own</a>.</p>` : ''}
      </section>
      <section class="panel" aria-labelledby="h-ship">
        <h2 id="h-ship">Delivery and warranty</h2>
        <dl class="sheet">
          <div><dt>Shipping</dt><dd>Free above ${freeAt}, else ${money(cfg.shipping.flat)}</dd></div>
          <div><dt>Invoice</dt><dd>GST invoice</dd></div>
          <div><dt>Warranty</dt><dd>Brand warranty</dd></div>
          <div><dt>Returns</dt><dd><a href="/policies#returns">Read the policy</a></dd></div>
        </dl>
        <p class="note" style="margin-top:0.875rem">Sample terms. Edit them in <code>js/product.js</code> and <code>policies.html</code>.</p>
      </section>
    </div>
    ${related.length ? `<section style="margin-bottom:3.5rem" aria-labelledby="h-rel"><div class="block__head"><h2 id="h-rel">Similar in ${esc(cat.label)}</h2><a class="more" href="/shop?cat=${cat.id}">See all</a></div>
      <div class="grid${p.cat === 'prebuilt' ? ' grid--pc' : ''}">${related.map(ui.card).join('')}</div></section>` : ''}
    ${recent.length ? `<section style="margin-bottom:4.5rem" aria-labelledby="h-rec"><div class="block__head"><h2 id="h-rec">Recently viewed</h2></div>
      <div class="grid">${recent.map(ui.card).join('')}</div></section>` : ''}`;
  ui.refresh();
})(window.PCS);
