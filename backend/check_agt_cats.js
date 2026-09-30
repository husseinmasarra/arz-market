const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const prods = await pool.query(`
    SELECT c.id, c.name_ar, c.name_en, c.parent_id, COUNT(p.id) as count 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.merchant_id = 10 
    GROUP BY c.id, c.name_ar, c.name_en, c.parent_id
  `);
  console.log('=== Abdul Ghani Products by Subcategory in PostgreSQL ===');
  for (const r of prods.rows) {
    console.log(`- Subcategory ID ${r.id} (${r.name_ar} / ${r.name_en}) [Parent: ${r.parent_id}]: ${r.count} products`);
  }

  const total = await pool.query('SELECT COUNT(*) FROM products WHERE merchant_id = 10');
  console.log(`\nTotal Abdul Ghani Products in DB: ${total.rows[0].count}`);
  await pool.end();
}
run();
