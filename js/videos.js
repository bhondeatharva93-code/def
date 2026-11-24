/* Tech Videos page: studio video player, playlist selector, and related build cards. */
(function (PCS) {
  'use strict';
  const { $, $$, esc } = PCS.util;
  const ui = PCS.ui, icon = PCS.icon;

  ui.mount('videos', 'Tech Videos');

  const root = $('#videos-root');
  if (!root) return;

  const ytUrl = (PCS.videoConfig && PCS.videoConfig.YOUTUBE_URL) || 'https://www.youtube.com/watch?v=FoTHBvSVRA4';
  const studioVideo = '/assets/aistudio/Tech_welcome_template_video_4d4adf51_64c1a543.mp4';

  const VIDEOS = [
    {
      id: 'studio-showcase',
      title: 'Studio PC Build & Airflow Showcase',
      duration: '0:25',
      category: 'Build Showcase',
      summary: 'A closer look at our ARGB dual-chamber and mesh-front gaming builds, tidy cable routing, and pre-dispatch testing.',
      thumb: PCS.IMAGES.hero,
      src: studioVideo,
      ctaLabel: 'Browse Gaming PCs',
      ctaHref: '/shop?cat=prebuilt',
      youtubeUrl: ytUrl
    },
    {
      id: 'custom-builder-guide',
      title: 'How to Match CPU, Motherboard & RAM',
      duration: 'Guide',
      category: 'Custom PC Build',
      summary: 'See how AM4, AM5, LGA1700, and DDR4 vs DDR5 memory compatibility work inside our Custom PC Builder.',
      thumb: PCS.IMAGES.components,
      src: studioVideo,
      ctaLabel: 'Open Custom PC Build',
      ctaHref: '/build',
      youtubeUrl: ytUrl
    },
    {
      id: 'workstation-trading',
      title: 'Multi-Monitor Trading & Editing Setups',
      duration: 'Guide',
      category: 'Workstations',
      summary: 'Compare 4-screen and 6-screen trading desktops alongside DaVinci Resolve and Premiere Pro editing builds.',
      thumb: PCS.IMAGES.workstation,
      src: studioVideo,
      ctaLabel: 'View Workstations',
      ctaHref: '/shop?use=editing',
      youtubeUrl: ytUrl
    },
    {
      id: 'gpu-cooling-check',
      title: 'GPU Clearance, Airflow & PSU Sizing',
      duration: 'Guide',
      category: 'Hardware Lab',
      summary: 'Learn how we size 550W to 850W power supplies and verify GPU thermal headroom during our 30-minute load test.',
      thumb: PCS.IMAGES.gpuCase,
      src: studioVideo,
      ctaLabel: 'Shop Graphics Cards',
      ctaHref: '/shop?cat=gpu',
      youtubeUrl: ytUrl
    }
  ];

  let activeId = VIDEOS[0].id;

  function render() {
    const active = VIDEOS.find(v => v.id === activeId) || VIDEOS[0];
    root.innerHTML = `
      <section class="video-stage" aria-label="Featured tech video player">
        <div class="video-player-box">
          <video controls playsinline preload="metadata" poster="${esc(active.thumb)}" src="${esc(active.src)}">
            Your browser does not support inline video playback.
          </video>
          <div class="video-player-meta">
            <span class="eyebrow">${esc(active.category)} · ${esc(active.duration)}</span>
            <h2>${esc(active.title)}</h2>
            <p>${esc(active.summary)}</p>
            <div class="btn-row" style="margin-top:1rem">
              <a class="btn btn--primary btn--sm" href="${esc(active.ctaHref)}">${esc(active.ctaLabel)}</a>
              <a class="btn btn--outline-white btn--sm" href="${esc(active.youtubeUrl)}" target="_blank" rel="noopener noreferrer">${icon('youtube', 16)}Watch on YouTube</a>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Up next</h2>
          <div class="video-list" role="group" aria-label="Select a tech video">
            ${VIDEOS.map(v => `
              <button class="video-item" type="button" data-video-id="${esc(v.id)}" aria-pressed="${v.id === active.id}">
                <span class="video-item__thumb"><img src="${esc(v.thumb)}" alt="${esc(v.title)}" loading="lazy"></span>
                <span>
                  <strong>${esc(v.title)}</strong>
                  <small>${esc(v.category)} · ${esc(v.duration)}</small>
                </span>
              </button>`).join('')}
          </div>
        </div>
      </section>`;
  }

  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-video-id]');
    if (!btn) return;
    activeId = btn.dataset.videoId;
    render();
    const focused = $$(`[data-video-id="${activeId}"]`, root)[0];
    if (focused) focused.focus();
  });

  render();
})(window.PCS);
