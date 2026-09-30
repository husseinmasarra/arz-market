const express = require('express');
const cors = require('cors');
const compression = require('compression');

let dbError = null;
try {
  require('./_src/config/db');
} catch (e) {
  dbError = e.message + '\n' + e.stack;
  console.error('DB init error:', e);
}

const app = express();
app.use(compression());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/debug-status', (req, res) => {
  res.json({
    status: 'ok',
    dbError
  });
});

app.get('/api/test-blurhash', async (req, res) => {
  try {
    const db = require('./_src/config/db');
    const rows = await db.allAsync('SELECT id, name_en, blurhash FROM products LIMIT 3');
    res.json({ success: true, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

try {
  const apiRoutes = require('./_src/routes/api');
  app.use('/api', apiRoutes);
  app.use('/', apiRoutes);
} catch (e) {
  console.error('API routes load error:', e);
  app.use('*', (req, res) => {
    res.status(500).json({ error: 'Failed to load routes', details: e.message, stack: e.stack });
  });
}

module.exports = (req, res) => {
  return app(req, res);
};
