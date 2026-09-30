const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query('SELECT id, name_ar, name_en, merchant_id FROM products WHERE category_id = 21');
  console.log('Products in Category 21 (Razer Gaming):', res.rows.length);
  for (const r of res.rows) {
    console.log(`- [${r.id}] ${r.name_ar} | ${r.name_en}`);
  }
  await pool.end();
}

main().catch(console.error);
