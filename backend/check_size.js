const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function checkPayloadSize() {
  try {
    const client = await pool.connect();
    const { rows } = await client.query('SELECT * FROM products');
    const jsonStr = JSON.stringify(rows);
    console.log(`Total rows: ${rows.length}, Raw JSON size: ${(jsonStr.length / 1024 / 1024).toFixed(2)} MB`);

    // Check if any product has huge base64 strings in images or description
    let hugeCount = 0;
    rows.forEach(r => {
      const str = JSON.stringify(r);
      if (str.length > 50000) {
        hugeCount++;
        console.log(`Product ID ${r.id} is ${(str.length / 1024).toFixed(1)} KB: "${r.name_ar}"`);
      }
    });
    console.log(`Products larger than 50KB: ${hugeCount}`);

    client.release();
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkPayloadSize();
