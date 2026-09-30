const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('Connecting to PostgreSQL on Render...');
    const client = await pool.connect();
    console.log('Connected! Checking products count...');
    const res = await client.query('SELECT count(*) as c FROM products');
    console.log('Products count in DB:', res.rows[0].c);

    console.log('Checking first 5 products:');
    const prods = await client.query('SELECT id, name_ar, name_en, category_id, stock FROM products ORDER BY id DESC LIMIT 5');
    console.log(prods.rows);

    client.release();
  } catch (err) {
    console.error('PostgreSQL error:', err.message);
  } finally {
    await pool.end();
  }
}

test();
