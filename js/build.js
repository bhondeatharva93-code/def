/* Custom PC builder. Pick one part per slot. The fit rules live in js/compat.js. */
(function (PCS) {
  'use strict';
  const { $, $$, esc, money, emi } = PCS.util;
  const cfg = PCS.config, ui = PCS.ui, icon = PCS.icon, store = PCS.store, by = PCS.byId, compat = PCS.compat;

  ui.mount('build', 'Build your own PC');

  /* Ready-made starting points. Every id must exist in js/data.js. */
  const PRESETS = [
    { label: 'Office starter', parts: { cpu: 'cpu-r5-5600g', motherboard: 'mb-a520m', ram: 'ram-d4-16', ssd: 'ssd-500-g3', cooler: 'cool-lowp', psu: 'psu-450', case: 'case-matx' } },
    { label: '1080p gaming', parts: { cpu: 'cpu-r5-5600', motherboard: 'mb-b550m', ram: 'ram-d4-16', gpu: 'gpu-rx7600', ssd: 'ssd-1t-g4', cooler: 'cool-tower', psu: 'psu-550', case: 'case-mesh' } },
    { label: 'Balanced gaming', parts: { cpu: 'cpu-r5-7600', motherboard: 'mb-b650m', ram: 'ram-d5-16', gpu: 'gpu-4060', ssd: 'ssd-1t-g4', cooler: 'cool-tower', psu: 'psu-650', case: 'case-argb' } },
    { label: 'Creator', parts: { cpu: 'cpu-r7-7700', motherboard: 'mb-b650-atx', ram: 'ram-d5-32', gpu: 'gpu-5060ti', ssd: 'ssd-2t-g4', cooler: 'cool-dual', psu: 'psu-750g', case: 'case-dual' } },
    { label: 'High end', parts: { cpu: 'cpu-i7-14700f', motherboard: 'mb-b760-d5', ram: 'ram-d5-32', gpu: 'gpu-5070', ssd: 'ssd-2t-g4', cooler: 'cool-aio360', psu: 'psu-850g', case: 'case-dual' } }
  ];

  /* ---------- Saved selection ---------- */
  const KEY = 'pcs.build';
  let memory = null;
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = memory; }
    const out = {};
    PCS.SLOTS.forEach(s => { if (raw && by[raw[s.id]] && by[raw[s.id]].cat === s.id) out[s.id] = raw[s.id]; });
    return out;
  }
  function save() {
    memory = sel;
    try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch (e) { /* storage blocked, keep in memory */ }
  }
  let sel = load();

  /* ---------- Slots ---------- */
  function slotHtml(s) {
    const p = sel[s.id] ? by[sel[s.id]] : null, cat = PCS.catById[s.id];
    return `
      <div class="slot" data-slot="${s.id}" data-state="${p ? 'filled' : 'empty'}">
        <div class="slot__ico">${icon(cat.icon, 28)}</div>
        <div>
          <h3>${s.label}<small>${s.required ? 'Required' : 'Optional'}</small></h3>
          ${p ? `<p class="slot__pick">${esc(p.name)}<small>${esc(p.specs.slice(0, 2).join(', '))}</small></p>` : `<p>${esc(s.hint)}</p>`}
        </div>
        <div class="slot__act">
          ${p ? `<span class="slot__price">${money(p.price)}</span>` : ''}
          <button class="btn btn--sm${p ? ' btn--outline' : ' btn--primary'}" type="button" data-pick="${s.id}" aria-label="${p ? 'Change' : 'Choose'} ${s.label.toLowerCase()}">${p ? 'Change' : 'Choose'}</button>
          ${p ? `<button class="linkbtn" type="button" data-clear="${s.id}" aria-label="Remove ${s.label.toLowerCase()}">Remove</button>` : ''}
        </div>
      </div>`;
  }

  /* ---------- Summary ---------- */
  function buildText(chosen, total) {
    const lines = chosen.map(s => `${s.label}: ${by[sel[s.id]].name} (${money(by[sel[s.id]].price)})`).join('\n');
    return `Hi ${cfg.name}, I would like to order this custom build:\n\n${lines}\n\nParts total: ${money(total)} (GST included)`;
  }

  function summaryHtml() {
    const r = compat.check(sel);
    const chosen = PCS.SLOTS.filter(s => sel[s.id]);
    const total = chosen.reduce((n, s) => n + by[sel[s.id]].price, 0);
    const ready = chosen.length && !r.missing.length && !r.errors;
    const mark = { ok: 'checkcircle', warn: 'alert', error: 'xcircle' };
    return `
      <div class="bsum__total">
        <p>Parts total, GST included</p>
        <strong>${money(total)}</strong>
        <p>${total >= 10000 ? 'EMI from ' + money(emi(total, 12, cfg.emi.annualInterestPct)) + ' a month for 12 months' : chosen.length + ' of ' + PCS.SLOTS.length + ' slots filled'}</p>
      </div>
      <div class="panel" style="padding:1.125rem">
        <h2 style="font-size:1.75rem">Fit check</h2>
        ${r.checks.length
          ? `<ul class="checks">${r.checks.map(c => `<li class="check-i check-i--${c.level}">${icon(mark[c.level], 18)}<span>${esc(c.text)}</span></li>`).join('')}</ul>`
          : '<p class="note">Choose a processor and a motherboard to start the checks.</p>'}
        ${r.watts ? `<p class="note" style="margin-top:0.75rem">Estimated load is ${r.watts} W. We suggest a ${r.recommended} W power supply or more.</p>` : ''}
        ${r.missing.length ? `<p class="note note--box" style="margin-top:0.75rem">Still needed: ${esc(r.missing.join(', '))}.</p>` : ''}
      </div>
      <button class="btn btn--primary btn--block" type="button" id="add-all"${ready ? '' : ' disabled'}>Add all parts to cart</button>
      ${chosen.length ? `<a class="btn btn--outline btn--block" href="${esc(PCS.wa(buildText(chosen, total)))}" target="_blank" rel="noopener noreferrer">${icon('chat', 18)}Send this build on WhatsApp</a>` : ''}
      ${chosen.length ? '<button class="linkbtn" type="button" id="clear-all" style="justify-self:start">Clear every slot</button>' : ''}`;
  }

  function render() {
    $('#slots').innerHTML = PCS.SLOTS.map(slotHtml).join('');
    $('#bsum').innerHTML = summaryHtml();
    save();
  }

  /* ---------- Part picker ---------- */
  const dlg = document.createElement('dialog');
  dlg.className = 'picker';
  dlg.setAttribute('aria-labelledby', 'picker-title');
  document.body.appendChild(dlg);
  let open = null;

  function rowHtml(p) {
    const why = compat.conflict(open, p, sel), out = !p.stock;
    return `
      <button class="opt-row" type="button" data-choose="${esc(p.id)}" aria-pressed="${sel[open] === p.id}"${why || out ? ' disabled' : ''}>
        <span><strong>${esc(p.name)}</strong><small>${esc(p.specs.slice(0, 2).join(', '))}</small></span>
        <span class="opt-row__price">${money(p.price)}</span>
        ${why ? `<span class="why">${esc(why)}</span>` : out ? '<span class="why">Out of stock</span>' : ''}
      </button>`;
  }

  function openPicker(slotId) {
    open = slotId;
    const s = PCS.SLOTS.filter(x => x.id === slotId)[0];
    const list = PCS.products.filter(p => p.cat === slotId).sort((a, b) => a.price - b.price);
    dlg.innerHTML = `
      <div class="picker__head">
        <h2 id="picker-title">Choose ${esc(s.label.toLowerCase())}</h2>
        <button class="icon-btn" type="button" data-close aria-label="Close">${icon('x', 22)}</button>
      </div>
      <div class="picker__list">${list.map(rowHtml).join('')}</div>`;
    dlg.showModal();
  }

  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close(); return; }
    const row = e.target.closest('[data-choose]');
    if (!row || row.disabled) return;
    const slot = open;
    sel[slot] = row.dataset.choose;
    dlg.close();
    render();
    const again = $(`[data-pick="${slot}"]`);
    if (again) again.focus();
  });

  /* ---------- Page events ---------- */
  function loadPreset(n) {
    sel = Object.assign({}, PRESETS[n].parts);
    render();
    ui.toast(`${icon('check', 18)}<span>Loaded: ${esc(PRESETS[n].label)}</span>`);
  }

  $('#presets').innerHTML = '<strong>Start from</strong>' +
    PRESETS.map((p, n) => `<button class="chip" type="button" data-preset="${n}">${esc(p.label)}</button>`).join('');

  document.addEventListener('click', e => {
    const pick = e.target.closest('[data-pick]'), clr = e.target.closest('[data-clear]'), pre = e.target.closest('[data-preset]');
    if (pick) { openPicker(pick.dataset.pick); return; }
    if (clr) {
      delete sel[clr.dataset.clear];
      render();
      const again = $(`[data-pick="${clr.dataset.clear}"]`);
      if (again) again.focus();
      return;
    }
    if (pre) { loadPreset(Number(pre.dataset.preset)); return; }
    if (e.target.closest('#clear-all')) { sel = {}; render(); return; }
    if (e.target.closest('#add-all')) {
      const ids = PCS.SLOTS.filter(s => sel[s.id]).map(s => sel[s.id]);
      const added = ids.filter(id => store.cart.add(id, 1)).length;
      ui.toast(added === ids.length
        ? `${icon('check', 18)}<span>Added ${added} parts to your cart</span><a href="/cart">View cart</a>`
        : `${icon('alert', 18)}<span>${added} of ${ids.length} parts added. The rest are out of stock.</span><a href="/cart">View cart</a>`);
    }
  });

  render();
})(window.PCS);
