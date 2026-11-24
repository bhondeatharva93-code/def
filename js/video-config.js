/* ==========================================================================
   Client intro video popup settings
   Edit these constants in one place to change the YouTube video or timing.
   ========================================================================== */
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=FoTHBvSVRA4';
const YOUTUBE_ID = 'FoTHBvSVRA4';
const PREVIEW_START_SECONDS = 0;
const PREVIEW_SECONDS = 25;
const PLAYER_MAX_WIDTH = 800;
const SHOW_ONCE_PER_SESSION = true;

window.PCS = window.PCS || {};
PCS.videoConfig = {
  YOUTUBE_URL: YOUTUBE_URL,
  YOUTUBE_ID: YOUTUBE_ID,
  PREVIEW_START_SECONDS: PREVIEW_START_SECONDS,
  PREVIEW_SECONDS: PREVIEW_SECONDS,
  PLAYER_MAX_WIDTH: PLAYER_MAX_WIDTH,
  SHOW_ONCE_PER_SESSION: SHOW_ONCE_PER_SESSION
};
