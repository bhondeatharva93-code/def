'use strict';

const express = require('express');
const fs = require('node:fs');
const path = require('path');
const { execFileSync } = require('node:child_process');
const { askPcAdvisor } = require('./server/gemini-assistant');

function ensureClientBundles() {
  const required = [
    path.join(__dirname, 'dist', 'data-api.js'),
    path.join(__dirname, 'dist', 'admin.js'),
  ];
  if (required.every((file) => fs.existsSync(file))) return;
  execFileSync(process.execPath, [path.join(__dirname, 'scripts', 'build.mjs')], {
    cwd: __dirname,
    stdio: 'inherit',
  });
}

ensureClientBundles();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/assistant/status', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ assistantAi: Boolean(process.env.GEMINI_API_KEY) });
});

app.post(['/api/assistant', '/chat'], async (req, res) => {
  try {
    const result = await askPcAdvisor(req.body);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      reply: result.reply,
      productIds: result.productIds,
      products: result.productIds
    });
  } catch (err) {
    const status = err && err.statusCode ? err.statusCode : 502;
    console.error('[assistant]', err && err.message ? err.message : err);
    res.status(status).json({
      error: status === 400 ? 'Invalid chat request.' : 'Assistant is temporarily unavailable.'
    });
  }
});

// Prevent direct static access to server internals, functions, rules, tests, or raw TypeScript sources
app.use(
  [
    '/server',
    '/netlify',
    '/src/services',
    '/src/admin',
    '/src/data',
    '/src/config',
    '/tests',
    '/scripts',
    '/firestore.rules',
    '/firebase-blueprint.json',
    '/eslint.config.mjs',
    '/tsconfig.json',
    '/package.json',
    '/package-lock.json',
  ],
  (_req, res) => {
    res.status(404).send('Not found');
  }
);

app.get(['/admin', '/admin/*'], (_req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use(
  '/assets',
  express.static(path.join(__dirname, 'public', 'assets'), {
    dotfiles: 'ignore'
  })
);

app.use(
  express.static(__dirname, {
    index: 'index.html',
    extensions: ['html'],
    dotfiles: 'ignore'
  })
);

// Never fall back to HTML for API routes or static asset/extension requests
app.use(['/api', '/dist', '/js', '/css', '/fonts', '/assets'], (_req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

// SPA / clean-route fallback
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    res.status(404).type('text/plain').send('Not found');
    return;
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Computer Galaxy PC Store running at http://${HOST}:${PORT}`);
});
