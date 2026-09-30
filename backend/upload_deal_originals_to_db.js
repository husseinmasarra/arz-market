const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
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
  console.log('=== ATTACHING EXACT ORIGINAL IMAGES FROM deal_originals TO POSTGRESQL ===\n');

  // Load manifest if present
  let manifest = {};
  if (fs.existsSync(path.join(ORIGINALS_DIR, '_manifest.json'))) {
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(ORIGINALS_DIR, '_manifest.json'), 'utf8'));
      console.log(`Loaded manifest with ${Object.keys(manifest).length} items`);
    } catch (e) {}
  }

  // Fetch all products that have deal image or are from Deal.com.lb
  const res = await pool.query(`
    SELECT id, name_ar, name_en, image_url, sku, merchant_id 
    FROM products 
    WHERE image_url LIKE '%deal_%' 
       OR image_url LIKE '%dealuploads%' 
       OR merchant_id = (SELECT id FROM merchants WHERE name = 'Deal.com.lb' LIMIT 1)
  `);

  console.log(`Found ${res.rows.length} deal products to process.`);

  let updated = 0;
  let alreadyBase64 = 0;
  let notFound = 0;

  for (const p of res.rows) {
    if (p.image_url && p.image_url.startsWith('data:image')) {
      alreadyBase64++;
      continue;
    }

    let targetFile = null;

    // 1. Check filename from image_url
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

    // 2. Check SKU or manifest
    if (!targetFile && p.sku) {
      const cand = `deal_${p.sku}.jpg`;
      const p1 = path.join(ORIGINALS_DIR, cand);
      if (fs.existsSync(p1)) targetFile = p1;
    }

    if (targetFile) {
      const dataUrl = fileToBase64DataUrl(targetFile);
      await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [dataUrl, p.id]);
      updated++;
      if (updated % 50 === 0) {
        console.log(`Processed ${updated}/${res.rows.length} products...`);
      }
    } else {
      notFound++;
      console.warn(`Could not find local image for Product ID ${p.id}: ${p.name_en} (${p.image_url})`);
    }
  }

  console.log(`\n=== COMPLETED ===`);
  console.log(`Updated with exact original base64 images: ${updated}`);
  console.log(`Already base64: ${alreadyBase64}`);
  console.log(`Not found locally: ${notFound}`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
