const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== CHECKING ALL RAZER PRODUCTS & CATEGORY 21 ===');
  
  // 1. Check Category 21
  const cat21 = await pool.query('SELECT * FROM categories WHERE id = 21');
  console.log('Category 21 info:', cat21.rows[0]);
  
  // 2. Check products in category 21
  const prodsInCat21 = await pool.query('SELECT id, name_ar, name_en, category_id, merchant_id, price_usd, stock, image_url FROM products WHERE category_id = 21');
  console.log(`Products in category 21 (Count: ${prodsInCat21.rows.length}):`);
  prodsInCat21.rows.forEach(p => console.log(`- [${p.id}] ${p.name_en} | Stock: ${p.stock} | Img: ${p.image_url ? p.image_url.substring(0, 40) : 'NULL'}`));
  
  // 3. Check products across entire database mentioning 'Razer' or 'razer'
  const razerProds = await pool.query("SELECT id, name_ar, name_en, category_id, merchant_id, price_usd, stock, image_url FROM products WHERE name_en ILIKE '%razer%' OR name_ar ILIKE '%رايزر%' OR name_ar ILIKE '%ريزر%'");
  console.log(`\nProducts mentioning 'Razer' anywhere in DB (Count: ${razerProds.rows.length}):`);
  razerProds.rows.forEach(p => console.log(`- [${p.id}] Cat: ${p.category_id} | ${p.name_en} | Stock: ${p.stock} | Img: ${p.image_url ? p.image_url.substring(0, 40) : 'NULL'}`));

  // 4. Check DR Phone catalog or other merchants for Razer products
  const merchantProds = await pool.query("SELECT p.id, p.name_en, p.category_id, m.name as merchant_name FROM products p LEFT JOIN merchants m ON p.merchant_id = m.id WHERE p.name_en ILIKE '%razer%'");
  console.log('\nMerchants for Razer:', merchantProds.rows);

  await pool.end();
}

main().catch(console.error);
