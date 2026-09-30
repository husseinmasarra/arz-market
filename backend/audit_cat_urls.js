process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith('http')) return resolve({ ok: false, status: 'no_url' });
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
    });
    req.on('error', (err) => resolve({ ok: false, status: err.message }));
    req.setTimeout(6000, () => { req.destroy(); resolve({ ok: false, status: 'timeout' }); });
  });
}

async function run() {
  const res = await pool.query('SELECT id, name_ar, name_en, image_url, parent_id FROM categories ORDER BY id ASC');
  console.log('Total categories:', res.rows.length);
  const broken = [];
  for (const cat of res.rows) {
    const result = await checkUrl(cat.image_url);
    if (!result.ok) {
      console.log(`BROKEN: [ID ${cat.id}] (Parent: ${cat.parent_id}) ${cat.name_en} / ${cat.name_ar} -> Status: ${result.status}`);
      broken.push(cat);
    }
  }
  console.log('Total broken category images:', broken.length);
  pool.end();
}
run();
