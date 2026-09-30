const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query(`
    SELECT id, name_en, name_ar, category_id, merchant_id, image_url, images 
    FROM products 
    WHERE name_en ILIKE '%Waterproof Shoe%' 
       OR name_en ILIKE '%Cartoon Table%' 
       OR name_en ILIKE '%Luggage cover%'
       OR category_id = 21
    LIMIT 10
  `);
  console.log('Found:', res.rows.length);
  for (const r of res.rows) {
    console.log(`ID: ${r.id} | Cat: ${r.category_id} | Name: ${r.name_en}`);
    console.log(`  Img: ${r.image_url ? (r.image_url.startsWith('data:') ? 'BASE64(' + r.image_url.length + ')' : r.image_url) : 'NULL'}`);
  }
  await pool.end();
}

main().catch(console.error);
