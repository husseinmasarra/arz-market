const { Pool } = require('pg');
const https = require('https');
const fs = require('fs');
const path = require('path');

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.deal.com.lb/'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fixSandwichGrill() {
  console.log('--- Fetching real image for Product 4474 (Double Sided Sandwich Grill) ---');
  // URL encode Arabic characters in image URL
  const imgUrl = 'https://www.deal.com.lb/dealuploads/' + encodeURIComponent('img-Double-Sided-Sandwich-Grill--شواية-توست-وسندويش-مزدوجة-1790518723.jfif');
  try {
    const buf = await downloadBuffer(imgUrl);
    console.log('Downloaded buffer size:', buf.length);
    const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
    
    // Save locally
    const origPath = path.join(__dirname, 'deal_originals', 'deal_71937_sandwich_grill.jfif');
    fs.writeFileSync(origPath, buf);

    // Update in DB
    const res = await pool.query('UPDATE products SET image_url = $1 WHERE id = 4474 RETURNING id, name_ar', [dataUrl]);
    console.log('Updated product 4474 in DB:', res.rows[0]);
  } catch (err) {
    console.error('Error fixing sandwich grill:', err);
  }

  await pool.end();
}

fixSandwichGrill();
