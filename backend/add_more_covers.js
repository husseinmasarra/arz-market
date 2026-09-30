const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await pool.query('UPDATE products SET category_id = 45 WHERE id IN (4045, 4075, 1230)');
  const res = await pool.query('SELECT count(*) as c FROM products WHERE category_id = 45');
  console.log('Total phone covers in Category 45 now:', res.rows[0].c);
  await pool.end();
}

main().catch(console.error);
