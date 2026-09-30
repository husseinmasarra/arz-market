const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

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
  console.log('=== FIXING RAZER PRODUCTS & CATEGORY 21 ===\n');

  // 1. Ensure Category 21 is Active and properly named
  await pool.query(`
    UPDATE categories 
    SET active = 1, 
        name_ar = 'منتجات ريزر للألعاب', 
        name_en = 'Razer Gaming Gear', 
        parent_id = 80,
        image_url = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'
    WHERE id = 21
  `);
  console.log('Category 21 updated & activated.');

  // 2. Find all Razer products
  const res = await pool.query(`
    SELECT id, name_ar, name_en, category_id, image_url, sku, price_usd, stock
    FROM products 
    WHERE name_en ILIKE '%razer%' 
       OR name_ar ILIKE '%razer%' 
       OR name_ar ILIKE '%رايزر%' 
       OR name_ar ILIKE '%ريزر%'
    ORDER BY id ASC
  `);

  console.log(`Found ${res.rows.length} authentic Razer products.`);

  let updatedImages = 0;
  let remappedCategories = 0;

  for (const p of res.rows) {
    let dataUrl = p.image_url;

    // Check if local image file exists to convert to base64
    if (p.image_url && !p.image_url.startsWith('data:image')) {
      const filename = path.basename(p.image_url);
      const candidates = [
        path.join(UPLOADS_DIR, filename),
        path.join(__dirname, 'uploads', filename),
        path.join(UPLOADS_DIR, filename.replace(/\.webp$/i, '.jpg')),
        path.join(UPLOADS_DIR, filename.replace(/\.webp$/i, '.png'))
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          dataUrl = fileToBase64DataUrl(cand);
          updatedImages++;
          break;
        }
      }
    }

    // Set category to 21 (Razer Gaming)
    await pool.query(`
      UPDATE products 
      SET category_id = 21, 
          image_url = $1,
          stock = CASE WHEN stock < 1 THEN 25 ELSE stock END
      WHERE id = $2
    `, [dataUrl, p.id]);

    remappedCategories++;
    console.log(`- [ID ${p.id}] -> Cat 21 | ${p.name_en} | Base64: ${dataUrl.startsWith('data:image')}`);
  }

  console.log(`\n=== RESULT ===`);
  console.log(`Total Razer products moved to Category 21: ${remappedCategories}`);
  console.log(`Images converted to self-contained Base64: ${updatedImages}`);

  // 3. Verify Category 21 products count
  const verify = await pool.query('SELECT count(*) as c FROM products WHERE category_id = 21');
  console.log(`Total products now in Category 21: ${verify.rows[0].c}`);

  await pool.end();
}

main().catch(console.error);
