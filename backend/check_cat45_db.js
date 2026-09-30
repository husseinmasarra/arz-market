const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const cat45 = await pool.query('SELECT * FROM categories WHERE id = 45');
  console.log('Category 45 info:', cat45.rows[0]);

  const prods45 = await pool.query('SELECT id, name_ar, name_en, stock, price_usd, image_url FROM products WHERE category_id = 45');
  console.log(`Products in Category 45 (Total: ${prods45.rows.length}):`);
  prods45.rows.forEach(p => console.log(`- [${p.id}] ${p.name_en} | Stock: ${p.stock}`));

  // Check ALL phone cases and covers across entire database
  const allCovers = await pool.query(`
    SELECT p.id, p.name_ar, p.name_en, p.category_id, c.name_ar as cat_ar
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE (
      p.name_en ILIKE '%case%'
      OR p.name_en ILIKE '%cover%'
      OR p.name_ar ILIKE '%كفر%'
      OR p.name_ar ILIKE '%بيت حماية%'
      OR p.name_ar ILIKE '%جراب%'
    ) AND (
      p.name_en NOT ILIKE '%sofa%' 
      AND p.name_en NOT ILIKE '%table%' 
      AND p.name_en NOT ILIKE '%shoe%' 
      AND p.name_en NOT ILIKE '%luggage%'
      AND p.name_en NOT ILIKE '%pillow%'
    )
  `);

  console.log(`\nAll potential phone case products across database (Total: ${allCovers.rows.length}):`);
  allCovers.rows.forEach(p => console.log(`- [${p.id}] (Current Cat ${p.category_id}: ${p.cat_ar}) -> ${p.name_en}`));

  await pool.end();
}

main().catch(console.error);
