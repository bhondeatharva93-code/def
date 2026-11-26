/* Contact page: Computer Galaxy business card, action buttons, Google Map, and enquiry form.
   Exports pure validation & message helpers on PCS.contactLogic for unit testing. */
(function (PCS) {
  'use strict';

  function buildTelHref(phone) {
    return 'tel:' + String(phone || '').replace(/[^\d+]/g, '');
  }

  function buildWhatsAppHref(whatsappNumber, text) {
    return 'https://wa.me/' + encodeURIComponent(String(whatsappNumber || '').replace(/\D/g, '')) +
      '?text=' + encodeURIComponent(text || '');
  }

  function buildDirectionsHref(mapsQuery) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(mapsQuery || '');
  }

  function buildMapEmbedUrl(mapsQuery, mapsEmbedUrl) {
    const custom = String(mapsEmbedUrl || '').trim();
    if (custom) return custom;
    return 'https://www.google.com/maps?q=' + encodeURIComponent(mapsQuery || '') + '&output=embed';
  }

  function buildOpenMapsHref(mapsQuery) {
    return 'https://www.google.com/maps?q=' + encodeURIComponent(mapsQuery || '');
  }

  function validateEnquiry(values) {
    const v = values || {};
    const errors = {};
    const name = String(v.name || '').trim();
    const phone = String(v.phone || '').trim().replace(/[\s-]/g, '');
    const email = String(v.email || '').trim();
    const pin = String(v.pin || '').trim();
    const budget = String(v.budget || '').trim();

    if (name.length < 2) errors.name = 'Enter your full name.';
    if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a 10-digit Indian mobile number starting with 6 to 9.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (pin && !/^\d{6}$/.test(pin)) errors.pin = 'Enter a 6-digit PIN code.';
    if (budget && !/^\d+$/.test(budget)) errors.budget = 'Enter numbers only for budget.';

    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function buildEnquiryMessage(values) {
    const v = values || {};
    const lines = ['Hello Computer Galaxy, I would like to make an enquiry.'];
    const pairs = [
      ['Full Name', v.name],
      ['Mobile Number', v.phone],
      ['Email Address', v.email],
      ['City & State', v.city],
      ['PIN Code', v.pin],
      ['Required PC Configuration', v.config],
      ['Budget', String(v.budget || '').trim() ? '₹' + String(v.budget || '').trim() : ''],
      ['Message', v.msg]
    ];
    pairs.forEach(function (pair) {
      const val = String(pair[1] || '').trim();
      if (val) lines.push(pair[0] + ': ' + val);
    });
    return lines.join('\n');
  }

  PCS.contactLogic = {
    buildTelHref: buildTelHref,
    buildWhatsAppHref: buildWhatsAppHref,
    buildDirectionsHref: buildDirectionsHref,
    buildMapEmbedUrl: buildMapEmbedUrl,
    buildOpenMapsHref: buildOpenMapsHref,
    validateEnquiry: validateEnquiry,
    buildEnquiryMessage: buildEnquiryMessage
  };

  if (typeof document === 'undefined' || !PCS.ui) return;

  const { $, esc } = PCS.util;
  const ui = PCS.ui, icon = PCS.icon;
  const contactCfg = PCS.contact || {
    whatsappNumber: (PCS.config && PCS.config.whatsapp) || '917014443922',
    phones: ['+91 7014443922', '+91 8852834882', '+91 7425961962'],
    email: 'computergalaxysirohi@gmail.com',
    mapsQuery: 'Iskon Plaza, Near Weblink Computer, Sirohi 307001, Rajasthan, India',
    mapsEmbedUrl: ''
  };

  ui.mount('contact', 'Contact Us');

  const infoEl = $('#contact-info');
  if (infoEl) {
    infoEl.innerHTML = `
      <div>${icon('shield', 22)}<span>GST Registered Firm</span></div>
      <div>${icon('user', 22)}<span>Owner: Ravi Kumar</span></div>
      <div>${icon('receipt', 22)}<span>GSTIN: 08BYFPP8432H1Z3</span></div>
      <div>${icon('pin', 22)}<span><strong>Our Store Address:</strong><br>Shop No. 26, 27, 28, 29, 30, 31, 32 &amp; 33,<br>Iskon Plaza, Near Weblink Computer,<br>Sirohi &ndash; 307001, Rajasthan, India.</span></div>
      <div>${icon('phone', 22)}<span><strong>Call &amp; WhatsApp:</strong><br>${contactCfg.phones.map(p => `<a href="${esc(buildTelHref(p))}">${esc(p)}</a>`).join('<br>')}</span></div>
      <div>${icon('mail', 22)}<span><strong>Email:</strong><br><a href="mailto:${esc(contactCfg.email)}">${esc(contactCfg.email)}</a></span></div>
      <div>${icon('truck', 22)}<span>Delivery: All India Delivery Available</span></div>
      <div>${icon('youtube', 22)}<span>YouTube | Facebook | Instagram: @weblinkittech</span></div>`;
  }

  const actionsEl = $('#contact-actions');
  if (actionsEl) {
    const firstPhone = contactCfg.phones[0] || '+91 7014443922';
    actionsEl.innerHTML = `
      <a class="btn btn--primary" href="${esc(buildTelHref(firstPhone))}">Call Now</a>
      <a class="btn btn--outline" href="${esc(buildWhatsAppHref(contactCfg.whatsappNumber, 'Hello Computer Galaxy, I need help with: '))}" target="_blank" rel="noopener noreferrer">WhatsApp Us</a>
      <a class="btn btn--outline" href="mailto:${esc(contactCfg.email)}">Send Email</a>
      <a class="btn btn--outline" href="${esc(buildDirectionsHref(contactCfg.mapsQuery))}" target="_blank" rel="noopener noreferrer">Get Directions</a>`;
  }

  const mapEl = $('#contact-map');
  if (mapEl) {
    mapEl.innerHTML = `<iframe title="Computer Galaxy store location in Sirohi" src="${esc(buildMapEmbedUrl(contactCfg.mapsQuery, contactCfg.mapsEmbedUrl))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }
  const openMapsEl = $('#open-maps');
  if (openMapsEl) {
    openMapsEl.href = buildOpenMapsHref(contactCfg.mapsQuery);
  }

  const form = $('#req-form'), done = $('#req-done');
  if (!form || !done) return;

  const FIELD_IDS = ['name', 'phone', 'email', 'city', 'pin', 'config', 'budget', 'msg'];

  function readValues() {
    const out = {};
    FIELD_IDS.forEach(id => {
      const el = $('#f-' + id);
      out[id] = el ? el.value : '';
    });
    return out;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const values = readValues();
    const check = validateEnquiry(values);
    let firstInvalid = null;

    FIELD_IDS.forEach(id => {
      const input = $('#f-' + id);
      const errEl = $('#fe-' + id);
      const msg = check.errors[id] || '';
      if (input) input.setAttribute('aria-invalid', String(Boolean(msg)));
      if (errEl) errEl.textContent = msg;
      if (msg && !firstInvalid && input) firstInvalid = input;
    });

    if (!check.ok) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const message = buildEnquiryMessage(values);
    $('#send-wa').href = buildWhatsAppHref(contactCfg.whatsappNumber, message);
    $('#send-mail').href = 'mailto:' + contactCfg.email + '?subject=' + encodeURIComponent('Enquiry from website') + '&body=' + encodeURIComponent(message);
    form.hidden = true;
    done.hidden = false;
    $('#send-wa').focus();
  });

  $('#req-edit').addEventListener('click', () => {
    done.hidden = true;
    form.hidden = false;
    $('#f-name').focus();
  });
})(window.PCS = window.PCS || {});
