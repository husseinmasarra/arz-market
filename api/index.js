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

// Smart multi-source image proxy: GitHub Raw Repo -> AGT CDN -> Supplier Server fallback
app.get('/uploads/*', async (req, res) => {
  const relativePath = req.path.replace(/^\/uploads\//, '');
  const githubUrl = `https://raw.githubusercontent.com/husseinmasarra/arz-market/main/backend/uploads/${relativePath}`;
  const supplierUrl = `https://drphonewholesale.online/uploads/${relativePath}`;

  try {
    let upstream = await fetch(githubUrl);
    
    // If not on GitHub, check if it's an AGT (Abdul Ghani Trading) product
    if ((!upstream.ok || upstream.status === 404) && relativePath.startsWith('products/agt_')) {
      const templateId = relativePath.replace(/^products\/agt_/, '').replace(/\.webp$/, '').replace(/\.png$/, '').replace(/\.jpg$/, '');
      if (templateId) {
        upstream = await fetch(`https://www.abdulghanitrading.com/web/image/product.template/${templateId}/image_1024`);
        if (!upstream.ok || upstream.status === 404) {
          upstream = await fetch(`https://www.abdulghanitrading.com/web/image/product.template/${templateId}/image_1920`);
        }
      }
    }

    if (!upstream.ok || upstream.status === 404) {
      upstream = await fetch(supplierUrl);
    }

    if (!upstream.ok) {
      return res.status(404).send('Image Not Found');
    }

    const contentType = upstream.headers.get('content-type') || 'image/webp';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (err) {
    console.error('Image proxy error:', err);
    return res.status(500).send('Image Error');
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
