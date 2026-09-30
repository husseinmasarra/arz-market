const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const existing = await pool.query("SELECT * FROM supplier_sources WHERE name LIKE '%Abdul Ghani%' OR url LIKE '%abdulghanitrading%'");
  if (existing.rows.length === 0) {
    await pool.query(
      "INSERT INTO supplier_sources (name, url, passcode, markup_percent, sync_type, is_default, phone, email, whatsapp_number, shipping_notes) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)",
      ['Abdul Ghani Trading', 'https://www.abdulghanitrading.com', 'Hussein123@%', 0, 'abdulghani', '+961 70 000 000', 'info@arz-mart.com', '+961 70 000 000', '12% VAT added to wholesale cost']
    );
    console.log('Inserted Abdul Ghani Trading into supplier_sources successfully.');
  } else {
    console.log('Abdul Ghani Trading already exists in supplier_sources:', existing.rows[0]);
  }
  await pool.end();
}
run();
