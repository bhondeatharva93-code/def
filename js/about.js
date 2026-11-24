/* About Us page: store story, commitments, stress-test checklist, and storefront contact info. */
(function (PCS) {
  'use strict';
  const { $, esc } = PCS.util;
  const cfg = PCS.config, ui = PCS.ui, icon = PCS.icon;

  ui.mount('about', 'About Us');

  const root = $('#about-root');
  if (!root) return;

  const totalProducts = (PCS.products || []).length;
  const prebuiltCount = (PCS.products || []).filter(p => p.cat === 'prebuilt').length;

  root.innerHTML = `
    <section class="about-cards" aria-label="Store highlights">
      <article class="panel">
        <div class="about-stat tabular">${totalProducts}+</div>
        <h3>Curated PCs &amp; parts</h3>
        <p class="note">Prebuilt desktops, processors, graphics cards, monitors and office hardware ready to order.</p>
      </article>
      <article class="panel">
        <div class="about-stat tabular">${prebuiltCount}</div>
        <h3>Purpose-built PC lines</h3>
        <p class="note">Tuned for gaming, video editing, multi-screen trading, and everyday office or study workloads.</p>
      </article>
      <article class="panel">
        <div class="about-stat tabular">6-point</div>
        <h3>Pre-dispatch bench check</h3>
        <p class="note">Every assembled system passes CPU, GPU, memory, SSD, airflow and cable-routing verification.</p>
      </article>
    </section>

    <section class="two" aria-labelledby="h-about-promise">
      <div>
        <span class="eyebrow">Why Choose ${esc(cfg.name)}</span>
        <h2 id="h-about-promise">What goes into every build</h2>
        <ul class="facts">
          ${cfg.commitments.map(c => `<li>${icon(c.icon, 22)}<div><strong>${esc(c.title)}</strong><span>${esc(c.text)}</span></div></li>`).join('')}
        </ul>
      </div>
      <div class="report">
        <h3>Sample stress-test sheet</h3>
        <p class="report__meta">Every custom and prebuilt PC gets its own signed sheet before packing.</p>
        <dl class="sheet">
          ${cfg.testSheet.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}
        </dl>
        <div class="report__sign"><span>Tested by</span><span>Date</span></div>
      </div>
    </section>

    <section class="panel" aria-labelledby="h-about-visit">
      <div class="cta-band__row">
        <div>
          <span class="eyebrow">Visit Or Talk To Us</span>
          <h2 id="h-about-visit">${esc(cfg.name)} Storefront</h2>
          <p class="lead">${cfg.address.map(esc).join(', ')} · ${esc(cfg.hours)}</p>
        </div>
        <div class="btn-row">
          <a class="btn btn--primary" href="/build">Custom PC Build</a>
          <a class="btn btn--outline" href="/shop">Browse Shop</a>
          <a class="btn btn--outline" href="/contact">Contact Us</a>
        </div>
      </div>
    </section>`;
})(window.PCS);
