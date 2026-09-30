const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query('SELECT id, name_en, name_ar, image_url FROM products WHERE category_id = 98 OR category_id = 99 OR category_id = 100 ORDER BY id ASC LIMIT 50');
  console.log('Sample kitchen products (total fetched):', res.rows.length);
  for (const r of res.rows.slice(0, 15)) {
    console.log(`ID: ${r.id} | Name: ${r.name_en}`);
  }
  await pool.end();
}
run();
