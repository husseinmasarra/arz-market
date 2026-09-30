const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await pool.query("UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=800&q=80' WHERE id = 45");
  console.log('Category 45 cover image set to luxury phone cases.');
  await pool.end();
}

main().catch(console.error);
