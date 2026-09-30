const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT p.id, p.sku, p.name_ar, p.price_usd, p.cost_price_usd, p.old_price_usd, p.stock, p.image_url, m.name as merchant
    FROM products p 
    JOIN merchants m ON p.merchant_id = m.id 
    WHERE m.name = 'Abdul Ghani Trading'
    ORDER BY p.id DESC
    LIMIT 10
  `);
  console.log(`Synced Abdul Ghani products count so far: ${res.rows.length}`);
  console.log('Sample Products:');
  for (const r of res.rows) {
    const profit = (parseFloat(r.price_usd) - parseFloat(r.cost_price_usd)).toFixed(2);
    console.log(`- ID ${r.id} | SKU: ${r.sku} | ${r.name_ar}`);
    console.log(`  Selling Price (سعر الموقع للزبون): $${r.price_usd} | Cost + 12% VAT (سعر الاستلام مع الضريبة): $${r.cost_price_usd} | Net Margin: $${profit}`);
    console.log(`  Has Image: ${r.image_url ? (r.image_url.startsWith('data:image') ? 'YES (Base64 HD)' : r.image_url.slice(0, 40)) : 'NO'}\n`);
  }
  await pool.end();
}
run();
