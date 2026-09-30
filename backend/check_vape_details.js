const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== CHECKING VAPE CATEGORIES & PRODUCTS ===');
  
  // 1. Check categories with vape / smoking keywords
  const vapeCats = await pool.query("SELECT id, name_ar, name_en, parent_id, active FROM categories WHERE name_en ILIKE '%vape%' OR name_ar ILIKE '%فيب%' OR name_ar ILIKE '%سحب%' OR name_ar ILIKE '%شيش%'");
  console.log('Vape related categories:');
  console.log(vapeCats.rows);

  // 2. Check all products matching vape / puff / e-cig / hookah
  const vapeProds = await pool.query(`
    SELECT p.id, p.name_ar, p.name_en, p.category_id, c.name_ar as cat_ar, c.name_en as cat_en, c.parent_id
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.name_en ILIKE '%vape%' 
       OR p.name_en ILIKE '%puff%' 
       OR p.name_en ILIKE '%e-cig%' 
       OR p.name_en ILIKE '%hookah%' 
       OR p.name_ar ILIKE '%فيب%' 
       OR p.name_ar ILIKE '%سحبة%' 
       OR p.name_ar ILIKE '%شيشة%'
    ORDER BY p.id ASC
  `);

  console.log(`\nFound ${vapeProds.rows.length} Vape/Puff products:`);
  vapeProds.rows.forEach(p => {
    console.log(`- [ID ${p.id}] Cat (${p.category_id}: ${p.cat_ar} / ${p.cat_en}) -> ${p.name_en}`);
  });

  // 3. Check what parent category the Vape category should belong to
  const allMainCats = await pool.query("SELECT id, name_ar, name_en FROM categories WHERE parent_id IS NULL OR parent_id = 0");
  console.log('\nMain Categories:');
  console.log(allMainCats.rows);

  await pool.end();
}

main().catch(console.error);
