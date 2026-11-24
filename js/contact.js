/* Contact page: store details and a service-request form.
   With no server, the form builds a message and lets the visitor send it by WhatsApp or email. */
(function (PCS) {
  'use strict';
  const { $, esc } = PCS.util;
  const cfg = PCS.config, ui = PCS.ui, icon = PCS.icon;

  ui.mount('contact', 'Contact and support');

  $('#contact-info').innerHTML = `
    <div>${icon('pin', 22)}<span>${cfg.address.map(esc).join('<br>')}<br><a href="${esc(cfg.mapsUrl)}" target="_blank" rel="noopener">Get directions</a></span></div>
    <div>${icon('clock', 22)}<span>${esc(cfg.hours)}</span></div>
    <div>${icon('phone', 22)}<span><a href="tel:${esc(cfg.phoneTel)}">${esc(cfg.phone)}</a></span></div>
    <div>${icon('chat', 22)}<span><a href="${esc(PCS.wa('Hi, I have a question.'))}" target="_blank" rel="noopener">Message us on WhatsApp</a></span></div>
    <div>${icon('receipt', 22)}<span><a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></span></div>`;

  const TYPES = ['Warranty claim', 'Repair or service', 'Order or delivery question', 'Return or refund', 'Product question', 'Something else'];
  $('#r-type').innerHTML = '<option value="">Choose one</option>' + TYPES.map(t => `<option>${esc(t)}</option>`).join('');

  const RULES = [
    ['name', v => v.trim().length >= 2, 'Enter your full name.'],
    ['phone', v => {
      let d = v.replace(/\D/g, '');
      if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
      return /^[6-9]\d{9}$/.test(d);
    }, 'Enter a 10-digit mobile number.'],
    ['type', v => !!v, 'Choose what you need help with.'],
    ['msg', v => v.trim().length >= 10, 'Describe the problem in a few words (at least 10 characters).']
  ];

  const form = $('#req-form'), done = $('#req-done');

  form.addEventListener('submit', e => {
    e.preventDefault();
    let first = null;
    RULES.forEach(r => {
      const input = $('#r-' + r[0]), bad = !r[1](input.value);
      input.setAttribute('aria-invalid', String(bad));
      $('#re-' + r[0]).textContent = bad ? r[2] : '';
      if (bad && !first) first = input;
    });
    if (first) { first.focus(); return; }

    const v = id => $('#r-' + id).value.trim();
    const text = `Hi ${cfg.name}, I need help.\n\nType: ${v('type')}\n` + (v('ref') ? `Order or invoice: ${v('ref')}\n` : '') +
      `Name: ${v('name')}\nMobile: ${v('phone')}\n\n${v('msg')}`;
    $('#send-wa').href = PCS.wa(text);
    $('#send-mail').href = 'mailto:' + cfg.email + '?subject=' + encodeURIComponent(v('type') + ' - ' + v('name')) + '&body=' + encodeURIComponent(text);
    form.hidden = true;
    done.hidden = false;
    $('#send-wa').focus();
  });

  $('#req-edit').addEventListener('click', () => {
    done.hidden = true;
    form.hidden = false;
    $('#r-msg').focus();
  });
})(window.PCS);
