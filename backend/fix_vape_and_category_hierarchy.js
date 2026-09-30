const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== FIXING VAPE CATEGORY & RE-ORGANIZING CATEGORY HIERARCHY ===\n');

  // 1. Make Category 59 (Vape) an independent main category
  await pool.query(`
    UPDATE categories 
    SET parent_id = NULL,
        active = 1,
        name_ar = 'سحبات وأجهزة فيب وملحقاتها',
        name_en = 'Vape & E-Cigarettes',
        image_url = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
        sort_order = 10
    WHERE id = 59
  `);
  console.log('Category 59 (Vape) is now an independent Main Category.');

  // 2. Assign all Vape / Puff / E-cig products to Category 59
  const vapeUpdate = await pool.query(`
    UPDATE products 
    SET category_id = 59 
    WHERE name_en ILIKE '%vape%' 
       OR name_en ILIKE '%puff%' 
       OR name_en ILIKE '%e-cig%' 
       OR name_ar ILIKE '%فيب%' 
       OR name_ar ILIKE '%سحبة%' 
       OR name_ar ILIKE '%شيشة%'
    RETURNING id, name_en
  `);
  console.log(`Updated ${vapeUpdate.rows.length} Vape products to Category 59 (Vape & E-Cigarettes):`);
  vapeUpdate.rows.forEach(p => console.log(`  - [${p.id}] ${p.name_en}`));

  // 3. Move misplaced subcategories from 87 (Smart Home & Living) to their proper parent categories
  // Toys -> Gaming (80)
  await pool.query('UPDATE categories SET parent_id = 80 WHERE id = 35');
  // Smart Bags -> Phones & Accessories (79)
  await pool.query('UPDATE categories SET parent_id = 79 WHERE id = 34');
  // Electronics Mix -> Computing & Smart Tech (82)
  await pool.query('UPDATE categories SET parent_id = 82 WHERE id = 30');

  // 4. Clean up unused empty temporary test categories (103..113) so they don't clutter the store
  await pool.query('DELETE FROM categories WHERE id IN (103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113)');
  console.log('Cleaned up empty test categories 103..113.');

  // 5. Verify Smart Home & Living (87) subcategories now
  const homeSubs = await pool.query('SELECT id, name_ar, name_en FROM categories WHERE parent_id = 87');
  console.log('\nSubcategories under [87] Smart Home & Living now:');
  homeSubs.rows.forEach(s => console.log(`  ↳ [${s.id}] ${s.name_ar} (${s.name_en})`));

  // 6. Verify products under 87
  const prodsIn87 = await pool.query(`
    SELECT p.id, p.name_ar, p.name_en, c.name_ar as cat_ar
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE c.id = 87 OR c.parent_id = 87
    LIMIT 10
  `);
  console.log(`\nSample products in Smart Home & Living [87]:`);
  prodsIn87.rows.forEach(p => console.log(`  - [${p.id}] (${p.cat_ar}) ${p.name_en}`));

  await pool.end();
}

main().catch(console.error);
