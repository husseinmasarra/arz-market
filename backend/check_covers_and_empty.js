const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== CHECKING PHONE COVERS & OTHER SUBCATEGORIES ===\n');

  const covers = await pool.query(`
    SELECT p.id, p.name_ar, p.name_en, p.category_id, c.name_ar as cat_ar
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.name_en ILIKE '%case%'
       OR (p.name_en ILIKE '%cover%' AND p.name_en NOT ILIKE '%table%' AND p.name_en NOT ILIKE '%shoe%' AND p.name_en NOT ILIKE '%luggage%')
       OR p.name_ar ILIKE '%كفر%'
       OR p.name_ar ILIKE '%بيت حماية%'
    LIMIT 30
  `);

  console.log(`Found ${covers.rows.length} phone covers/cases:`);
  covers.rows.forEach(p => console.log(`- [${p.id}] (Current Cat ${p.category_id}: ${p.cat_ar}) -> ${p.name_en}`));

  // Check HyperX products
  const hyperx = await pool.query("SELECT id, name_en, category_id FROM products WHERE name_en ILIKE '%hyperx%'");
  console.log(`\nHyperX products (${hyperx.rows.length}):`, hyperx.rows);

  // Check Baby monitor
  const baby = await pool.query("SELECT id, name_en, category_id FROM products WHERE name_en ILIKE '%baby%' OR name_en ILIKE '%monitor%'");
  console.log(`\nBaby/Monitor products (${baby.rows.length}):`, baby.rows.slice(0, 10));

  // Check Blender products
  const blenders = await pool.query("SELECT id, name_en, category_id FROM products WHERE name_en ILIKE '%blender%' OR name_en ILIKE '%juicer%' OR name_ar ILIKE '%خلاط%'");
  console.log(`\nBlender products (${blenders.rows.length}):`, blenders.rows);

  // Check Safe box
  const safes = await pool.query("SELECT id, name_en, category_id FROM products WHERE name_en ILIKE '%safe%' OR name_ar ILIKE '%خزن%' OR name_ar ILIKE '%خزنة%'");
  console.log(`\nSafe products (${safes.rows.length}):`, safes.rows);

  await pool.end();
}

main().catch(console.error);
