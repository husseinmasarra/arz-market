const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query(`
    SELECT id, name_ar, name_en, category_id, merchant_id 
    FROM products 
    WHERE (name_ar LIKE 'كفر غطاء حماية للهاتف%' AND name_en NOT ILIKE '%phone%' AND name_en NOT ILIKE '%iphone%' AND name_en NOT ILIKE '%samsung%' AND name_en NOT ILIKE '%case%')
       OR (name_ar LIKE 'لصقة حماية شاشة زجاجية%' AND name_en NOT ILIKE '%screen%' AND name_en NOT ILIKE '%glass%' AND name_en NOT ILIKE '%protector%')
  `);
  console.log('Mis-prefixed products count:', res.rows.length);
  for (const r of res.rows) {
    console.log(`[${r.id}] ${r.name_ar.substring(0, 50)}... | ${r.name_en}`);
  }
  await pool.end();
}

main().catch(console.error);
