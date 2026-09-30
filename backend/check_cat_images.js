const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const cats = await pool.query('SELECT id, name_ar, image_url FROM categories');
  console.log('Categories count:', cats.rows.length);
  for (const c of cats.rows) {
    if (c.image_url) {
      console.log(`Cat ID: ${c.id} | Name: ${c.name_ar} | Img: ${c.image_url.substring(0, 60)}`);
    }
  }
  await pool.end();
}

main().catch(console.error);
