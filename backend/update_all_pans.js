const { Pool } = require('pg');
const https = require('https');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});
const agent = new https.Agent({ rejectUnauthorized: false });

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.deal.com.lb/'
      }
    }, (res) => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function run() {
  const b32 = await downloadBuffer('https://www.deal.com.lb/dealuploads/img-32cm-Non-stick-Iron-Frying-Pan-With-Double-Handles-1740493317.jpg');
  const du32 = 'data:image/jpeg;base64,' + b32.toString('base64');
  await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [du32, 4489]);
  console.log('Successfully updated pan ID 4489 with 32cm pan photo');

  const b34 = await downloadBuffer('https://www.deal.com.lb/dealuploads/img-34cm-Non-stick-Iron-Frying-Pan-With-Double-Handles-1740493745.jpg');
  const du34 = 'data:image/jpeg;base64,' + b34.toString('base64');
  await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [du34, 4488]);
  console.log('Successfully updated pan ID 4488 with 34cm pan photo');

  await pool.end();
}
run();
