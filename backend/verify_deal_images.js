const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query("SELECT id, name_ar, name_en, image_url FROM products WHERE image_url LIKE '/uploads/products/deal_%'");
  console.log('Total deal products in DB:', res.rows.length);
  
  let foundInOriginals = 0;
  let foundInUploads = 0;
  let missing = 0;
  
  const originalsDir = path.join(__dirname, 'deal_originals');
  const uploadsDir = path.join(__dirname, 'uploads/products');
  
  for (const r of res.rows) {
    const filename = path.basename(r.image_url);
    const origPath = path.join(originalsDir, filename);
    const upPath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(origPath)) {
      foundInOriginals++;
    }
    if (fs.existsSync(upPath)) {
      foundInUploads++;
    }
    if (!fs.existsSync(origPath) && !fs.existsSync(upPath)) {
      missing++;
      if (missing <= 5) console.log('Missing locally:', filename, r.name_en);
    }
  }
  
  console.log(`Summary:
    Found in deal_originals: ${foundInOriginals} / ${res.rows.length}
    Found in uploads/products: ${foundInUploads} / ${res.rows.length}
    Missing completely locally: ${missing}
  `);
  
  await pool.end();
}

main().catch(console.error);
