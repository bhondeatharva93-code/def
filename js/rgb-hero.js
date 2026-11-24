/* ==========================================================================
   Hero Editorial Visual Showcase
   Renders the large studio-lit PC visual first, followed by the big friendly
   headline and direct CTAs inside #rgb-hero. Preserves PCS.rgbHeroLogic exports.
   ========================================================================== */
(function (PCS) {
  'use strict';

  var util = PCS.util || {};
  var cfg = PCS.config || {};
  var icon = PCS.icon || function () { return ''; };

  function selectFeaturedPcs(products) {
    var list = (products || []).filter(function (p) {
      return p && p.cat === 'prebuilt' && p.use === 'gaming' && p.stock !== false;
    });
    if (!list.length) {
      list = (products || []).filter(function (p) {
        return p && p.cat === 'prebuilt' && p.stock !== false;
      });
    }
    var score = function (p) {
      var tags = p.tags || [];
      return (tags.indexOf('hot') !== -1 ? 4 : 0) +
        (tags.indexOf('best') !== -1 ? 2 : 0) +
        (tags.indexOf('new') !== -1 ? 1 : 0);
    };
    return list.slice().sort(function (a, b) {
      return score(b) - score(a);
    }).slice(0, 4);
  }

  function buildSearchHref(rawQuery) {
    var q = String(rawQuery || '').trim();
    return q ? 'shop.html?q=' + encodeURIComponent(q) : 'shop.html';
  }

  function formatProductSummary(p, discountFn, emiFn, emiCfg) {
    var off = discountFn ? discountFn(p) : 0;
    var parts = p.parts || {};
    var specLine = [parts.cpu, parts.gpu].filter(Boolean).join(' · ') ||
      ((p.specs || []).slice(0, 2).join(' · '));
    var emiMonths = (emiCfg && emiCfg.tenures && emiCfg.tenures.length)
      ? emiCfg.tenures[emiCfg.tenures.length - 1]
      : 12;
    var rate = emiCfg ? emiCfg.annualInterestPct : 0;
    var monthly = (emiFn && p.price >= 10000) ? emiFn(p.price, emiMonths, rate) : 0;
    return {
      id: p.id,
      name: p.name,
      href: 'product.html?id=' + encodeURIComponent(p.id),
      specLine: specLine,
      price: p.price,
      mrp: p.mrp,
      off: off,
      emiMonths: emiMonths,
      monthly: monthly
    };
  }

  var YOUTUBE_URL = 'https://www.youtube.com/watch?v=U8A96GBDaaA';
  var PREVIEW_SECONDS = 18;

  function extractYoutubeId(url) {
    var m = String(url || '').match(/(?:v=|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : '';
  }

  function buildYoutubeEmbedUrl(videoId, seconds, autoplay) {
    var id = String(videoId || '').trim();
    var dur = Math.max(15, Math.min(20, Number(seconds) || PREVIEW_SECONDS));
    if (!id) return '';
    return 'https://www.youtube.com/embed/' + encodeURIComponent(id) +
      '?autoplay=' + (autoplay === false ? '0' : '1') +
      '&mute=1&start=0&end=' + dur +
      '&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1';
  }

  PCS.rgbHeroLogic = {
    selectFeaturedPcs: selectFeaturedPcs,
    buildSearchHref: buildSearchHref,
    formatProductSummary: formatProductSummary,
    extractYoutubeId: extractYoutubeId,
    buildYoutubeEmbedUrl: buildYoutubeEmbedUrl
  };

  if (typeof document === 'undefined') return;

  var root = util.$ && util.$('#rgb-hero');
  if (!root) return;

  var esc = util.esc;
  var money = util.money;
  var featured = selectFeaturedPcs(PCS.products);
  var heroImg = (PCS.IMAGES && PCS.IMAGES.hero) || '/src/assets/images/hero_showcase_pcs_1795498052485.jpg';

  var activeIndex = 0;
  var timer = null;

  function slideHtml(p) {
    var info = formatProductSummary(p, PCS.discount, util.emi, cfg.emi);
    var href = '/product?id=' + encodeURIComponent(p.id);
    return (
      '<a class="hero-spot" href="' + href + '">' +
        '<div class="hero-spot__thumb">' +
          '<img src="' + esc((PCS.productImage && PCS.productImage(p)) || '') + '" alt="' + esc(p.name) + '" loading="eager" referrerpolicy="no-referrer" onerror="this.hidden=true;">' +
        '</div>' +
        '<div class="hero-spot__meta">' +
          '<span class="hero-spot__kicker">' + esc(info.specLine) + '</span>' +
          '<strong>' + esc(info.name) + '</strong>' +
          '<span class="hero-spot__price tabular">' + money(info.price) +
            (info.mrp > info.price ? ' <s>' + money(info.mrp) + '</s>' : '') +
          '</span>' +
        '</div>' +
      '</a>'
    );
  }

  root.innerHTML =
    '<div class="hero-banner">' +
      '<div class="hero-banner__media">' +
        '<img class="hero-banner__img" src="' + esc(heroImg) + '" alt="Custom gaming and creator desktop PCs on a dark studio surface" referrerpolicy="no-referrer" onerror="this.hidden=true;">' +
        '<div class="hero-banner__scrim" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="wrap hero-banner__inner">' +
        '<span class="eyebrow">Ready-to-ship &amp; Custom PCs · Delivered Across India</span>' +
        '<h1 class="hero-banner__title">Your Dream PC, Built &amp; Delivered.</h1>' +
        '<p class="hero-banner__sub">Gaming, editing, trading &amp; office PCs — stress-tested before dispatch, with every part listed and flexible EMI options.</p>' +
        '<div class="btn-row hero-banner__ctas">' +
          '<a class="btn btn--primary" href="/shop?cat=prebuilt">Browse prebuilt PCs</a>' +
          '<a class="btn btn--outline-white" href="/build">Build your own</a>' +
        '</div>' +
        (featured.length
          ? '<div class="hero-spot-wrap">' +
              '<div id="hero-spot-slot">' + slideHtml(featured[0]) + '</div>' +
              (featured.length > 1
                ? '<div class="hero-spot-dots" role="group" aria-label="Featured builds">' +
                    featured.map(function (p, i) {
                      return '<button class="hero-spot-dot" type="button" data-slide="' + i + '" aria-label="Show ' + esc(p.name) + '" aria-current="' + (i === 0 ? 'true' : 'false') + '"></button>';
                    }).join('') +
                  '</div>'
                : '') +
            '</div>'
          : '') +
      '</div>' +
    '</div>';

  function renderSlide(idx) {
    if (!featured.length) return;
    activeIndex = (idx + featured.length) % featured.length;
    var slot = util.$('#hero-spot-slot', root);
    if (slot) slot.innerHTML = slideHtml(featured[activeIndex]);
    util.$$('.hero-spot-dot', root).forEach(function (dot, i) {
      dot.setAttribute('aria-current', i === activeIndex ? 'true' : 'false');
    });
  }

  function startAuto() {
    if (featured.length < 2 || (util.prefersReducedMotion && util.prefersReducedMotion())) return;
    stopAuto();
    timer = setInterval(function () {
      renderSlide(activeIndex + 1);
    }, 5200);
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  root.addEventListener('click', function (e) {
    var dot = e.target.closest('[data-slide]');
    if (!dot) return;
    var next = Number(dot.dataset.slide);
    if (!isNaN(next) && next !== activeIndex) {
      renderSlide(next);
      startAuto();
    }
  });

  startAuto();
})(window.PCS = window.PCS || {});
