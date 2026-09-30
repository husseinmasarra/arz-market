const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const ids = [103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113];
  for (const id of ids) {
    const res = await pool.query('SELECT count(*) as c FROM products WHERE category_id = $1', [id]);
    const cat = await pool.query('SELECT name_ar, name_en, active FROM categories WHERE id = $1', [id]);
    console.log(`Cat ID ${id} (${cat.rows[0] ? cat.rows[0].name_ar : 'Not found'}) -> Products count: ${res.rows[0].c}`);
  }
  await pool.end();
}

main().catch(console.error);
