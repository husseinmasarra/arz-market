const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false },
  max: 20
});

const ORIGINALS_DIR = path.join(__dirname, 'deal_originals');
const UPLOADS_DIR = path.join(__dirname, 'uploads/products');

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function fileToBase64DataUrl(filePath) {
  const mime = getMimeType(filePath);
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

async function main() {
  console.log('=== ULTRA FAST PARALLEL ATTACHING DEAL IMAGES ===');
  
  const res = await pool.query(`
    SELECT id, name_ar, name_en, image_url, sku 
    FROM products 
    WHERE (image_url NOT LIKE 'data:image%' OR image_url IS NULL)
      AND (
        image_url LIKE '%deal%' 
        OR merchant_id = (SELECT id FROM merchants WHERE name = 'Deal.com.lb' LIMIT 1)
      )
  `);

  console.log(`Remaining products needing base64 image: ${res.rows.length}`);

  const updateList = [];

  for (const p of res.rows) {
    let targetFile = null;
    if (p.image_url) {
      const base = path.basename(p.image_url);
      const candidates = [
        base,
        base.replace(/\.(webp|jfif|png|jpeg)$/i, '.jpg'),
        base.replace(/\.(webp|jfif|jpg|jpeg)$/i, '.png'),
        base.replace(/\.(webp|jpg|png|jpeg)$/i, '.jfif'),
        base.replace(/\.(jfif|jpg|png|jpeg)$/i, '.webp'),
        `deal_${base}`,
        `deal_${base.replace(/\.(webp|jfif|png|jpeg)$/i, '.jpg')}`
      ];

      for (const cand of candidates) {
        const p1 = path.join(ORIGINALS_DIR, cand);
        const p2 = path.join(UPLOADS_DIR, cand);
        if (fs.existsSync(p1)) {
          targetFile = p1;
          break;
        } else if (fs.existsSync(p2)) {
          targetFile = p2;
          break;
        }
      }
    }

    if (!targetFile && p.sku) {
      const cand = `deal_${p.sku}.jpg`;
      const p1 = path.join(ORIGINALS_DIR, cand);
      if (fs.existsSync(p1)) targetFile = p1;
    }

    if (targetFile) {
      updateList.push({ id: p.id, dataUrl: fileToBase64DataUrl(targetFile) });
    }
  }

  console.log(`Ready to update ${updateList.length} products in parallel...`);

  const CONCURRENCY = 15;
  let done = 0;

  for (let i = 0; i < updateList.length; i += CONCURRENCY) {
    const chunk = updateList.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(item => pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [item.dataUrl, item.id])));
    done += chunk.length;
    process.stdout.write(`\rProgress: ${done}/${updateList.length} (${Math.round(done/updateList.length*100)}%)`);
  }

  console.log('\n\n=== COMPLETED SUCCESSFULLY ===\n');
  await pool.end();
}

main().catch(console.error);
