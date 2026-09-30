const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  // Move bath sponge puff to Category 92
  await pool.query("UPDATE products SET category_id = 92 WHERE id = 1646 OR name_en ILIKE '%Bath Shower Puff%' OR name_en ILIKE '%Sponge Set%'");
  
  // Verify Category 59
  const vapeProds = await pool.query("SELECT id, name_en, name_ar, category_id, price_usd, stock, image_url FROM products WHERE category_id = 59");
  console.log(`Products in Category 59 [Vape & E-Cigarettes] (Total: ${vapeProds.rows.length}):`);
  vapeProds.rows.forEach(p => console.log(`  - [${p.id}] ${p.name_en} | Price: $${p.price_usd} | Stock: ${p.stock}`));

  // Invalidate any cache in CategoryController
  await pool.end();
}

main().catch(console.error);
