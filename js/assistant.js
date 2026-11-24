/* ==========================================================================
   Store assistant: floating 56px PC advisor + 380x560 chat drawer
   Calls the server-side Gemini endpoint (/api/assistant) and shows compact
   product cards or friendly WhatsApp handoff on failure.
   ========================================================================== */
(function (PCS) {
  'use strict';

  const cfg = (PCS.config && PCS.config.assistant) || {};
  if (cfg.enabled === false || !PCS.store) return;

  const esc = PCS.util.esc, money = PCS.util.money, icon = PCS.icon, brain = PCS.brain;
  const KEY = 'pcs.chat';
  const OPENED_KEY = 'pcs.advisor.opened';
  const MAX_KEPT = 40;
  const QUICK_CHIPS = ['Gaming PC', 'Video editing', 'Trading setup', 'Office PC', 'Talk on WhatsApp'];

  const fine = () => !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
  const phone = () => !!(window.matchMedia && window.matchMedia('(max-width: 640px)').matches);

  function env() {
    const page = document.body.dataset.page || '';
    const id = page === 'product' ? PCS.util.params().get('id') || '' : '';
    return { page: page, pageProductId: PCS.byId[id] ? id : '' };
  }

  let hasOpenedBefore = false;
  try { hasOpenedBefore = localStorage.getItem(OPENED_KEY) === '1'; } catch (_e) { hasOpenedBefore = false; }

  let S = { msgs: [], state: brain ? brain.initialState() : {}, open: false };
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    if (saved && Array.isArray(saved.msgs)) {
      S = { msgs: saved.msgs, state: Object.assign(brain ? brain.initialState() : {}, saved.state || {}), open: !!saved.open };
    }
  } catch (_e) { /* private mode */ }

  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify({ msgs: S.msgs.slice(-MAX_KEPT), state: S.state, open: S.open })); } catch (_e) { /* ignore */ }
  }

  let busy = false;

  function greeting() {
    const e = env(), p = e.pageProductId ? PCS.byId[e.pageProductId] : null;
    const text = (cfg.greeting || 'Hi! Tell me what the PC is for and your budget and I will suggest options.') +
      (p ? '\n\nYou are viewing **' + p.name + '**. Ask me about it, or for alternatives.' : '');
    return { who: 'bot', m: { text: text, cards: [], chips: QUICK_CHIPS, actions: [] } };
  }

  function resetLog() { S.msgs = [greeting()]; }
  if (!S.msgs.some(m => m.who === 'me')) resetLog();

  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  function fmt(text) {
    const out = [];
    let list = [];
    const flush = () => { if (list.length) { out.push('<ul>' + list.join('') + '</ul>'); list = []; } };
    String(text || '').split('\n').forEach(line => {
      if (/^- /.test(line)) list.push('<li>' + inline(line.slice(2)) + '</li>');
      else { flush(); if (line.trim()) out.push('<p>' + inline(line) + '</p>'); }
    });
    flush();
    return out.join('');
  }

  function cardHtml(c) {
    const p = PCS.byId[c.id];
    if (!p) return '';
    const href = '/product?id=' + encodeURIComponent(p.id);
    const imgSrc = PCS.productImage ? PCS.productImage(p) : '';
    const cat = PCS.catById[p.cat];
    const fallbackSvg = p.cat === 'prebuilt'
      ? PCS.tower((PCS.useById[p.use] || PCS.uses[0]).hue)
      : icon(cat ? cat.icon : 'tower', 28);
    return '<article class="ca-card">' +
      '<a class="ca-thumb" href="' + href + '" aria-hidden="true" tabindex="-1">' +
        (imgSrc ? '<img src="' + esc(imgSrc) + '" alt="' + esc(p.name) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">' : '') +
        '<span class="ca-thumb__fb"' + (imgSrc ? ' hidden' : '') + '>' + fallbackSvg + '</span>' +
      '</a>' +
      '<div class="ca-card__body">' +
        '<a class="ca-card__name" href="' + href + '">' + esc(p.name) + '</a>' +
        '<p class="ca-price"><strong class="tabular">' + money(p.price) + '</strong>' + (p.mrp > p.price ? '<s class="tabular">' + money(p.mrp) + '</s>' : '') + '</p>' +
        '<div class="ca-card__btns">' +
          (p.stock !== false ? '<button class="btn btn--primary btn--xs" type="button" data-ca-add="' + esc(p.id) + '">Add to cart</button>' : '<span class="ca-out">Sold out</span>') +
          '<a class="ca-link" href="' + href + '">View product</a>' +
        '</div>' +
      '</div></article>';
  }

  const actionHtml = a => '<a class="ca-act" href="' + esc(a.href) + '"' + (a.external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(a.label) + '</a>';

  function msgHtml(entry, withChips) {
    if (entry.who === 'me') return '<div class="ca-msg ca-msg--me"><div class="ca-bubble">' + esc(entry.text) + '</div></div>';
    const m = entry.m || {};
    return '<div class="ca-msg ca-msg--bot"><div class="ca-bubble">' + fmt(m.text) + '</div>' +
      (m.cards && m.cards.length ? '<div class="ca-cards">' + m.cards.map(cardHtml).join('') + '</div>' : '') +
      (m.actions && m.actions.length ? '<div class="ca-actions">' + m.actions.map(actionHtml).join('') + '</div>' : '') +
      (withChips && m.chips && m.chips.length ? '<div class="ca-chips">' + m.chips.map(c => '<button class="ca-chip" type="button" data-chip="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' : '') +
      '</div>';
  }

  const storeName = esc((PCS.config && PCS.config.name) || 'YourBrand');
  const root = document.createElement('div');
  root.className = 'ca';
  root.innerHTML =
    '<div class="ca-dock">' +
      (!hasOpenedBefore ? '<span class="ca-label" id="ca-label">Ask our PC advisor</span>' : '') +
      '<button class="ca-launch" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="ca-panel" aria-label="Open PC advisor">' +
        icon('chat', 24) +
      '</button>' +
    '</div>' +
    '<section class="ca-panel" id="ca-panel" role="dialog" aria-labelledby="ca-title" hidden>' +
      '<header class="ca-head">' +
        '<span class="ca-head__logo" aria-hidden="true">' + icon('cpu', 18) + '</span>' +
        '<div class="ca-head__title"><strong id="ca-title">' + storeName + '</strong><span>PC advisor</span></div>' +
        '<button class="ca-icon" type="button" data-ca="reset" aria-label="Start a new chat">' + icon('reset', 18) + '</button>' +
        '<button class="ca-icon" type="button" data-ca="close" aria-label="Close PC advisor">' + icon('x', 20) + '</button>' +
      '</header>' +
      '<div class="ca-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation"></div>' +
      '<form class="ca-form" autocomplete="off">' +
        '<label class="ca-sr" for="ca-input">Your message</label>' +
        '<input id="ca-input" type="text" maxlength="300" placeholder="Ask about PCs, budget, or parts..." enterkeyhint="send">' +
        '<button class="ca-send" type="submit" aria-label="Send message">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>' +
        '</button>' +
      '</form>' +
    '</section>';
  document.body.appendChild(root);

  const launch = root.querySelector('.ca-launch');
  const panel = root.querySelector('.ca-panel');
  const log = root.querySelector('.ca-log');
  const form = root.querySelector('.ca-form');
  const input = root.querySelector('#ca-input');

  function draw() {
    const lastBot = S.msgs.reduce((n, m, i) => (m.who === 'bot' ? i : n), -1);
    log.innerHTML = S.msgs.map((m, i) => msgHtml(m, i === lastBot)).join('');
    log.scrollTop = log.scrollHeight;
  }
  function stripChips() { log.querySelectorAll('.ca-chips').forEach(n => n.remove()); }
  function append(entry) {
    log.insertAdjacentHTML('beforeend', msgHtml(entry, entry.who === 'bot'));
    const node = log.lastElementChild;
    if (entry.who === 'bot') log.scrollTop = Math.max(0, node.offsetTop - 10);
    else log.scrollTop = log.scrollHeight;
    return node;
  }

  function hideLabelForever() {
    const lbl = root.querySelector('#ca-label');
    if (lbl) lbl.remove();
    try { localStorage.setItem(OPENED_KEY, '1'); } catch (_e) { /* ignore */ }
  }

  function open(focus) {
    S.open = true;
    panel.hidden = false;
    launch.setAttribute('aria-expanded', 'true');
    document.body.classList.add('ca-lock');
    hideLabelForever();
    if (!log.childElementCount) draw();
    if (focus !== false) input.focus({ preventScroll: true });
    save();
  }

  function close() {
    S.open = false;
    panel.hidden = true;
    launch.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('ca-lock');
    save();
  }

  function reset() {
    S = { msgs: [], state: brain ? brain.initialState() : {}, open: true };
    resetLog();
    draw();
    save();
    input.focus({ preventScroll: true });
  }

  function history() {
    return S.msgs.slice(-8).map(m => (m.who === 'me'
      ? { role: 'user', content: m.text }
      : { role: 'assistant', content: String((m.m && m.m.text) || '').slice(0, 600) }));
  }

  async function askGeminiEndpoint() {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 14000);
    try {
      const e = env();
      const endpoint = cfg.endpoint || '/api/assistant';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctl.signal,
        body: JSON.stringify({ messages: history(), productId: e.pageProductId })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || ('status ' + res.status));
      if (!d || typeof d.reply !== 'string' || !d.reply.trim()) throw new Error('empty reply');
      const rawIds = Array.isArray(d.productIds) ? d.productIds : (Array.isArray(d.products) ? d.products : []);
      const ids = rawIds.filter(id => PCS.byId[id]).slice(0, 3);
      return {
        text: d.reply.slice(0, 800),
        cards: ids.map(id => ({ id: id })),
        chips: QUICK_CHIPS,
        actions: [{ label: 'Custom build (/build)', href: '/build' }]
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function send(raw) {
    const text = String(raw || '').trim().slice(0, 300);
    if (!text || busy) return;

    if (text.toLowerCase() === 'talk on whatsapp') {
      const waHref = PCS.wa('Hi, I would like advice choosing a PC.');
      const me = { who: 'me', text: text };
      S.msgs.push(me);
      stripChips();
      append(me);
      const botEntry = {
        who: 'bot',
        m: {
          text: 'You can chat directly with our team on WhatsApp or send a request on our contact page.',
          cards: [],
          chips: QUICK_CHIPS.slice(0, 4),
          actions: [
            { label: 'Open WhatsApp', href: waHref, external: true },
            { label: 'Contact page', href: '/contact' }
          ]
        }
      };
      S.msgs.push(botEntry);
      append(botEntry);
      save();
      return;
    }

    busy = true;
    const me = { who: 'me', text: text };
    S.msgs.push(me);
    stripChips();
    append(me);
    input.value = '';

    const dots = document.createElement('div');
    dots.className = 'ca-msg ca-msg--bot';
    dots.innerHTML = '<span class="ca-typing" aria-label="PC advisor is typing"><i></i><i></i><i></i></span>';
    log.appendChild(dots);
    log.scrollTop = log.scrollHeight;

    let bot;
    try {
      bot = await askGeminiEndpoint();
    } catch (_err) {
      bot = {
        text: 'I could not reach the AI PC advisor right now. Message us on WhatsApp or visit our contact page and we will help you pick the right build.',
        cards: [],
        chips: QUICK_CHIPS.slice(0, 4),
        actions: [
          { label: 'Message on WhatsApp', href: PCS.wa('Hi, I need help picking a PC: ' + text), external: true },
          { label: 'Contact page', href: '/contact' }
        ]
      };
    }

    dots.remove();
    const entry = { who: 'bot', m: bot };
    S.msgs.push(entry);
    append(entry);
    busy = false;
    save();
  }

  function addToCart(id) {
    const p = PCS.byId[id];
    if (!p || !PCS.store.cart.add(id, 1)) return;
    const n = PCS.store.cart.count();
    stripChips();
    const entry = {
      who: 'bot',
      m: {
        text: 'Added **' + p.name + '** to your cart (' + n + (n === 1 ? ' item' : ' items') + ', ' + money(PCS.store.cart.subtotal()) + ').',
        cards: [],
        actions: [{ label: 'Go to cart', href: '/cart' }],
        chips: QUICK_CHIPS
      }
    };
    S.msgs.push(entry);
    append(entry);
    save();
  }

  launch.addEventListener('click', () => (S.open ? close() : open()));
  form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
  panel.addEventListener('click', e => {
    const add = e.target.closest('[data-ca-add]');
    if (add) { e.stopPropagation(); addToCart(add.dataset.caAdd); return; }
    const chip = e.target.closest('[data-chip]');
    if (chip) { send(chip.dataset.chip); if (fine()) input.focus({ preventScroll: true }); return; }
    const btn = e.target.closest('[data-ca]');
    if (!btn) return;
    if (btn.dataset.ca === 'close') { close(); launch.focus(); }
    if (btn.dataset.ca === 'reset') reset();
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && S.open) { close(); launch.focus(); } });

  if (S.open && !phone()) open(false);
  else if (S.open) { S.open = false; save(); }

  document.addEventListener('click', e => { if (e.target.closest('[data-ask-ai]')) { e.preventDefault(); open(); } });

  PCS.assistant = { open: open, close: close, ask: send, reset: reset };
})(window.PCS);
