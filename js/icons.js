/* Inline SVG icons, studio photography mapping, and resilient fallback artwork. */
(function (PCS) {
  'use strict';

  /* Generated studio product photography assets */
  PCS.IMAGES = {
    hero: '/src/assets/images/hero_showcase_pcs_1795498052485.jpg',
    prebuilt: '/src/assets/images/cat_prebuilt_tower_1795498053238.jpg',
    workstation: '/src/assets/images/cat_workstation_setup_1795498052574.jpg',
    components: '/src/assets/images/cat_pc_components_1795498053492.jpg',
    peripherals: '/src/assets/images/cat_pc_peripherals_1795498053536.jpg',
    gpuCase: '/src/assets/images/cat_gpu_case_hardware_1795498714139.jpg',
    displayOffice: '/src/assets/images/cat_display_office_gear_1795498714091.jpg'
  };

  /* 24 x 24 line icons. Each value is the inner SVG markup. */
  PCS.icons = {
    /* interface */
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h2.7l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2l1.6-7.3H6.2"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    xcircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    checkcircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',

    /* store */
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.36A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".6" fill="currentColor"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    box: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.73a2 2 0 0 0 2 0L20.7 7"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M4 9v11h16V9"/><path d="M10 20v-6h4v6"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',

    /* hardware */
    tower: '<rect x="6" y="2.5" width="12" height="19" rx="1.5"/><circle cx="12" cy="9" r="2.8"/><circle cx="12" cy="9" r=".6"/><path d="M9 16.5h6M9 19h6"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx=".6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    gpu: '<rect x="2" y="6" width="20" height="11" rx="1.5"/><circle cx="8.5" cy="11.5" r="3"/><circle cx="16" cy="11.5" r="3"/><path d="M4 17v2.5M7 17v2.5M10 17v2.5"/>',
    board: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="6" width="5" height="5" rx=".8"/><path d="M14 6h4M14 9h4M6 15h8M6 18h12M17 12v3"/>',
    ram: '<rect x="2" y="7" width="20" height="9" rx="1"/><path d="M6 10v3M10 10v3M14 10v3M18 10v3M5 16v2.5M8 16v2.5M11 16v2.5M14 16v2.5M17 16v2.5"/>',
    ssd: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h5M7 14h3"/><circle cx="17" cy="12" r="1.3"/>',
    fan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6"/><path d="M12 10.4c0-3 1.2-4.6 3-5M13.6 12c3 0 4.6 1.2 5 3M12 13.6c0 3-1.2 4.6-3 5M10.4 12c-3 0-4.6-1.2-5-3"/>',
    case: '<rect x="5" y="2.5" width="14" height="19" rx="1.5"/><path d="M9 6h6M9 9h6"/><circle cx="12" cy="16" r="2.6"/>',
    psu: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><circle cx="9" cy="12" r="3.2"/><path d="m17 9-1.4 3h2.2L16.4 15"/>',
    monitor: '<rect x="2.5" y="4" width="19" height="12.5" rx="1.5"/><path d="M8 20.5h8M12 16.5v4"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="1.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/>',
    mouse: '<rect x="6.5" y="2.5" width="11" height="19" rx="5.5"/><path d="M12 2.5v6.5"/>',
    headset: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="2.5" y="14" width="4" height="6" rx="1.5"/><rect x="17.5" y="14" width="4" height="6" rx="1.5"/><path d="M19.5 20c0 1.5-1.5 2-4 2h-2"/>',
    speaker: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="15" r="3.3"/><circle cx="12" cy="7" r="1.3"/>',
    gamepad: '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59c-.1.5-.7 5.86-.7 7.41a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z"/>',
    ups: '<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M11 9.5l-2 2.7h3l-2 2.8"/>',
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    cctv: '<rect x="2.5" y="6.5" width="14" height="8" rx="1.5"/><path d="M16.5 9.2 21.5 7v8l-5-2.2M8 14.5V19M5 19h6"/>',
    laptop: '<rect x="4.5" y="5" width="15" height="10" rx="1.2"/><path d="M2 19h20l-1.5-4h-17z"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4"/>',
    chart: '<path d="M6 4v3M6 17v3M12 3v4M12 15v6M18 6v3M18 16v2"/><rect x="4" y="7" width="4" height="10" rx=".5"/><rect x="10" y="7" width="4" height="8" rx=".5"/><rect x="16" y="9" width="4" height="7" rx=".5"/>',
    briefcase: '<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8.5 7V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v2M2.5 13h19"/>',

    /* social */
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
    youtube: '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    xsocial: '<path d="M4 4l16 16M20 4 4 20"/>'
  };

  PCS.icon = function (name, size, cls) {
    var body = PCS.icons[name] || '';
    size = size || 20;
    var rem = (size / 16) + 'rem';
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" width="' + size + '" height="' + size +
      '" style="--ico-s:' + rem + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + '</svg>';
  };

  function fan(cx, cy, r, hue) {
    var blades = '';
    for (var i = 0; i < 7; i++) {
      blades += '<path d="M0 0C.3-.18.62-.62.28-.94.05-.74-.1-.36 0 0Z" transform="rotate(' + (360 / 7 * i).toFixed(1) + ')"/>';
    }
    return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + r + ')">' +
      '<circle r="1.08" fill="#0f1830"/>' +
      '<circle r="1" fill="none" stroke="' + hue + '" stroke-width=".1"/>' +
      '<g class="fan" fill="' + hue + '" fill-opacity=".92">' + blades + '</g>' +
      '<circle r=".2" fill="#0a1222"/><circle r=".08" fill="' + hue + '"/></g>';
  }

  PCS.tower = function (hue) {
    return '<svg class="tower" viewBox="0 0 200 240" role="img" aria-label="Desktop PC with glass side panel" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="48" y="228" width="20" height="6" rx="2" fill="#0b1324"/><rect x="132" y="228" width="20" height="6" rx="2" fill="#0b1324"/>' +
      '<rect x="34" y="10" width="132" height="216" rx="12" fill="#18233f"/>' +
      '<rect x="42" y="18" width="116" height="200" rx="7" fill="#0a1222"/>' +
      '<polygon points="42,18 108,18 42,150" fill="#fff" fill-opacity=".05"/>' +
      fan(72, 50, 22, hue) + fan(72, 106, 22, hue) + fan(72, 162, 22, hue) +
      '<rect x="131" y="30" width="5" height="34" rx="1.5" fill="' + hue + '"/><rect x="140" y="30" width="5" height="34" rx="1.5" fill="' + hue + '" fill-opacity=".7"/>' +
      '<circle cx="116" cy="72" r="13" fill="#0f1830" stroke="' + hue + '" stroke-width="2.2"/><circle cx="116" cy="72" r="4" fill="' + hue + '"/>' +
      '<rect x="100" y="118" width="52" height="18" rx="3" fill="#1f2d50"/>' +
      '<circle cx="115" cy="127" r="6" fill="none" stroke="' + hue + '" stroke-width="1.6"/><circle cx="137" cy="127" r="6" fill="none" stroke="' + hue + '" stroke-width="1.6"/>' +
      '<rect x="102" y="133.5" width="48" height="1.6" rx=".8" fill="' + hue + '"/>' +
      '<rect x="42" y="192" width="116" height="26" rx="7" fill="#0e172b"/>' +
      '<path d="M54 202h92M54 207h92" stroke="#1d2a49" stroke-width="1.4" stroke-linecap="round"/>' +
      '</svg>';
  };

  var GPU_CASE_CATS = { gpu: 1, cooler: 1, 'case': 1, psu: 1 };
  var DISPLAY_OFFICE_CATS = { monitor: 1, ups: 1, printer: 1, cctv: 1 };

  PCS.productImage = function (p) {
    if (p && p.img) return p.img;
    if (p && p.cat === 'prebuilt') {
      return (p.use === 'office' || p.use === 'trading') ? PCS.IMAGES.workstation : PCS.IMAGES.prebuilt;
    }
    if (p && GPU_CASE_CATS[p.cat]) return PCS.IMAGES.gpuCase;
    if (p && DISPLAY_OFFICE_CATS[p.cat]) return PCS.IMAGES.displayOffice;
    var cat = p && PCS.catById ? PCS.catById[p.cat] : null;
    var group = cat ? cat.group : '';
    if (group === 'parts') return PCS.IMAGES.components;
    if (group === 'gear') return PCS.IMAGES.peripherals;
    if (group === 'systems' || group === 'office') return PCS.IMAGES.workstation;
    return PCS.IMAGES.prebuilt;
  };

  PCS.categoryImage = function (cat) {
    if (!cat) return PCS.IMAGES.prebuilt;
    if (cat.id === 'prebuilt') return PCS.IMAGES.prebuilt;
    if (GPU_CASE_CATS[cat.id]) return PCS.IMAGES.gpuCase;
    if (DISPLAY_OFFICE_CATS[cat.id]) return PCS.IMAGES.displayOffice;
    if (cat.group === 'parts') return PCS.IMAGES.components;
    if (cat.group === 'gear') return PCS.IMAGES.peripherals;
    return PCS.IMAGES.workstation;
  };

  function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Studio product photo with resilient fallback tile if image fails to load */
  PCS.art = function (p, big) {
    var cat = (p && PCS.catById && PCS.catById[p.cat]) || { group: 'systems', icon: 'tower', label: 'PC hardware' };
    var use = (p && p.use && PCS.useById) ? PCS.useById[p.use] : null;
    var fallback = p && p.cat === 'prebuilt'
      ? PCS.tower((use || { hue: '#e8b948' }).hue)
      : PCS.icon(cat.icon, big ? 96 : 56, 'art__icon');
    var src = PCS.productImage(p);
    var alt = escAttr((p && p.name ? p.name : cat.label) + ' studio product photograph');
    return '<div class="art art--photo" data-group="' + escAttr(cat.group) + '">' +
      '<img class="art__img" src="' + escAttr(src) + '" alt="' + alt + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">' +
      '<div class="art__fallback" hidden>' + fallback + '</div>' +
    '</div>';
  };

  PCS.categoryArt = function (cat) {
    var src = PCS.categoryImage(cat);
    var alt = escAttr((cat && cat.label ? cat.label : 'Category') + ' showcase');
    return '<div class="cat-tile__media">' +
      '<img src="' + escAttr(src) + '" alt="' + alt + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">' +
      '<div class="art__fallback" hidden>' + PCS.icon((cat && cat.icon) || 'tower', 48) + '</div>' +
      '<span class="cat-tile__ico" aria-hidden="true">' + PCS.icon((cat && cat.icon) || 'tower', 16) + '</span>' +
    '</div>';
  };
})(window.PCS);
