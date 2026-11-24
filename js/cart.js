/* Cart page: review items, add delivery details, place the order.
   There is no server. "Place order" saves the order in this browser and
   prepares a WhatsApp message to the store. Connect a backend here when you have one. */
(function (PCS) {
  'use strict';
  const { $, esc, money } = PCS.util;
  const cfg = PCS.config, ui = PCS.ui, icon = PCS.icon, store = PCS.store;

  ui.mount('cart', 'Cart');
  const root = $('#cart-root');
  let done = null;                       // the order shown on the thank-you screen

  const PAYMENT = {
    upi: ['UPI or bank transfer', 'We send the payment details on WhatsApp.'],
    emi: ['EMI', 'We share the EMI options for your bank.'],
    cod: ['Pay on delivery', 'Where it is available for your pincode.']
  };

  /* One rule per field: [field id, test, message] */
  const RULES = [
    ['name', v => v.trim().length >= 2, 'Enter your full name.'],
    ['phone', v => {
      let d = v.replace(/\D/g, '');
      if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
      return /^[6-9]\d{9}$/.test(d);
    }, 'Enter a 10-digit mobile number.'],
    ['email', v => !v.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()), 'Enter a valid email address, or leave it empty.'],
    ['addr', v => v.trim().length >= 10, 'Enter the full delivery address.'],
    ['city', v => v.trim().length >= 2, 'Enter your city.'],
    ['pin', v => /^[1-9]\d{5}$/.test(v.trim()), 'Enter a 6-digit pincode.']
  ];

  /* ---------- Pieces ---------- */
  function lineHtml(i) {
    const p = i.product, href = '/product?id=' + encodeURIComponent(p.id);
    return `
      <div class="line" data-id="${esc(p.id)}">
        ${PCS.art(p)}
        <div>
          <h3><a href="${href}">${esc(p.name)}</a></h3>
          <p class="note">${money(p.price)} each</p>
          <div class="line__ctl">
            <div class="qty" role="group" aria-label="Quantity of ${esc(p.name)}">
              <button type="button" data-dec aria-label="Decrease quantity">${icon('minus', 18)}</button>
              <output aria-live="polite">${i.qty}</output>
              <button type="button" data-inc aria-label="Increase quantity"${i.qty >= 10 ? ' disabled' : ''}>${icon('plus', 18)}</button>
            </div>
            <button class="linkbtn" type="button" data-remove>Remove</button>
          </div>
        </div>
        <div class="line__sum">${money(p.price * i.qty)}</div>
      </div>`;
  }

  function summaryHtml() {
    const c = store.cart, sub = c.subtotal(), ship = c.shipping(), left = cfg.shipping.freeAbove - sub;
    return `
      <dl class="sheet total">
        <div><dt>Items (${c.count()})</dt><dd>${money(sub)}</dd></div>
        <div><dt>Shipping</dt><dd>${ship ? money(ship) : 'Free'}</dd></div>
        <div><dt>Total</dt><dd>${money(c.total())}</dd></div>
      </dl>
      <p class="note">Includes ${money(c.gst())} GST.${left > 0 ? ' Add ' + money(left) + ' more for free shipping.' : ''}</p>`;
  }

  function field(id, label, extra, tag) {
    const control = tag === 'textarea'
      ? `<textarea class="input" id="f-${id}" name="${id}" ${extra} aria-describedby="e-${id}"></textarea>`
      : `<input class="input" id="f-${id}" name="${id}" ${extra} aria-describedby="e-${id}">`;
    return `<div class="field"><label for="f-${id}">${label}</label>${control}<p class="err" id="e-${id}"></p></div>`;
  }

  function formHtml() {
    const pay = Object.keys(PAYMENT).map((k, n) => `
      <label class="opt"><input type="radio" name="pay" value="${k}"${n === 0 ? ' checked' : ''}>
        <span>${PAYMENT[k][0]}<small>${PAYMENT[k][1]}</small></span></label>`).join('');
    return `
      <form class="panel" id="checkout" novalidate aria-labelledby="h-ship">
        <h2 id="h-ship">Delivery details</h2>
        <div class="row2">
          ${field('name', 'Full name', 'autocomplete="name"')}
          ${field('phone', 'Mobile number', 'type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="10 digits"')}
        </div>
        ${field('email', 'Email <small>(optional)</small>', 'type="email" autocomplete="email"')}
        ${field('addr', 'Address', 'autocomplete="street-address"', 'textarea')}
        <div class="row2">
          ${field('city', 'City', 'autocomplete="address-level2"')}
          ${field('pin', 'Pincode', 'inputmode="numeric" maxlength="6" autocomplete="postal-code"')}
        </div>
        ${field('gst', 'GST number <small>(optional, for a business invoice)</small>', 'autocomplete="off" maxlength="15"')}
        <fieldset class="field"><legend>How would you like to pay?</legend><div class="opts" style="margin:0">${pay}</div></fieldset>
        <p class="note note--box">This demo store does not take payments. Placing the order saves it in this browser and prepares a WhatsApp message to the store.</p>
      </form>`;
  }

  function recentOrdersHtml() {
    const list = store.orders.list().slice(0, 3);
    if (!list.length) return '';
    return `
      <section class="panel" style="max-width:720px;margin:0 auto 72px" aria-labelledby="h-orders">
        <h2 id="h-orders">Orders placed on this device</h2>
        <dl class="sheet">${list.map(o => `<div><dt>${esc(o.id)}, ${new Date(o.date).toLocaleDateString('en-IN')}</dt><dd>${money(o.total)}</dd></div>`).join('')}</dl>
      </section>`;
  }

  /* ---------- Screens ---------- */
  function showEmpty() {
    $('#cart-title').textContent = 'Your cart';
    root.innerHTML = `
      <div class="empty" style="margin-bottom:40px">
        <h3>Your cart is empty</h3>
        <p>Add a PC or a part and it will show up here.</p>
        <div class="btn-row" style="justify-content:center">
          <a class="btn btn--primary" href="/shop?cat=prebuilt">Browse prebuilt PCs</a>
          <a class="btn btn--outline" href="/build">Build your own</a>
        </div>
      </div>${recentOrdersHtml()}`;
  }

  function showCart() {
    $('#cart-title').textContent = 'Your cart';
    root.innerHTML = `
      <div class="cart">
        <div>
          <div class="lines" id="lines"></div>
          <p style="margin:14px 0 28px"><button class="linkbtn" type="button" id="clear">Empty the cart</button></p>
          ${formHtml()}
        </div>
        <aside class="summary" aria-label="Order summary">
          <div class="panel">
            <h2>Order summary</h2>
            <div id="sum"></div>
            <button class="btn btn--primary btn--block" type="submit" form="checkout" style="margin-top:16px">Place order</button>
          </div>
        </aside>
      </div>`;
    paint();
  }

  function paint() {
    $('#lines').innerHTML = store.cart.items().map(lineHtml).join('');
    $('#sum').innerHTML = summaryHtml();
  }

  function orderText(o) {
    const c = o.customer;
    const lines = o.lines.map((l, n) => `${n + 1}. ${l.name} x ${l.qty} = ${money(l.price * l.qty)}`).join('\n');
    return `Hi ${cfg.name}, I placed order ${o.id}.\n\n${lines}\n\nShipping: ${o.shipping ? money(o.shipping) : 'Free'}\nTotal: ${money(o.total)} (GST included)\n\n` +
      `Name: ${c.name}\nMobile: ${c.phone}\nAddress: ${c.address}, ${c.city} ${c.pin}\n` + (c.gst ? `GST number: ${c.gst}\n` : '') +
      `Payment: ${PAYMENT[o.payment][0]}`;
  }

  function showDone() {
    const o = done, c = o.customer;
    $('#cart-title').textContent = 'Thank you';
    root.innerHTML = `
      <div class="done">
        <div class="ico-ok">${icon('check', 34)}</div>
        <h1>Order saved</h1>
        <p>Your order number is <strong>${esc(o.id)}</strong>. Send it to us on WhatsApp so we can confirm it and share the payment details.</p>
        <dl class="sheet">
          <div><dt>Items</dt><dd>${o.lines.reduce((n, l) => n + l.qty, 0)}</dd></div>
          <div><dt>Total</dt><dd>${money(o.total)}</dd></div>
          <div><dt>Payment</dt><dd>${PAYMENT[o.payment][0]}</dd></div>
          <div><dt>Deliver to</dt><dd>${esc(c.name)}, ${esc(c.city)} ${esc(c.pin)}</dd></div>
        </dl>
        <div class="btn-row" style="justify-content:center">
          <a class="btn btn--primary" href="${esc(PCS.wa(orderText(o)))}" target="_blank" rel="noopener noreferrer">${icon('chat', 18)}Send order on WhatsApp</a>
          <a class="btn btn--outline" href="/shop">Continue shopping</a>
        </div>
        <p class="note" style="margin-top:18px">This demo keeps orders in this browser only. Nothing is sent until you press the WhatsApp button.</p>
      </div>`;
    document.title = 'Order saved | ' + cfg.name;
    window.scrollTo(0, 0);
  }

  /* ---------- Place the order ---------- */
  function place() {
    let first = null;
    RULES.forEach(r => {
      const input = $('#f-' + r[0]), bad = !r[1](input.value);
      input.setAttribute('aria-invalid', String(bad));
      $('#e-' + r[0]).textContent = bad ? r[2] : '';
      if (bad && !first) first = input;
    });
    if (first) { first.focus(); return; }

    const v = id => $('#f-' + id).value.trim();
    const c = store.cart;
    const order = {
      id: 'ORD-' + Date.now().toString(36).toUpperCase(),
      date: new Date().toISOString(),
      lines: c.items().map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, qty: i.qty })),
      subtotal: c.subtotal(), shipping: c.shipping(), total: c.total(), gst: Math.round(c.gst()),
      payment: $('input[name="pay"]:checked').value,
      customer: { name: v('name'), phone: v('phone'), email: v('email'), address: v('addr'), city: v('city'), pin: v('pin'), gst: v('gst') }
    };
    done = order;                        // set first so clearing the cart does not flash the empty screen
    store.orders.save(order);
    c.clear();
    showDone();
  }

  /* ---------- Events ---------- */
  root.addEventListener('click', e => {
    if (e.target.closest('#clear')) { store.cart.clear(); return; }
    const row = e.target.closest('.line');
    if (!row) return;
    const id = row.dataset.id, qty = store.cart.qty(id), p = PCS.byId[id];
    if (e.target.closest('[data-inc]')) { store.cart.setQty(id, qty + 1); const b = $(`.line[data-id="${id}"] [data-inc]`); if (b && !b.disabled) b.focus(); }
    else if (e.target.closest('[data-dec]')) { store.cart.setQty(id, qty - 1); const b = $(`.line[data-id="${id}"] [data-dec]`); if (b) b.focus(); }
    else if (e.target.closest('[data-remove]')) { store.cart.remove(id); ui.toast(`${icon('check', 18)}<span>Removed: ${esc(p.name)}</span>`); }
  });
  root.addEventListener('submit', e => {
    if (e.target.id === 'checkout') { e.preventDefault(); place(); }
  });

  function onChange() {
    if (done) return;
    if (!store.cart.count()) showEmpty();
    else if ($('#lines')) paint();
    else showCart();
  }
  store.on(onChange);
  onChange();
})(window.PCS);
