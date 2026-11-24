/* Cart, wishlist, recently viewed and orders. Saved in the browser (localStorage). */
(function (PCS) {
  'use strict';
  var cfg = PCS.config, by = PCS.byId;

  var KEY = { cart: 'pcs.cart', wish: 'pcs.wish', recent: 'pcs.recent', orders: 'pcs.orders' };
  var fallback = {};   // used if localStorage is blocked

  function read(key, empty) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : empty;
    } catch (e) {
      return key in fallback ? fallback[key] : empty;
    }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { fallback[key] = value; }
  }

  var cart = [], wish = [], recent = [];
  var listeners = [];

  function load() {
    cart = read(KEY.cart, []).filter(function (i) { return by[i.id]; });
    wish = read(KEY.wish, []).filter(function (id) { return by[id]; });
    recent = read(KEY.recent, []).filter(function (id) { return by[id]; });
  }
  function emit() { listeners.forEach(function (fn) { fn(); }); }
  function saveCart() { write(KEY.cart, cart); emit(); }

  load();
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf('pcs.') === 0) { load(); emit(); }
  });

  var store = PCS.store = {
    /* Call fn whenever cart, wishlist or recent items change */
    on: function (fn) { listeners.push(fn); },

    cart: {
      items: function () {
        return cart.map(function (i) { return { product: by[i.id], qty: i.qty }; });
      },
      count: function () { return cart.reduce(function (n, i) { return n + i.qty; }, 0); },
      qty: function (id) {
        var row = cart.filter(function (i) { return i.id === id; })[0];
        return row ? row.qty : 0;
      },
      add: function (id, qty) {
        var p = by[id];
        if (!p || !p.stock) return false;
        var row = cart.filter(function (i) { return i.id === id; })[0];
        if (row) row.qty = Math.min(10, row.qty + (qty || 1));
        else cart.push({ id: id, qty: qty || 1 });
        saveCart();
        return true;
      },
      setQty: function (id, qty) {
        if (qty <= 0) { store.cart.remove(id); return; }
        var row = cart.filter(function (i) { return i.id === id; })[0];
        if (row) { row.qty = Math.min(10, qty); saveCart(); }
      },
      remove: function (id) {
        cart = cart.filter(function (i) { return i.id !== id; });
        saveCart();
      },
      clear: function () { cart = []; saveCart(); },
      subtotal: function () {
        return cart.reduce(function (s, i) { return s + by[i.id].price * i.qty; }, 0);
      },
      shipping: function () {
        var s = store.cart.subtotal();
        return s === 0 || s >= cfg.shipping.freeAbove ? 0 : cfg.shipping.flat;
      },
      total: function () { return store.cart.subtotal() + store.cart.shipping(); },
      /* GST already included in the prices */
      gst: function () {
        var t = store.cart.total();
        return t * cfg.gstPercent / (100 + cfg.gstPercent);
      }
    },

    wish: {
      list: function () { return wish.map(function (id) { return by[id]; }); },
      has: function (id) { return wish.indexOf(id) !== -1; },
      count: function () { return wish.length; },
      toggle: function (id) {
        var i = wish.indexOf(id);
        if (i === -1) wish.push(id); else wish.splice(i, 1);
        write(KEY.wish, wish);
        emit();
        return i === -1;     // true when it was just added
      }
    },

    recent: {
      list: function () { return recent.map(function (id) { return by[id]; }); },
      push: function (id) {
        recent = [id].concat(recent.filter(function (x) { return x !== id; })).slice(0, 12);
        write(KEY.recent, recent);
        emit();
      }
    },

    orders: {
      list: function () { return read(KEY.orders, []); },
      save: function (order) {
        var all = read(KEY.orders, []);
        all.unshift(order);
        write(KEY.orders, all.slice(0, 20));
      }
    }
  };
})(window.PCS);
