'use strict';

const express = require('express');
const path = require('path');
const { askPcAdvisor } = require('./server/gemini-assistant');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
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

// Prevent direct static access to server internals, functions, or package manifests
app.use(['/server', '/netlify', '/src/services', '/package.json', '/package-lock.json'], (_req, res) => {
  res.status(404).send('Not found');
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

// SPA / clean-route fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`YourBrand PC Store running at http://${HOST}:${PORT}`);
});
