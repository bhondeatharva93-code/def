/* ==========================================================================
   Welcome YouTube Video Popup Controller
   Uses YouTube IFrame Player API with muted autoplay, 25s playback timer,
   privacy-enhanced youtube-nocookie.com (falling back cleanly to youtube.com
   or thumbnail card), click-through YouTube links, and full keyboard/a11y.
   Pure logic is exposed at window.PCS.introLogic for node:test unit testing.
   ========================================================================== */
(function (root) {
  'use strict';

  var INTERNAL_SUBPAGES = /^\/(?:shop|offers|product|build|cart|contact|policies|about|videos|track-order)(?:\.html)?$/i;
  var SESSION_KEY = 'pcs.yt_intro.seen';
  var YOUTUBE_API_SRC = 'https://www.youtube.com/iframe_api';

  var DEFAULT_CFG = {
    YOUTUBE_URL: 'https://www.youtube.com/watch?v=FoTHBvSVRA4',
    YOUTUBE_ID: 'FoTHBvSVRA4',
    PREVIEW_START_SECONDS: 0,
    PREVIEW_SECONDS: 25,
    PLAYER_MAX_WIDTH: 800,
    SHOW_ONCE_PER_SESSION: true
  };

  function getConfig(overrideCfg) {
    var src = overrideCfg || (root.PCS && root.PCS.videoConfig) || {};
    var start = Number(src.PREVIEW_START_SECONDS);
    var preview = Number(src.PREVIEW_SECONDS);
    var maxW = Number(src.PLAYER_MAX_WIDTH);
    return {
      YOUTUBE_URL: src.YOUTUBE_URL || DEFAULT_CFG.YOUTUBE_URL,
      YOUTUBE_ID: src.YOUTUBE_ID || DEFAULT_CFG.YOUTUBE_ID,
      PREVIEW_START_SECONDS: isFinite(start) && start >= 0 ? start : DEFAULT_CFG.PREVIEW_START_SECONDS,
      PREVIEW_SECONDS: isFinite(preview) && preview > 0 ? preview : DEFAULT_CFG.PREVIEW_SECONDS,
      PLAYER_MAX_WIDTH: isFinite(maxW) && maxW > 0 ? maxW : DEFAULT_CFG.PLAYER_MAX_WIDTH,
      SHOW_ONCE_PER_SESSION: src.SHOW_ONCE_PER_SESSION !== undefined ? Boolean(src.SHOW_ONCE_PER_SESSION) : DEFAULT_CFG.SHOW_ONCE_PER_SESSION
    };
  }

  function shouldShowIntro(opts) {
    var search = (opts && opts.search) || '';
    var referrer = (opts && opts.referrer) || '';
    var origin = (opts && opts.origin) || '';
    var seen = Boolean(opts && opts.seen);
    var showOnce = opts && opts.showOnce !== undefined ? Boolean(opts.showOnce) : true;
    var reducedMotion = Boolean(opts && opts.reducedMotion);

    if (reducedMotion) return false;

    try {
      var params = new URLSearchParams(search);
      if (params.get('intro') === '1' || params.get('preview') === '1') {
        return true;
      }
      if (params.get('nointro') === '1' || params.get('intro') === '0' || params.get('autostart') === '1') {
        return false;
      }
    } catch (_e) {
      // Ignore malformed query string
    }

    if (showOnce && seen) return false;

    if (referrer && origin) {
      try {
        var refUrl = new URL(referrer);
        if (refUrl.origin === origin && INTERNAL_SUBPAGES.test(refUrl.pathname)) {
          return false;
        }
      } catch (_e2) {
        // Ignore invalid referrer
      }
    }

    return true;
  }

  function buildYouTubePlayerVars(cfg, origin) {
    var c = getConfig(cfg);
    var vars = {
      autoplay: 1,
      mute: 1,
      controls: 0,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      disablekb: 1,
      fs: 0,
      start: c.PREVIEW_START_SECONDS,
      end: c.PREVIEW_START_SECONDS + c.PREVIEW_SECONDS
    };
    if (origin) vars.origin = origin;
    return vars;
  }

  function buildThumbnailUrls(videoId) {
    var id = encodeURIComponent(String(videoId || DEFAULT_CFG.YOUTUBE_ID));
    return {
      maxres: 'https://img.youtube.com/vi/' + id + '/maxresdefault.jpg',
      hq: 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg'
    };
  }

  root.PCS = root.PCS || {};
  root.PCS.introLogic = {
    getConfig: getConfig,
    shouldShowIntro: shouldShowIntro,
    buildYouTubePlayerVars: buildYouTubePlayerVars,
    buildThumbnailUrls: buildThumbnailUrls
  };

  if (typeof document === 'undefined') return;

  var splash = document.getElementById('intro-splash');
  if (!splash) return;

  var cfg = getConfig();
  var prefersReducedMotion = false;
  try {
    prefersReducedMotion = Boolean(
      root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch (_e) {
    prefersReducedMotion = false;
  }

  var seenInSession = false;
  try {
    seenInSession = Boolean(root.sessionStorage && root.sessionStorage.getItem(SESSION_KEY) === '1');
  } catch (_e) {
    seenInSession = false;
  }

  var show = shouldShowIntro({
    search: root.location ? root.location.search : '',
    referrer: document.referrer || '',
    origin: root.location ? root.location.origin : '',
    seen: seenInSession,
    showOnce: cfg.SHOW_ONCE_PER_SESSION,
    reducedMotion: prefersReducedMotion
  });

  if (!show) {
    document.documentElement.classList.remove('intro-active');
    if (splash.parentNode) splash.parentNode.removeChild(splash);
    return;
  }

  var popup = document.getElementById('intro-popup');
  var playerHostEl = document.getElementById('intro-yt-player');
  var stageEl = document.getElementById('intro-stage');
  var fallbackEl = document.getElementById('intro-fallback');
  var thumbEl = document.getElementById('intro-thumb');
  var fallbackPlayEl = document.getElementById('intro-fallback-play');
  var coverEl = document.getElementById('intro-cover');
  var watchEl = document.getElementById('intro-watch');
  var skipBtn = document.getElementById('intro-skip');
  var muteBtn = document.getElementById('intro-mute');
  var progressFill = document.getElementById('intro-progress');

  if (popup) {
    popup.style.setProperty('--video-max-w', cfg.PLAYER_MAX_WIDTH + 'px');
  }

  /* Sync configured YouTube URL across all links */
  [coverEl, watchEl, fallbackPlayEl].forEach(function (link) {
    if (link) link.href = cfg.YOUTUBE_URL;
  });

  var previousFocus = null;
  try {
    previousFocus = document.activeElement;
  } catch (_e) {
    previousFocus = null;
  }

  var finished = false;
  var inFallback = false;
  var hasStartedPlaying = false;
  var isMuted = true;
  var player = null;
  var triedStandardHost = false;

  var startupTimer = 0;
  var apiWaitTimer = 0;
  var fallbackTimer = 0;
  var progressRaf = 0;
  var playbackMs = 0;
  var lastTickAt = 0;
  var isCurrentlyPlaying = false;
  var previewDurationMs = cfg.PREVIEW_SECONDS * 1000;

  function markSeen() {
    if (!cfg.SHOW_ONCE_PER_SESSION) return;
    try {
      if (root.sessionStorage) root.sessionStorage.setItem(SESSION_KEY, '1');
    } catch (_e) {
      // Ignore blocked storage
    }
  }

  function destroyPlayer() {
    if (!player) return;
    try {
      if (typeof player.stopVideo === 'function') player.stopVideo();
    } catch (_e) {}
    try {
      if (typeof player.destroy === 'function') player.destroy();
    } catch (_e2) {}
    player = null;
  }

  function stopAllTimers() {
    clearTimeout(startupTimer);
    clearTimeout(apiWaitTimer);
    clearTimeout(fallbackTimer);
    if (progressRaf) {
      cancelAnimationFrame(progressRaf);
      progressRaf = 0;
    }
  }

  function dismissIntro() {
    if (finished) return;
    finished = true;
    markSeen();
    stopAllTimers();
    isCurrentlyPlaying = false;

    document.removeEventListener('keydown', onKeyDown);
    destroyPlayer();

    document.documentElement.classList.remove('intro-active');
    splash.classList.add('is-leaving');

    setTimeout(function () {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
      try {
        if (previousFocus && typeof previousFocus.focus === 'function' && document.contains(previousFocus)) {
          previousFocus.focus({ preventScroll: true });
        }
      } catch (_e) {
        // Ignore focus restoration errors
      }
    }, 260);
  }

  function setProgressPct(pct) {
    if (!progressFill) return;
    var clamped = Math.min(100, Math.max(0, pct));
    progressFill.style.width = clamped.toFixed(1) + '%';
  }

  function tickPlayback() {
    if (finished || inFallback) return;
    var now = Date.now();
    if (isCurrentlyPlaying && lastTickAt > 0) {
      playbackMs += now - lastTickAt;
    }
    lastTickAt = now;
    setProgressPct((playbackMs / previewDurationMs) * 100);
    if (playbackMs >= previewDurationMs) {
      dismissIntro();
      return;
    }
    if (isCurrentlyPlaying) {
      progressRaf = requestAnimationFrame(tickPlayback);
    } else {
      progressRaf = 0;
    }
  }

  function startPlayingClock() {
    if (isCurrentlyPlaying || finished || inFallback) return;
    isCurrentlyPlaying = true;
    lastTickAt = Date.now();
    if (!progressRaf) {
      progressRaf = requestAnimationFrame(tickPlayback);
    }
  }

  function pausePlayingClock() {
    if (!isCurrentlyPlaying) return;
    var now = Date.now();
    if (lastTickAt > 0) playbackMs += now - lastTickAt;
    lastTickAt = 0;
    isCurrentlyPlaying = false;
    if (progressRaf) {
      cancelAnimationFrame(progressRaf);
      progressRaf = 0;
    }
  }

  function syncMuteUI() {
    if (!muteBtn) return;
    muteBtn.setAttribute('aria-pressed', String(!isMuted));
    muteBtn.setAttribute('aria-label', isMuted ? 'Unmute video sound' : 'Mute video sound');
    var label = muteBtn.querySelector('span');
    if (label) label.textContent = isMuted ? 'Sound Off' : 'Sound On';
  }

  function showThumbnailFallback() {
    if (finished || inFallback) return;
    inFallback = true;
    stopAllTimers();
    isCurrentlyPlaying = false;
    destroyPlayer();

    if (stageEl) stageEl.hidden = true;
    if (coverEl) coverEl.hidden = true;
    if (muteBtn) muteBtn.hidden = true;
    if (fallbackEl) fallbackEl.hidden = false;

    if (thumbEl) {
      var urls = buildThumbnailUrls(cfg.YOUTUBE_ID);
      thumbEl.onerror = function () {
        if (!thumbEl.dataset.hqTried) {
          thumbEl.dataset.hqTried = '1';
          thumbEl.src = urls.hq;
        }
      };
      thumbEl.onload = function () {
        if (thumbEl.naturalWidth <= 120 && !thumbEl.dataset.hqTried) {
          thumbEl.dataset.hqTried = '1';
          thumbEl.src = urls.hq;
        }
      };
      thumbEl.src = urls.maxres;
    }

    var fallbackStart = Date.now();
    var fallbackMs = 8000;
    function tickFallback() {
      if (finished) return;
      var elapsed = Date.now() - fallbackStart;
      setProgressPct((elapsed / fallbackMs) * 100);
      if (elapsed >= fallbackMs) {
        dismissIntro();
        return;
      }
      progressRaf = requestAnimationFrame(tickFallback);
    }
    progressRaf = requestAnimationFrame(tickFallback);
    fallbackTimer = setTimeout(dismissIntro, fallbackMs);
  }

  function getFocusableControls() {
    if (!popup) return [];
    var nodes = popup.querySelectorAll('a[href], button:not([disabled])');
    var list = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      if (!el.hidden && !el.closest('[hidden]') && el.offsetParent !== null) {
        list.push(el);
      }
    }
    return list;
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismissIntro();
      return;
    }
    if (e.key === 'Tab') {
      var focusables = getFocusableControls();
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      var active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !popup.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !popup.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  document.addEventListener('keydown', onKeyDown);

  if (skipBtn) {
    skipBtn.addEventListener('click', dismissIntro);
    try {
      skipBtn.focus({ preventScroll: true });
    } catch (_e) {
      // Ignore early focus failure
    }
  }

  /* Clicking dimmed backdrop closes the popup */
  splash.addEventListener('click', function (e) {
    if (e.target === splash) {
      dismissIntro();
    }
  });

  /* Clicking video overlay, CTA, or fallback play opens YouTube in new tab and closes popup */
  [coverEl, watchEl, fallbackPlayEl].forEach(function (link) {
    if (!link) return;
    link.addEventListener('click', function () {
      setTimeout(dismissIntro, 50);
    });
  });

  syncMuteUI();
  if (muteBtn) {
    muteBtn.addEventListener('click', function () {
      if (!player) return;
      try {
        if (isMuted) {
          if (typeof player.unMute === 'function') player.unMute();
          isMuted = false;
        } else {
          if (typeof player.mute === 'function') player.mute();
          isMuted = true;
        }
        syncMuteUI();
      } catch (_e) {
        // Ignore mute errors if player not ready
      }
    });
  }

  function createPlayer(hostDomain) {
    if (finished || inFallback || !root.YT || typeof root.YT.Player !== 'function' || !playerHostEl) {
      showThumbnailFallback();
      return;
    }

    /* Reset host container cleanly if retrying with youtube.com */
    stageEl.innerHTML = '<div class="intro-popup__player" id="intro-yt-player"></div>';
    playerHostEl = document.getElementById('intro-yt-player');

    var playerOrigin = (root.location && /^https?:/.test(root.location.origin || ''))
      ? root.location.origin
      : undefined;

    try {
      player = new root.YT.Player(playerHostEl, {
        host: hostDomain,
        videoId: cfg.YOUTUBE_ID,
        playerVars: buildYouTubePlayerVars(cfg, playerOrigin),
        events: {
          onReady: function (ev) {
            if (finished || inFallback) {
              destroyPlayer();
              return;
            }
            try {
              if (ev && ev.target && typeof ev.target.mute === 'function') ev.target.mute();
              if (ev && ev.target && typeof ev.target.playVideo === 'function') ev.target.playVideo();
            } catch (_e) {}
          },
          onStateChange: function (ev) {
            if (finished || inFallback || !ev) return;
            var state = ev.data;
            var YTState = root.YT && root.YT.PlayerState ? root.YT.PlayerState : {};
            if (state === (YTState.PLAYING !== undefined ? YTState.PLAYING : 1)) {
              hasStartedPlaying = true;
              clearTimeout(startupTimer);
              try {
                if (typeof player.isMuted === 'function') {
                  isMuted = Boolean(player.isMuted());
                  syncMuteUI();
                }
              } catch (_e) {}
              startPlayingClock();
            } else if (state === (YTState.ENDED !== undefined ? YTState.ENDED : 0)) {
              dismissIntro();
            } else {
              pausePlayingClock();
            }
          },
          onError: function () {
            if (finished || inFallback) return;
            /* Retry once on youtube.com if privacy-enhanced domain failed before playback started */
            if (!triedStandardHost && hostDomain === 'https://www.youtube-nocookie.com' && !hasStartedPlaying) {
              triedStandardHost = true;
              clearTimeout(startupTimer);
              startupTimer = setTimeout(function () {
                if (!hasStartedPlaying && !inFallback && !finished) {
                  dismissIntro();
                }
              }, 3500);
              destroyPlayer();
              createPlayer('https://www.youtube.com');
              return;
            }
            showThumbnailFallback();
          }
        }
      });
    } catch (_err) {
      if (!triedStandardHost && hostDomain === 'https://www.youtube-nocookie.com') {
        triedStandardHost = true;
        clearTimeout(startupTimer);
        startupTimer = setTimeout(function () {
          if (!hasStartedPlaying && !inFallback && !finished) {
            dismissIntro();
          }
        }, 3500);
        createPlayer('https://www.youtube.com');
      } else {
        showThumbnailFallback();
      }
    }
  }

  function loadYouTubeApi() {
    /* Close silently if video does not start playing within 6 seconds */
    startupTimer = setTimeout(function () {
      if (!hasStartedPlaying && !inFallback && !finished) {
        dismissIntro();
      }
    }, 6000);

    if (root.YT && typeof root.YT.Player === 'function') {
      createPlayer('https://www.youtube-nocookie.com');
      return;
    }

    var prevReady = root.onYouTubeIframeAPIReady;
    root.onYouTubeIframeAPIReady = function () {
      clearTimeout(apiWaitTimer);
      if (typeof prevReady === 'function') {
        try { prevReady(); } catch (_e) {}
      }
      if (!finished && !inFallback) {
        createPlayer('https://www.youtube-nocookie.com');
      }
    };

    /* Guard against loading iframe_api more than once */
    var existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      var tag = document.createElement('script');
      tag.src = YOUTUBE_API_SRC;
      tag.async = true;
      tag.onerror = function () {
        clearTimeout(apiWaitTimer);
        showThumbnailFallback();
      };
      var firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(tag, firstScript);
      } else if (document.head) {
        document.head.appendChild(tag);
      }
    }

    /* If API script fails silently or times out before playback begins */
    apiWaitTimer = setTimeout(function () {
      if (!root.YT || typeof root.YT.Player !== 'function') {
        showThumbnailFallback();
      }
    }, 4500);
  }

  loadYouTubeApi();
})(typeof window !== 'undefined' ? window : globalThis);
