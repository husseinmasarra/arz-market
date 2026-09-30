const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const total = await pool.query('SELECT count(*) as c FROM products');
  const withUploads = await pool.query("SELECT count(*) as c FROM products WHERE image_url LIKE '/uploads/%'");
  const withDealUploads = await pool.query("SELECT count(*) as c FROM products WHERE image_url LIKE '/uploads/products/deal_%'");
  const withDirectDealUrl = await pool.query("SELECT count(*) as c FROM products WHERE image_url LIKE 'https://www.deal.com.lb/%'");
  const withDrphone = await pool.query("SELECT count(*) as c FROM products WHERE image_url NOT LIKE '/uploads/products/deal_%' AND image_url LIKE '/uploads/%'");
  
  console.log('Total products:', total.rows[0].c);
  console.log('With /uploads/...:', withUploads.rows[0].c);
  console.log('With /uploads/products/deal_...:', withDealUploads.rows[0].c);
  console.log('With direct deal.com.lb URL:', withDirectDealUrl.rows[0].c);
  console.log('With other /uploads/ (e.g. DR phone):', withDrphone.rows[0].c);
  
  const sampleDeal = await pool.query("SELECT id, name_ar, name_en, image_url, code, external_id FROM products WHERE image_url LIKE '/uploads/products/deal_%' LIMIT 5");
  console.log('Sample deal products:', sampleDeal.rows);
  
  await pool.end();
}

main().catch(console.error);
