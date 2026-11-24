'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadIntroWithConfig() {
  const ctx = {
    console,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const cfgCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'video-config.js'), 'utf8');
  const introCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'intro.js'), 'utf8');
  vm.runInContext(cfgCode, ctx, { filename: 'video-config.js' });
  vm.runInContext(introCode, ctx, { filename: 'intro.js' });
  return {
    videoConfig: ctx.PCS.videoConfig,
    introLogic: ctx.PCS.introLogic
  };
}

test('video-config defines required client YouTube popup settings', () => {
  const { videoConfig } = loadIntroWithConfig();
  assert.equal(videoConfig.YOUTUBE_URL, 'https://www.youtube.com/watch?v=FoTHBvSVRA4');
  assert.equal(videoConfig.YOUTUBE_ID, 'FoTHBvSVRA4');
  assert.equal(videoConfig.PREVIEW_START_SECONDS, 0);
  assert.equal(videoConfig.PREVIEW_SECONDS, 25);
  assert.equal(videoConfig.PLAYER_MAX_WIDTH, 800);
  assert.equal(videoConfig.SHOW_ONCE_PER_SESSION, true);
});

test('shouldShowIntro returns true on fresh entry, reload, or external referrer', () => {
  const { introLogic } = loadIntroWithConfig();
  const origin = 'http://localhost:3000';

  assert.equal(introLogic.shouldShowIntro({ search: '', referrer: '', origin }), true);
  assert.equal(introLogic.shouldShowIntro({ search: '', referrer: 'https://aistudio.google.com/', origin }), true);
  assert.equal(introLogic.shouldShowIntro({ search: '', referrer: 'http://localhost:3000/', origin }), true);
  assert.equal(introLogic.shouldShowIntro({ search: '', referrer: 'http://localhost:3000/index.html', origin }), true);
});

test('shouldShowIntro skips intro when returning from internal pages, seen in session, query param, or reduced motion', () => {
  const { introLogic } = loadIntroWithConfig();
  const origin = 'http://localhost:3000';

  assert.equal(introLogic.shouldShowIntro({ search: '', referrer: 'http://localhost:3000/shop.html', origin }), false);
  assert.equal(introLogic.shouldShowIntro({ search: '', referrer: 'http://localhost:3000/build', origin }), false);
  assert.equal(introLogic.shouldShowIntro({ search: '?nointro=1', referrer: '', origin }), false);
  assert.equal(introLogic.shouldShowIntro({ search: '?intro=0', referrer: '', origin }), false);
  assert.equal(introLogic.shouldShowIntro({ search: '', referrer: '', origin, seen: true, showOnce: true }), false);
  assert.equal(introLogic.shouldShowIntro({ search: '?intro=1', referrer: '', origin, seen: true, showOnce: true }), true);
  assert.equal(introLogic.shouldShowIntro({ search: '?preview=1', referrer: '', origin, seen: true, showOnce: true }), true);
  assert.equal(introLogic.shouldShowIntro({ search: '', referrer: '', origin, seen: true, showOnce: false }), true);
  assert.equal(introLogic.shouldShowIntro({ search: '', referrer: '', origin, reducedMotion: true }), false);
});

test('buildYouTubePlayerVars configures muted autoplay without YouTube controls and bounded preview end', () => {
  const { videoConfig, introLogic } = loadIntroWithConfig();
  const vars = introLogic.buildYouTubePlayerVars(videoConfig, 'http://localhost:3000');

  assert.equal(vars.autoplay, 1);
  assert.equal(vars.mute, 1);
  assert.equal(vars.controls, 0);
  assert.equal(vars.playsinline, 1);
  assert.equal(vars.rel, 0);
  assert.equal(vars.modestbranding, 1);
  assert.equal(vars.iv_load_policy, 3);
  assert.equal(vars.disablekb, 1);
  assert.equal(vars.fs, 0);
  assert.equal(vars.start, 0);
  assert.equal(vars.end, 25);
  assert.equal(vars.origin, 'http://localhost:3000');
});

test('buildThumbnailUrls generates maxresdefault and hqdefault URLs for video ID', () => {
  const { videoConfig, introLogic } = loadIntroWithConfig();
  const urls = introLogic.buildThumbnailUrls(videoConfig.YOUTUBE_ID);
  assert.equal(urls.maxres, 'https://img.youtube.com/vi/FoTHBvSVRA4/maxresdefault.jpg');
  assert.equal(urls.hq, 'https://img.youtube.com/vi/FoTHBvSVRA4/hqdefault.jpg');
});
