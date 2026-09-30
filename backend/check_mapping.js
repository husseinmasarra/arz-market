const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const originalsDir = path.join(__dirname, 'deal_originals');
  const files = fs.readdirSync(originalsDir);
  console.log('Total files in deal_originals:', files.length);

  // Read manifest if exists
  let manifest = null;
  if (fs.existsSync(path.join(originalsDir, '_manifest.json'))) {
    manifest = JSON.parse(fs.readFileSync(path.join(originalsDir, '_manifest.json'), 'utf8'));
    console.log('Manifest loaded with entries:', Object.keys(manifest).length);
  }

  // Check how many products in PostgreSQL are deal products or have deal image_url
  const prods = await pool.query("SELECT id, name_ar, name_en, image_url, sku, merchant_id FROM products WHERE image_url LIKE '%deal%' OR merchant_id = (SELECT id FROM merchants WHERE name = 'Deal.com.lb' LIMIT 1)");
  console.log('Total deal products in PostgreSQL:', prods.rows.length);

  let matchedByFilename = 0;
  let matchedBySku = 0;
  let matchedByManifest = 0;

  for (const p of prods.rows) {
    const filename = p.image_url ? path.basename(p.image_url) : '';
    if (filename && fs.existsSync(path.join(originalsDir, filename))) {
      matchedByFilename++;
    } else {
      // check sku or id
      const skuFile = p.sku ? `deal_${p.sku}.jpg` : '';
      if (skuFile && fs.existsSync(path.join(originalsDir, skuFile))) {
        matchedBySku++;
      }
    }
  }

  console.log(`Matching:
    Matched directly by filename: ${matchedByFilename} / ${prods.rows.length}
    Matched by SKU: ${matchedBySku}
  `);

  await pool.end();
}

main().catch(console.error);
