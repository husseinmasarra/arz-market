const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products'");
  console.log('Product Columns:', cols.rows.map(c => c.column_name));
  
  const blurCol = cols.rows.find(c => c.column_name === 'blurhash');
  console.log('Has blurhash column:', !!blurCol);
  
  if (blurCol) {
    const withHash = await pool.query("SELECT count(*) as c FROM products WHERE blurhash IS NOT NULL AND blurhash != ''");
    console.log('Products with blurhash in DB:', withHash.rows[0].c);
  } else {
    console.log('Adding blurhash column to products table...');
    await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS blurhash VARCHAR(100)");
    console.log('Column blurhash added successfully.');
  }

  const total = await pool.query("SELECT count(*) as c FROM products");
  console.log('Total products:', total.rows[0].c);

  pool.end();
}
run();
