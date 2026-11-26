/* Header, footer, product cards with live quantity steppers, toasts. Used by every page. */
(function (PCS) {
  'use strict';
  const { $, $$, esc, money, el } = PCS.util;
  const cfg = PCS.config, store = PCS.store, icon = PCS.icon;

  const NAV = [
    { label: 'Home', href: '/', page: 'home' },
    { label: 'Shop', href: '/shop', page: 'shop' },
    { label: 'Offers', href: '/offers', page: 'offers' },
    { label: 'Custom PC Build', href: '/build', page: 'build' },
    { label: 'Tech Videos', href: '/videos', page: 'videos' },
    { label: 'Track Order', href: '/track-order', page: 'track' },
    { label: 'About Us', href: '/about', page: 'about' },
    { label: 'Contact Us', href: '/contact', page: 'contact' }
  ];

  function logo() {
    return '<svg viewBox="0 0 32 32" aria-hidden="true">' +
      '<rect x="6" y="6" width="20" height="20" rx="4" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.8"/>' +
      '<rect x="11" y="11" width="10" height="10" rx="2" fill="#E8B948"/>' +
      '<path d="M11 2v4M16 2v4M21 2v4M11 26v4M16 26v4M21 26v4M2 11h4M2 16h4M2 21h4M26 11h4M26 16h4M26 21h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '</svg>';
  }

  function headerHtml(page) {
    const links = NAV.map(n =>
      `<li><a href="${n.href}"${n.page === page ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`
    ).join('');
    const isHome = page === 'home';

    return `
      <a class="skip" href="#main">Skip to content</a>
      <div class="announce">
        <div class="wrap announce__row">
          <span>${esc(cfg.ticker.join('  ·  '))}</span>
        </div>
      </div>
      <header class="hdr${isHome ? ' hdr--hero' : ' is-solid'}" id="site-hdr">
        <div class="wrap">
          <div class="hdr__row">
            <a class="brand" href="/" aria-label="${esc(cfg.name)} home">${logo()}<span>${esc(cfg.name)}</span></a>
            <nav class="nav" id="nav" aria-label="Main">
              <ul>${links}</ul>
            </nav>
            <div class="hdr__actions">
              <button class="icon-btn" type="button" id="hdr-search-toggle" aria-expanded="false" aria-controls="hdr-search-bar" aria-label="Search store">${icon('search', 20)}</button>
              <a class="icon-btn" href="/shop?wish=1" aria-label="Wishlist">${icon('heart', 20)}<span class="badge" data-wish-count></span></a>
              <a class="icon-btn" href="/cart" aria-label="Cart">${icon('cart', 20)}<span class="badge" data-cart-count></span></a>
              <button class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu">${icon('menu', 22)}</button>
            </div>
          </div>
          <form class="hdr-search" id="hdr-search-bar" action="/shop" method="get" role="search" hidden>
            <label class="sr" for="hdr-q">Search PCs, parts, and accessories</label>
            <input id="hdr-q" name="q" type="search" placeholder="Search RTX 5060, Ryzen 5, monitors, keyboards..." autocomplete="off">
            <button class="btn btn--primary btn--sm" type="submit">Search</button>
          </form>
        </div>
      </header>`;
  }

  function footerHtml() {
    const social = (cfg.social || []).map(s =>
      `<li><a href="${esc(s.url)}" aria-label="${esc(s.name)}" rel="noopener noreferrer" target="_blank">${icon(s.icon, 18)}</a></li>`
    ).join('');
    const wa = PCS.wa('Hi, I have a question about a PC.');
    return `
      <footer class="ftr section--dark">
        <div class="wrap">
          <div class="ftr__grid">
            <div class="ftr__brandcol">
              <a class="brand" href="/">${logo()}<span>${esc(cfg.name)}</span></a>
              <p class="ftr__tag">${esc(cfg.tagline)}</p>
              ${social ? `<ul class="ftr__social" aria-label="Social links">${social}</ul>` : ''}
            </div>
            <div>
              <h3>Shop</h3>
              <ul>
                <li><a href="/shop?cat=prebuilt">Prebuilt PCs</a></li>
                <li><a href="/build">Custom build</a></li>
                <li><a href="/shop?group=parts">Components</a></li>
                <li><a href="/shop?group=gear">Peripherals</a></li>
                <li><a href="/shop?group=office">Office and security</a></li>
                <li><a href="/shop?sort=discount">Biggest discounts</a></li>
              </ul>
            </div>
            <div>
              <h3>Support</h3>
              <ul>
                <li><a href="/contact">Contact &amp; service</a></li>
                <li><a href="/policies#shipping">Shipping</a></li>
                <li><a href="/policies#returns">Returns &amp; refunds</a></li>
                <li><a href="/policies#warranty">Warranty</a></li>
                <li><a href="/policies#privacy">Privacy</a></li>
                <li><a href="/policies#terms">Terms</a></li>
              </ul>
            </div>
            <div>
              <h3>Visit or contact</h3>
              <address>
                <span>${cfg.address.map(esc).join('<br>')}</span>
                <span>${esc(cfg.hours)}</span>
                <a href="tel:${esc(cfg.phoneTel)}">${esc(cfg.phone)}</a>
                <a href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp us</a>
                <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>
                <a href="/admin" rel="nofollow">Admin</a>
              </address>
            </div>
            <div class="ftr__news">
              <h3>Stay updated</h3>
              <p>Restock alerts and new build drops. Demo newsletter (no backend).</p>
              <form class="news-form" id="ftr-news-form" novalidate>
                <label class="sr" for="ftr-news-email">Email address</label>
                <input id="ftr-news-email" type="email" placeholder="you@example.com" autocomplete="email" required>
                <button class="btn btn--primary btn--sm" type="submit">Join</button>
              </form>
              <p class="news-msg" id="ftr-news-msg" role="status" aria-live="polite"></p>
            </div>
          </div>
          <div class="ftr__bar">
            <span>&copy; ${new Date().getFullYear()} ${esc(cfg.name)}. All rights reserved.</span>
            <span>Demo store. Products, prices and policies are samples.</span>
          </div>
        </div>
      </footer>`;
  }

  /* ---------- Product card (image-led, spec line, price + MRP, on-card quantity stepper) ---------- */
  function emiLine(p) {
    if (p.price < 10000) return '';
    return `<p class="card__emi">EMI from ${money(PCS.util.emi(p.price, 12, cfg.emi.annualInterestPct))}/mo</p>`;
  }

  function card(p) {
    const off = PCS.discount(p);
    const use = p.use ? PCS.useById[p.use] : null;
    const wished = store.wish.has(p.id);
    const qty = store.cart.qty(p.id);
    const href = '/product?id=' + encodeURIComponent(p.id);
    const specLine = (p.specs && p.specs.length) ? p.specs.slice(0, 2).join(' · ') : '';

    let badge = '';
    if (!p.stock) {
      badge = '<span class="card__badge card__badge--sold">Sold out</span>';
    } else if (off >= 5) {
      badge = `<span class="card__badge card__badge--off">${off}% off</span>`;
    }

    const stepperHtml = p.stock
      ? `<div class="card-stepper" data-stepper="${esc(p.id)}" role="group" aria-label="Quantity for ${esc(p.name)}">
           <button type="button" data-step-dec="${esc(p.id)}" aria-label="Decrease quantity of ${esc(p.name)}"${qty === 0 ? ' disabled' : ''}>${icon('minus', 16)}</button>
           <output data-card-qty="${esc(p.id)}" aria-live="polite">${qty}</output>
           <button type="button" data-step-inc="${esc(p.id)}" aria-label="Increase quantity of ${esc(p.name)}"${qty >= 10 ? ' disabled' : ''}>${icon('plus', 16)}</button>
         </div>`
      : `<button class="card-sold" type="button" disabled>Sold out</button>`;

    return `
      <article class="card"${use ? ` data-use="${use.id}"` : ''}>
        <div class="card__media">
          <a class="card__art" href="${href}" tabindex="-1" aria-hidden="true">${PCS.art(p)}</a>
          ${badge}
          <button class="wish" type="button" data-wish="${esc(p.id)}" aria-pressed="${wished}" aria-label="Save to wishlist: ${esc(p.name)}">${icon('heart', 18)}</button>
        </div>
        <div class="card__body">
          <h3 class="card__name"><a href="${href}">${esc(p.name)}</a></h3>
          ${specLine ? `<p class="card__spec">${esc(specLine)}</p>` : ''}
          <p class="price">
            <strong class="tabular">${money(p.price)}</strong>
            ${p.mrp > p.price ? `<s class="tabular">${money(p.mrp)}</s>` : ''}
          </p>
          ${emiLine(p)}
          <div class="card__foot">
            ${stepperHtml}
          </div>
        </div>
      </article>`;
  }

  function toast(html) {
    let box = $('#toasts');
    if (!box) {
      box = el('<div class="toasts" id="toasts" role="status" aria-live="polite"></div>');
      document.body.appendChild(box);
    }
    const t = el(`<div class="toast">${html}</div>`);
    box.appendChild(t);
    setTimeout(() => t.remove(), 3600);
  }

  function refresh() {
    $$('[data-cart-count]').forEach(b => { const n = store.cart.count(); b.textContent = n || ''; });
    $$('[data-wish-count]').forEach(b => { const n = store.wish.count(); b.textContent = n || ''; });
    $$('[data-wish]').forEach(b => b.setAttribute('aria-pressed', String(store.wish.has(b.dataset.wish))));
    $$('[data-stepper]').forEach(wrap => {
      const id = wrap.dataset.stepper;
      const q = store.cart.qty(id);
      const out = wrap.querySelector('[data-card-qty]');
      const dec = wrap.querySelector('[data-step-dec]');
      const inc = wrap.querySelector('[data-step-inc]');
      if (out) out.textContent = q;
      if (dec) dec.disabled = q <= 0;
      if (inc) inc.disabled = q >= 10;
    });
  }

  document.addEventListener('click', e => {
    const inc = e.target.closest('[data-step-inc]');
    if (inc) {
      const id = inc.dataset.stepInc;
      const cur = store.cart.qty(id);
      if (cur === 0) {
        if (store.cart.add(id, 1)) {
          toast(`${icon('check', 18)}<span>Added to cart: ${esc(PCS.byId[id].name)}</span><a href="/cart">View cart</a>`);
        }
      } else {
        store.cart.setQty(id, cur + 1);
      }
      return;
    }

    const dec = e.target.closest('[data-step-dec]');
    if (dec) {
      const id = dec.dataset.stepDec;
      const cur = store.cart.qty(id);
      if (cur > 0) store.cart.setQty(id, cur - 1);
      return;
    }

    const add = e.target.closest('[data-add]');
    if (add) {
      const qty = Number(add.dataset.qty) || 1;
      if (store.cart.add(add.dataset.add, qty)) {
        toast(`${icon('check', 18)}<span>Added to cart: ${esc(PCS.byId[add.dataset.add].name)}</span><a href="/cart">View cart</a>`);
      }
      return;
    }

    const w = e.target.closest('[data-wish]');
    if (w) {
      const on = store.wish.toggle(w.dataset.wish);
      toast(`${icon('heart', 18)}<span>${on ? 'Saved to your wishlist' : 'Removed from your wishlist'}</span>`);
    }
  });

  function initScrollReveal() {
    const targets = $$('.reveal');
    if (!targets.length) return;
    if (PCS.util.prefersReducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach(t => t.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    targets.forEach(t => io.observe(t));
  }

  function mount(page, title) {
    document.body.dataset.page = page || '';
    if (title) document.title = title + ' | ' + cfg.name;
    else if (page !== 'home') document.title = cfg.name + ' | ' + cfg.tagline;
    const head = $('#site-header'), foot = $('#site-footer');
    if (head) head.outerHTML = headerHtml(page);
    if (foot) foot.outerHTML = footerHtml();

    const hdr = $('#site-hdr');
    const btn = $('.menu-btn'), nav = $('#nav');
    const sToggle = $('#hdr-search-toggle'), sBar = $('#hdr-search-bar'), sInput = $('#hdr-q');

    function syncHdrSolid() {
      if (!hdr) return;
      const searchOpen = sBar && !sBar.hidden;
      const menuOpen = nav && nav.classList.contains('is-open');
      hdr.classList.toggle('is-solid', searchOpen || menuOpen || window.scrollY > 24 || page !== 'home');
    }

    if (btn && nav) {
      btn.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        syncHdrSolid();
      });
    }

    if (sToggle && sBar) {
      sToggle.addEventListener('click', () => {
        const willOpen = sBar.hidden;
        sBar.hidden = !willOpen;
        sToggle.setAttribute('aria-expanded', String(willOpen));
        syncHdrSolid();
        if (willOpen && sInput) sInput.focus();
      });
    }

    if (hdr && page === 'home') {
      window.addEventListener('scroll', syncHdrSolid, { passive: true });
      syncHdrSolid();
    }

    const newsForm = $('#ftr-news-form'), newsEmail = $('#ftr-news-email'), newsMsg = $('#ftr-news-msg');
    if (newsForm && newsEmail && newsMsg) {
      newsForm.addEventListener('submit', e => {
        e.preventDefault();
        const val = newsEmail.value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
          newsMsg.textContent = 'Enter a valid email address.';
          newsMsg.className = 'news-msg news-msg--err';
          newsEmail.focus();
          return;
        }
        newsMsg.textContent = 'Subscribed (demo only — no email is sent).';
        newsMsg.className = 'news-msg news-msg--ok';
        newsEmail.value = '';
      });
    }

    if (!location.hash) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }

    initScrollReveal();
    store.on(refresh);
    refresh();
  }

  PCS.ui = { NAV, mount, card, toast, refresh, emiLine, initScrollReveal };
})(window.PCS);
