/* Track Order page: lookup saved orders by Order ID (with pure logic exported on PCS.trackLogic). */
(function (root) {
  'use strict';

  var STAGES = [
    { key: 'placed', title: 'Order received', detail: 'Saved and ready for confirmation on WhatsApp.' },
    { key: 'assembly', title: 'Assembly', detail: 'Components installed with clean cable routing.' },
    { key: 'stress', title: 'Stress test', detail: 'CPU, GPU, RAM and SSD load verification.' },
    { key: 'packed', title: 'Damage-proof packing', detail: 'Foam insert and double-box courier seal.' },
    { key: 'shipped', title: 'Courier dispatch', detail: 'Tracking link shared once handed to courier.' }
  ];

  function normalizeOrderId(raw) {
    return String(raw || '').trim().toUpperCase();
  }

  function normalizePhoneDigits(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
    return d;
  }

  function findOrder(orders, orderId, phone) {
    var targetId = normalizeOrderId(orderId);
    if (!targetId) return null;
    var targetPhone = normalizePhoneDigits(phone);
    var list = Array.isArray(orders) ? orders : [];
    for (var i = 0; i < list.length; i += 1) {
      var o = list[i];
      if (!o || normalizeOrderId(o.id) !== targetId) continue;
      if (targetPhone) {
        var orderPhone = normalizePhoneDigits(o.customer && o.customer.phone);
        if (orderPhone && orderPhone !== targetPhone) continue;
      }
      return o;
    }
    return null;
  }

  function getStageIndex(order, nowMs) {
    if (!order || !order.date) return 0;
    var created = new Date(order.date).getTime();
    if (!isFinite(created)) return 0;
    var hours = Math.max(0, ((nowMs || Date.now()) - created) / 3600000);
    if (hours >= 48) return 4;
    if (hours >= 24) return 3;
    if (hours >= 12) return 2;
    if (hours >= 2) return 1;
    return 0;
  }

  root.PCS = root.PCS || {};
  root.PCS.trackLogic = {
    STAGES: STAGES,
    normalizeOrderId: normalizeOrderId,
    normalizePhoneDigits: normalizePhoneDigits,
    findOrder: findOrder,
    getStageIndex: getStageIndex
  };

  if (typeof document === 'undefined') return;

  var PCS = root.PCS;
  var $ = PCS.util.$;
  var esc = PCS.util.esc;
  var money = PCS.util.money;
  var ui = PCS.ui;
  var icon = PCS.icon;
  var store = PCS.store;

  ui.mount('track', 'Track Order');

  var container = $('#track-root');
  if (!container) return;

  var initialId = (PCS.util.params && PCS.util.params().get('id')) || '';
  var savedOrders = store && store.orders ? store.orders.list() : [];
  var lastSearched = initialId ? normalizeOrderId(initialId) : '';
  var activeOrder = initialId ? findOrder(savedOrders, initialId, '') : (savedOrders[0] || null);

  function renderResult() {
    var resultEl = $('#track-result');
    if (!resultEl) return;

    if (lastSearched && !activeOrder) {
      var waAsk = PCS.wa('Hi, please share an update for order ' + lastSearched + '.');
      resultEl.innerHTML =
        '<div class="empty">' +
          '<h3>Order not found on this device</h3>' +
          '<p>We could not find <strong>' + esc(lastSearched) + '</strong> in this browser\'s saved orders. Demo orders are stored locally on the device used at checkout.</p>' +
          '<div class="btn-row" style="justify-content:center">' +
            '<a class="btn btn--primary" href="' + esc(waAsk) + '" target="_blank" rel="noopener noreferrer">' + icon('chat', 18) + 'Ask status on WhatsApp</a>' +
            '<a class="btn btn--outline" href="/contact">Contact Us</a>' +
          '</div>' +
        '</div>';
      return;
    }

    if (!activeOrder) {
      resultEl.innerHTML =
        '<div class="empty">' +
          '<h3>No orders placed yet</h3>' +
          '<p>Enter an order number on the left, or place an order from the cart to track its progress here.</p>' +
          '<div class="btn-row" style="justify-content:center">' +
            '<a class="btn btn--primary" href="/shop">Browse Shop</a>' +
            '<a class="btn btn--outline" href="/build">Custom PC Build</a>' +
          '</div>' +
        '</div>';
      return;
    }

    var stageIdx = getStageIndex(activeOrder);
    var cust = activeOrder.customer || {};
    var lines = Array.isArray(activeOrder.lines) ? activeOrder.lines : [];
    var waHref = PCS.wa('Hi, checking status for order ' + activeOrder.id + '.');

    resultEl.innerHTML =
      '<section class="panel" aria-live="polite" aria-labelledby="h-track-detail">' +
        '<div class="block__head" style="margin-bottom:1rem">' +
          '<div>' +
            '<span class="eyebrow">Order Summary</span>' +
            '<h2 id="h-track-detail">' + esc(activeOrder.id) + '</h2>' +
            '<p class="note">Placed ' + esc(new Date(activeOrder.date).toLocaleDateString('en-IN')) + ' · Total ' + money(activeOrder.total || 0) + '</p>' +
          '</div>' +
          '<a class="btn btn--outline btn--sm" href="' + esc(waHref) + '" target="_blank" rel="noopener noreferrer">' + icon('chat', 16) + 'WhatsApp update</a>' +
        '</div>' +
        '<div class="track-steps" aria-label="Order progress">' +
          STAGES.map(function (st, idx) {
            var cls = idx < stageIdx ? 'is-done' : (idx === stageIdx ? 'is-active' : '');
            return '<div class="track-step ' + cls + '">' +
              '<span class="track-step__dot">' + (idx < stageIdx ? icon('check', 14) : (idx + 1)) + '</span>' +
              '<div><strong>' + esc(st.title) + '</strong><small>' + esc(st.detail) + '</small></div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<dl class="sheet">' +
          '<div><dt>Deliver to</dt><dd>' + esc(cust.name || 'Customer') + (cust.city ? ', ' + esc(cust.city) : '') + (cust.pin ? ' ' + esc(cust.pin) : '') + '</dd></div>' +
          '<div><dt>Items</dt><dd>' + lines.map(function (l) { return esc(l.name) + ' x ' + l.qty; }).join(', ') + '</dd></div>' +
          '<div><dt>Total (GST incl.)</dt><dd>' + money(activeOrder.total || 0) + '</dd></div>' +
        '</dl>' +
      '</section>';
  }

  function renderSavedList() {
    if (!savedOrders.length) return '';
    return '<div class="track-saved">' +
      '<p class="field-label" style="margin-top:0.5rem">Orders placed on this device</p>' +
      savedOrders.slice(0, 5).map(function (o) {
        return '<button class="track-order-btn" type="button" data-pick-order="' + esc(o.id) + '">' +
          '<span><strong>' + esc(o.id) + '</strong><small>' + esc(new Date(o.date).toLocaleDateString('en-IN')) + '</small></span>' +
          '<strong class="tabular">' + money(o.total || 0) + '</strong>' +
        '</button>';
      }).join('') +
    '</div>';
  }

  container.innerHTML =
    '<section class="panel" aria-labelledby="h-track-form">' +
      '<h2 id="h-track-form">Look up your order</h2>' +
      '<form id="track-form" novalidate>' +
        '<div class="field">' +
          '<label for="track-id">Order number</label>' +
          '<input class="input" id="track-id" name="orderId" autocomplete="off" placeholder="e.g. ORD-M1A2B3" value="' + esc(initialId) + '" aria-describedby="err-track-id">' +
          '<p class="err" id="err-track-id"></p>' +
        '</div>' +
        '<div class="field">' +
          '<label for="track-phone">Mobile number <small>(optional)</small></label>' +
          '<input class="input" id="track-phone" name="phone" type="tel" inputmode="numeric" placeholder="10 digits" aria-describedby="err-track-phone">' +
          '<p class="err" id="err-track-phone"></p>' +
        '</div>' +
        '<button class="btn btn--primary btn--block" type="submit">Track order</button>' +
      '</form>' +
      renderSavedList() +
    '</section>' +
    '<div id="track-result"></div>';

  renderResult();

  var form = $('#track-form');
  var idInput = $('#track-id');
  var phoneInput = $('#track-phone');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var rawId = normalizeOrderId(idInput.value);
    var rawPhone = phoneInput.value.trim();
    var errId = $('#err-track-id');
    var errPhone = $('#err-track-phone');

    if (!rawId) {
      idInput.setAttribute('aria-invalid', 'true');
      errId.textContent = 'Enter your order number.';
      idInput.focus();
      return;
    }
    idInput.setAttribute('aria-invalid', 'false');
    errId.textContent = '';

    if (rawPhone) {
      var digits = normalizePhoneDigits(rawPhone);
      if (!/^[6-9]\d{9}$/.test(digits)) {
        phoneInput.setAttribute('aria-invalid', 'true');
        errPhone.textContent = 'Enter a 10-digit mobile number or leave it blank.';
        phoneInput.focus();
        return;
      }
    }
    phoneInput.setAttribute('aria-invalid', 'false');
    errPhone.textContent = '';

    savedOrders = store && store.orders ? store.orders.list() : [];
    lastSearched = rawId;
    activeOrder = findOrder(savedOrders, rawId, rawPhone);
    renderResult();
  });

  container.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pick-order]');
    if (!btn) return;
    var pickedId = btn.dataset.pickOrder;
    idInput.value = pickedId;
    idInput.setAttribute('aria-invalid', 'false');
    $('#err-track-id').textContent = '';
    savedOrders = store && store.orders ? store.orders.list() : [];
    lastSearched = pickedId;
    activeOrder = findOrder(savedOrders, pickedId, '');
    renderResult();
  });
})(typeof window !== 'undefined' ? window : globalThis);
