/* Home page: PC finder, category image tiles, best sellers & deals carousels, builder, EMI, steps, brands, FAQ. */
(function (PCS) {
  'use strict';
  const { $, $$, esc, money, short, emi } = PCS.util;
  const cfg = PCS.config, icon = PCS.icon, ui = PCS.ui, store = PCS.store;

  ui.mount('home');
  const monthly = price => emi(price, 12, cfg.emi.annualInterestPct);

  /* ---------- Hero proof points ---------- */
  $('#proof').innerHTML = [
    'Every part is listed, so you know what you pay for',
    'Change any part: message us or use the custom builder',
    'Brand warranty on parts, with help on claims'
  ].map(t => `<li>${icon('checkcircle', 18)}<span>${t}</span></li>`).join('');

  /* ---------- PC finder (use + budget -> best prebuilt PC that fits) ---------- */
  const pcs = PCS.products.filter(p => p.cat === 'prebuilt' && p.stock);
  const prices = pcs.map(p => p.price);
  const MIN = Math.floor(Math.min.apply(null, prices) / 10000) * 10000;
  const MAX = Math.ceil(Math.max.apply(null, prices) / 10000) * 10000;
  const state = { use: 'gaming', budget: PCS.util.clamp(70000, MIN, MAX) };
  const PART_LABELS = [['cpu', 'Processor'], ['gpu', 'Graphics'], ['ram', 'Memory'], ['ssd', 'Storage'], ['psu', 'Power supply'], ['case', 'Cabinet']];

  const tuner = $('#tuner');
  tuner.innerHTML = `
    <p class="tuner__label" id="use-label">What will you use it for?</p>
    <div class="uses" role="group" aria-labelledby="use-label">
      ${PCS.uses.map(u => `<button class="use" type="button" data-use="${u.id}" aria-pressed="false">${icon(u.icon, 22)}<span>${u.label}</span></button>`).join('')}
    </div>
    <div class="tuner__budget">
      <label class="tuner__label" for="budget" style="margin:0">Your budget</label>
      <output class="tuner__amount tabular" id="budget-out" for="budget"></output>
    </div>
    <input class="range" id="budget" type="range" min="${MIN}" max="${MAX}" step="1000" value="${state.budget}">
    <div class="range-ends tabular"><span>${short(MIN)}</span><span>${short(MAX)}</span></div>
    <div class="tuner__result" id="tuner-result" aria-live="polite"></div>`;

  const slider = $('#budget', tuner), out = $('#budget-out', tuner), result = $('#tuner-result', tuner);

  function drawTuner() {
    const use = PCS.useById[state.use];
    $$('.use', tuner).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.use === state.use)));
    out.textContent = money(state.budget);
    slider.value = state.budget;
    slider.style.setProperty('--pct', ((state.budget - MIN) / (MAX - MIN) * 100) + '%');

    const list = pcs.filter(p => p.use === state.use).sort((a, b) => a.price - b.price);
    const fit = list.filter(p => p.price <= state.budget);
    const best = fit[fit.length - 1];
    if (!best) {
      const first = list[0];
      result.innerHTML = `<div class="tuner__note"><p>No ${use.label.toLowerCase()} PC fits ${money(state.budget)}. They start at ${money(first.price)}.</p>
        <p style="margin-top:12px"><button class="btn btn--primary btn--sm" type="button" data-budget="${first.price}">Show the ${money(first.price)} PC</button></p></div>`;
      return;
    }
    const rows = PART_LABELS.filter(([k]) => best.parts[k]).map(([k, label]) => `<div><dt>${label}</dt><dd>${esc(best.parts[k])}</dd></div>`).join('');
    result.innerHTML = `
      <div class="tuner__art">${PCS.art(best)}</div>
      <div class="tuner__detail">
        <h3>${esc(best.name)}</h3>
        <dl class="sheet sheet--navy">${rows}</dl>
        <p class="tuner__price"><strong class="tabular">${money(best.price)}</strong>${best.mrp > best.price ? `<s class="tabular">${money(best.mrp)}</s>` : ''}
          <span>EMI from ${money(monthly(best.price))}/mo for 12 months</span></p>
        <div class="btn-row">
          <a class="btn btn--primary btn--sm" href="/product?id=${encodeURIComponent(best.id)}">See this PC</a>
          <button class="btn btn--outline-white btn--sm" type="button" data-add="${esc(best.id)}">Add to cart</button>
        </div>
      </div>`;
  }
  tuner.addEventListener('click', e => {
    const u = e.target.closest('[data-use]');
    if (u) { state.use = u.dataset.use; drawTuner(); return; }
    const b = e.target.closest('[data-budget]');
    if (b) { state.budget = Number(b.dataset.budget); drawTuner(); }
  });
  slider.addEventListener('input', () => { state.budget = Number(slider.value); drawTuner(); });
  drawTuner();

  /* ---------- Categories: large image tiles with label below ---------- */
  const countIn = id => PCS.products.filter(p => p.cat === id).length;
  $('#cats').innerHTML = `
    <div class="cat-grid">
      ${PCS.categories.map(c => `
        <a class="cat-tile" href="/shop?cat=${encodeURIComponent(c.id)}">
          ${PCS.categoryArt(c)}
          <div class="cat-tile__label">
            <strong>${esc(c.label)}</strong>
            <small>${countIn(c.id)} products</small>
          </div>
        </a>`).join('')}
    </div>`;

  /* ---------- Carousel helper (prev/next arrows + live counter) ---------- */
  function wireCarousel(railEl, prevBtn, nextBtn, counterEl) {
    if (!railEl || !prevBtn || !nextBtn || !counterEl) return;

    function updateMeta() {
      const cards = $$('.card', railEl);
      const total = cards.length;
      if (!total) {
        counterEl.textContent = '0 / 0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
      }
      const cardW = cards[0].getBoundingClientRect().width || 280;
      const gap = 20;
      const step = cardW + gap;
      const visible = Math.max(1, Math.round(railEl.clientWidth / step));
      const idx = Math.min(total - 1, Math.max(0, Math.round(railEl.scrollLeft / step)));
      const end = Math.min(total, idx + visible);
      counterEl.textContent = (idx + 1) + '–' + end + ' of ' + total;
      prevBtn.disabled = railEl.scrollLeft <= 4;
      nextBtn.disabled = railEl.scrollLeft + railEl.clientWidth >= railEl.scrollWidth - 4;
    }

    function scrollByCard(dir) {
      const first = railEl.querySelector('.card');
      const step = first ? (first.getBoundingClientRect().width + 20) * 2 : 560;
      railEl.scrollBy({ left: dir * step, behavior: PCS.util.prefersReducedMotion() ? 'auto' : 'smooth' });
    }

    prevBtn.addEventListener('click', () => scrollByCard(-1));
    nextBtn.addEventListener('click', () => scrollByCard(1));
    railEl.addEventListener('scroll', updateMeta, { passive: true });
    window.addEventListener('resize', updateMeta);
    setTimeout(updateMeta, 0);
    return updateMeta;
  }

  /* ---------- Best sellers (scroll-snap carousel + tabs) ---------- */
  const groupOf = p => PCS.catById[p.cat].group;
  const TABS = [
    { id: 'gaming', label: 'Gaming PCs', pick: p => p.cat === 'prebuilt' && p.use === 'gaming' },
    { id: 'editing', label: 'Editing PCs', pick: p => p.cat === 'prebuilt' && p.use === 'editing' },
    { id: 'trading', label: 'Trading PCs', pick: p => p.cat === 'prebuilt' && p.use === 'trading' },
    { id: 'office', label: 'Office & study PCs', pick: p => p.cat === 'prebuilt' && p.use === 'office' },
    { id: 'parts', label: 'Components', pick: p => groupOf(p) === 'parts' },
    { id: 'gear', label: 'Peripherals', pick: p => groupOf(p) === 'gear' }
  ];
  function topItems(pick) {
    const all = PCS.products.filter(p => p.stock && pick(p));
    const best = all.filter(p => p.tags.includes('best'));
    const rest = all.filter(p => !p.tags.includes('best')).sort((a, b) => PCS.discount(b) - PCS.discount(a));
    return best.concat(rest).slice(0, 8);
  }
  let tab = 'gaming';
  const bestRail = $('#best-grid');
  const updateBestCarousel = wireCarousel(bestRail, $('#best-prev'), $('#best-next'), $('#best-counter'));

  function drawBest() {
    $('#best-tabs').innerHTML = TABS.map(t => `<button class="chip" type="button" data-tab="${t.id}" aria-pressed="${t.id === tab}">${esc(t.label)}</button>`).join('');
    const t = TABS.filter(x => x.id === tab)[0];
    bestRail.innerHTML = topItems(t.pick).map(ui.card).join('');
    bestRail.scrollLeft = 0;
    ui.refresh();
    if (updateBestCarousel) updateBestCarousel();
  }
  $('#best-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (b) { tab = b.dataset.tab; drawBest(); $('#best-tabs [aria-pressed="true"]').focus(); }
  });
  drawBest();

  /* ---------- Biggest discounts (scroll-snap carousel) ---------- */
  const dealsRail = $('#deals');
  dealsRail.innerHTML = PCS.products
    .filter(p => p.stock && PCS.discount(p) > 0)
    .sort((a, b) => PCS.discount(b) - PCS.discount(a))
    .slice(0, 10)
    .map(ui.card)
    .join('');
  wireCarousel(dealsRail, $('#deals-prev'), $('#deals-next'), $('#deals-counter'));

  /* ---------- Recently viewed ---------- */
  const recent = store.recent.list();
  if (recent.length) {
    $('#recent-sec').hidden = false;
    $('#recent').innerHTML = recent.slice(0, 8).map(ui.card).join('');
  }

  /* ---------- Build banner ---------- */
  [['cpu', 'Processor & board', 'Same socket'], ['ram', 'Memory', 'DDR4 or DDR5 match'], ['case', 'Cabinet', 'Board size fits'],
   ['fan', 'CPU cooler', 'Mounts on socket'], ['psu', 'Power supply', 'Watts to spare']].forEach((r, i) => {
    $('#slot-' + (i + 1)).innerHTML = `${icon(r[0], 20)}<strong>${r[1]}</strong><span>${r[2]}</span>`;
  });
  $('#build-wa').href = PCS.wa('Hi, I want to build a custom PC.');

  /* ---------- Commitments and test report ---------- */
  $('#facts').innerHTML = cfg.commitments.map(c => `<li>${icon(c.icon, 22)}<div><strong>${esc(c.title)}</strong><span>${esc(c.text)}</span></div></li>`).join('');
  $('#report').innerHTML = `
    <h3>Stress-test report</h3>
    <p class="report__meta">A sample sheet. Every PC gets its own before it ships.</p>
    <dl class="sheet">${cfg.testSheet.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
    <div class="report__sign"><span>Tested by</span><span>Date</span></div>`;

  /* ---------- EMI calculator ---------- */
  const tenures = cfg.emi.tenures, rate = cfg.emi.annualInterestPct;
  const calc = { price: 50000, months: tenures[tenures.length - 1] };
  $('#calc').innerHTML = `
    <div>
      <label class="field-label" for="emi-price">PC price</label>
      <output class="calc__amount tabular" id="emi-amount" for="emi-price"></output>
      <input class="range range--light" id="emi-price" type="range" min="10000" max="200000" step="1000" value="${calc.price}">
      <div class="range-ends tabular"><span>${short(10000)}</span><span>${short(200000)}</span></div>
      <p class="field-label" style="margin-top:22px" id="emi-ten">Pay over</p>
      <div class="chips" role="group" aria-labelledby="emi-ten">${tenures.map(m => `<button class="chip" type="button" data-months="${m}" aria-pressed="false">${m} months</button>`).join('')}</div>
    </div>
    <div class="calc__out">
      <span class="note">You pay about</span>
      <strong class="tabular" id="emi-out"></strong>
      <p id="emi-note"></p>
      <a class="btn btn--primary btn--sm" id="emi-link" href="/shop?cat=prebuilt">See PCs in this budget</a>
    </div>`;
  function drawCalc() {
    const s = $('#emi-price');
    $('#emi-amount').textContent = money(calc.price);
    s.style.setProperty('--pct', ((calc.price - 10000) / 190000 * 100) + '%');
    $$('#calc [data-months]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.months) === calc.months)));
    const m = emi(calc.price, calc.months, rate);
    $('#emi-out').textContent = money(m) + ' / mo';
    $('#emi-note').textContent = (rate ? `For ${calc.months} months at ${rate}% a year. Total ${money(m * calc.months)}.` : `For ${calc.months} months with no interest: the price divided by the months.`) +
      ' Approval and tenure depend on your bank or EMI partner.';
    $('#emi-link').href = '/shop?cat=prebuilt&max=' + calc.price;
  }
  $('#emi-price').addEventListener('input', e => { calc.price = Number(e.target.value); drawCalc(); });
  $('#calc').addEventListener('click', e => {
    const b = e.target.closest('[data-months]');
    if (b) { calc.months = Number(b.dataset.months); drawCalc(); }
  });
  drawCalc();

  /* ---------- Steps, brands, FAQ, help ---------- */
  $('#steps').innerHTML = cfg.steps.map(s => `<li><strong>${esc(s.title)}</strong><span>${esc(s.text)}</span></li>`).join('');

  const BRAND_COLORS = {
    AMD: '#ED1C24',
    Intel: '#0071C5',
    NVIDIA: '#76B900',
    Axiom: '#D4A12A',
    Kestrel: '#2563EB',
    Lumen: '#8B3DFF',
    Nimbus: '#0EA5E9',
    Orbit: '#10B981'
  };
  $('#brands').innerHTML = PCS.brands.map(b => {
    const col = BRAND_COLORS[b] || '#D4A12A';
    return `<a class="brand-logo" href="/shop?brand=${encodeURIComponent(b)}" style="--brand-color:${col}">
      <svg class="brand-logo__mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>
      <span>${esc(b)}</span>
    </a>`;
  }).join('');

  $('#faq').innerHTML = cfg.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  $('#faq-wa').href = PCS.wa('Hi, I have a question.');
  $('#cta-wa').href = PCS.wa('Hi, I need help choosing a PC. My budget is about ');
  const call = $('#cta-call');
  call.href = 'tel:' + cfg.phoneTel;
  call.textContent = 'Call ' + cfg.phone;

  ui.refresh();
})(window.PCS);
