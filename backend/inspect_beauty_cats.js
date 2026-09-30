const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const cats = await pool.query('SELECT id, name_ar, name_en, parent_id, active FROM categories WHERE parent_id IN (90, 85) OR id IN (90, 85) ORDER BY parent_id NULLS FIRST, id ASC');
  console.log('Categories under 90 & 85:');
  for (const c of cats.rows) {
    console.log(`ID: ${c.id} | Parent: ${c.parent_id} | Name: ${c.name_ar} (${c.name_en}) | Active: ${c.active}`);
  }
  await pool.end();
}
run();
