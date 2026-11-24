/* Small helpers shared by every page. */
(function (PCS) {
  'use strict';
  var cfg = PCS.config;

  var money = new Intl.NumberFormat(cfg.currency.locale, {
    style: 'currency', currency: cfg.currency.code, maximumFractionDigits: 0
  });
  var plain = new Intl.NumberFormat(cfg.currency.locale, { maximumFractionDigits: 0 });

  PCS.util = {
    $: function (sel, root) { return (root || document).querySelector(sel); },
    $$: function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },

    money: function (n) { return money.format(Math.round(n)); },
    num: function (n) { return plain.format(Math.round(n)); },

    /* "₹1.6L" style short form for slider labels */
    short: function (n) {
      if (n >= 100000) return '₹' + (n / 100000).toFixed(n % 100000 === 0 ? 0 : 1) + 'L';
      return '₹' + Math.round(n / 1000) + 'K';
    },

    esc: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },

    el: function (html) {
      var t = document.createElement('template');
      t.innerHTML = html.trim();
      return t.content.firstElementChild;
    },

    debounce: function (fn, ms) {
      var t;
      return function () {
        var args = arguments, self = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(self, args); }, ms || 150);
      };
    },

    clamp: function (n, lo, hi) { return Math.min(hi, Math.max(lo, n)); },

    params: function () { return new URLSearchParams(location.search); },

    /* Monthly instalment. With 0% interest this is simply amount / months. */
    emi: function (amount, months, annualPct) {
      if (!annualPct) return amount / months;
      var r = annualPct / 12 / 100;
      var f = Math.pow(1 + r, months);
      return amount * r * f / (f - 1);
    },

    prefersReducedMotion: function () {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  };

  /* WhatsApp link with a prefilled message */
  PCS.wa = function (text) {
    return 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(text);
  };
})(window.PCS);
