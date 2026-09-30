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

async function fixPan() {
  console.log('--- Fetching real image for Product 4487 (36cm Non-stick Iron Frying Pan) ---');
  const imgUrl = 'https://www.deal.com.lb/dealuploads/img-36cm-Non-stick-Iron-Frying-Pan-With-Double-Handles-1740493936.jpg';
  try {
    const buf = await downloadBuffer(imgUrl);
    console.log('Downloaded buffer size:', buf.length);
    const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
    
    // Save locally to deal_originals
    const origPath = path.join(__dirname, 'deal_originals', 'deal_69069_36cm_frying_pan.jpg');
    fs.writeFileSync(origPath, buf);
    console.log('Saved to deal_originals:', origPath);

    // Update product in DB
    const res = await pool.query('UPDATE products SET image_url = $1, sku = $2 WHERE id = 4487 RETURNING id, name_ar', [dataUrl, 'ARZ-69069']);
    console.log('Updated product 4487 in DB:', res.rows[0]);
  } catch (err) {
    console.error('Error fixing pan:', err);
  }

  // Also check 34cm and 32cm pans if they exist in DB
  const otherPans = await pool.query("SELECT id, name_en, name_ar, image_url FROM products WHERE name_en LIKE '%Frying Pan%'");
  console.log('\nAll Frying Pans in DB:', otherPans.rows.map(r => ({ id: r.id, name: r.name_en })));
  
  for (const pan of otherPans.rows) {
    if (pan.name_en.includes('34cm')) {
      const url34 = 'https://www.deal.com.lb/dealuploads/img-34cm-Non-stick-Iron-Frying-Pan-With-Double-Handles-1740493745.jpg';
      try {
        const b = await downloadBuffer(url34);
        const du = `data:image/jpeg;base64,${b.toString('base64')}`;
        await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [du, pan.id]);
        console.log(`Updated 34cm pan (ID ${pan.id})`);
      } catch (e) {
        console.error('Failed 34cm:', e.message);
      }
    }
    if (pan.name_en.includes('32cm')) {
      const url32 = 'https://www.deal.com.lb/dealuploads/img-32cm-Non-stick-Iron-Frying-Pan-With-Double-Handles-1740493317.jpg';
      try {
        const b = await downloadBuffer(url32);
        const du = `data:image/jpeg;base64,${b.toString('base64')}`;
        await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [du, pan.id]);
        console.log(`Updated 32cm pan (ID ${pan.id})`);
      } catch (e) {
        console.error('Failed 32cm:', e.message);
      }
    }
  }

  await pool.end();
}

fixPan();
