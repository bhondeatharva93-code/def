/* Offers & Deals page: renders 7 offer category cards and WhatsApp quotation CTA.
   Exports pure data & helpers on PCS.offersLogic for unit testing. */
(function (PCS) {
  'use strict';

  var OFFERS = [
    {
      title: 'Budget PC Deals',
      href: '/shop?cat=prebuilt&sort=price-asc',
      img: '/src/assets/images/cat_workstation_setup_1795498052574.jpg',
      objectPosition: '80% 72%',
      alt: 'Compact tidy desktop PC setup on a dark desk',
      icon: 'tag',
      reused: true
    },
    {
      title: 'Gaming PC Offers',
      href: '/shop?cat=prebuilt&use=gaming',
      img: '/src/assets/images/cat_prebuilt_tower_1795498053238.jpg',
      objectPosition: '50% 42%',
      alt: 'Glowing RGB gaming PC tower on a dark stone stand',
      icon: 'gamepad',
      reused: true
    },
    {
      title: 'Complete Computer Setup Deals',
      href: '/shop?cat=prebuilt',
      img: '/src/assets/images/hero_showcase_pcs_1795498052485.jpg',
      objectPosition: '50% 55%',
      alt: 'Complete computer setup with monitors, keyboard, mouse and PCs on a dark desk',
      icon: 'monitor',
      reused: true
    },
    {
      title: 'Festival Special Offers',
      href: '/shop?sort=discount',
      img: '/src/assets/images/offers/festival_special_offers.jpg',
      objectPosition: '50% 50%',
      alt: 'Desktop PC setup illuminated by warm festive lights',
      icon: 'bolt',
      reused: false
    },
    {
      title: 'Computer Components Offers',
      href: '/shop?group=parts',
      img: '/src/assets/images/cat_pc_components_1795498053492.jpg',
      objectPosition: '50% 50%',
      alt: 'Graphics card, motherboard, RAM modules and NVMe SSDs on dark stone',
      icon: 'cpu',
      reused: true
    },
    {
      title: 'Limited-Time Discounts',
      href: '/shop?sort=discount',
      img: '/src/assets/images/cat_gpu_case_hardware_1795498714139.jpg',
      objectPosition: '50% 55%',
      alt: 'Close-up of PC graphics card, chassis and power supply',
      icon: 'clock',
      reused: true
    },
    {
      title: 'Exclusive Online Deals',
      href: '/shop?sort=discount',
      img: '/src/assets/images/offers/exclusive_online_deals.jpg',
      objectPosition: '50% 50%',
      alt: 'Laptop and desktop PC side by side on a dark desk',
      icon: 'laptop',
      reused: false
    }
  ];

  function buildQuotationMessage() {
    return 'Hello Computer Galaxy, I would like a quotation. My requirement: \nMy budget: ';
  }

  PCS.offersLogic = {
    OFFERS: OFFERS,
    buildQuotationMessage: buildQuotationMessage
  };

  if (typeof document === 'undefined' || !PCS.ui) return;

  var $ = PCS.util.$;
  var esc = PCS.util.esc;
  var icon = PCS.icon;

  PCS.ui.mount('offers', 'Offers & Deals');

  var grid = $('#offers-grid');
  if (grid) {
    grid.innerHTML = OFFERS.map(function (item) {
      return (
        '<a class="offer-card" href="' + esc(item.href) + '">' +
          '<div class="offer-card__media">' +
            '<img src="' + esc(item.img) + '" alt="' + esc(item.alt) + '" loading="lazy" referrerpolicy="no-referrer" style="object-position:' + esc(item.objectPosition) + '" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">' +
            '<div class="offer-card__fallback" hidden>' + icon(item.icon, 48) + '</div>' +
          '</div>' +
          '<div class="offer-card__body">' +
            '<h2 class="offer-card__title">' + esc(item.title) + '</h2>' +
            '<span class="offer-card__cta">View offers ' + icon('arrowRight', 16) + '</span>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  var waBtn = $('#offers-wa');
  if (waBtn && typeof PCS.wa === 'function') {
    waBtn.href = PCS.wa(buildQuotationMessage());
  }
})(window.PCS = window.PCS || {});
