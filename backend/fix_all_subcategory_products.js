const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== COMPREHENSIVE PRODUCT-TO-SUBCATEGORY RE-ALIGNMENT ===\n');

  // 1. Phone Coolers & Radiators -> Cat 56
  const coolersRes = await pool.query(`
    UPDATE products 
    SET category_id = 56 
    WHERE (name_en ILIKE '%radiator%' OR name_en ILIKE '%cooling%' OR name_en ILIKE '%phone cooler%' OR name_ar ILIKE '%تبريد%')
      AND name_en NOT ILIKE '%stand%' AND name_en NOT ILIKE '%headset%'
    RETURNING id, name_en
  `);
  console.log(`✓ Moved ${coolersRes.rows.length} products to [56] Cooling Radiator:`);
  coolersRes.rows.forEach(p => console.log(`  - [${p.id}] ${p.name_en}`));

  // 2. Phone Covers / Cases -> Cat 45
  const coversRes = await pool.query(`
    UPDATE products 
    SET category_id = 45 
    WHERE (
      name_en ILIKE 'Cover - %' 
      OR name_en ILIKE 'Mobile Case - %' 
      OR name_en ILIKE 'Eouro - Armor%' 
      OR name_en ILIKE '%Magsafe Case%' 
      OR name_en ILIKE '%Phone Case%'
      OR name_en ILIKE '%Back Cover%'
      OR name_en ILIKE 'Berlia - Cover%'
      OR name_en ILIKE 'Tactile - Woven Case%'
    ) AND (
      name_en NOT ILIKE '%sofa%' 
      AND name_en NOT ILIKE '%table%' 
      AND name_en NOT ILIKE '%shoe%' 
      AND name_en NOT ILIKE '%luggage%'
      AND name_en NOT ILIKE '%airpods%'
      AND name_en NOT ILIKE '%keyboard%'
      AND name_en NOT ILIKE '%food%'
    )
    RETURNING id, name_en
  `);
  console.log(`\n✓ Moved ${coversRes.rows.length} products to [45] Phone Covers & Cases`);

  // 3. HyperX Gaming Gear -> Cat 32
  const hyperxRes = await pool.query(`
    UPDATE products 
    SET category_id = 32 
    WHERE name_en ILIKE '%hyperx%'
    RETURNING id, name_en
  `);
  console.log(`\n✓ Moved ${hyperxRes.rows.length} products to [32] HyperX Gaming`);

  // 4. Baby Monitors & Wireless IP Cameras -> Cat 23
  const babyMonRes = await pool.query(`
    UPDATE products 
    SET category_id = 23 
    WHERE name_en ILIKE '%baby monitor%' 
       OR name_en ILIKE '%camera-monitor%'
       OR name_en ILIKE '%video baby monitor%'
    RETURNING id, name_en
  `);
  console.log(`\n✓ Moved ${babyMonRes.rows.length} products to [23] Baby Monitors`);

  // 5. Blenders & Portable Juicers -> Cat 66
  const blendersRes = await pool.query(`
    UPDATE products 
    SET category_id = 66 
    WHERE name_en ILIKE '%blender%' 
       OR name_en ILIKE '%juicer%' 
       OR name_en ILIKE '%juice extractor%'
       OR name_ar ILIKE '%خلاط%' 
       OR name_ar ILIKE '%عصارة%'
    RETURNING id, name_en
  `);
  console.log(`\n✓ Moved ${blendersRes.rows.length} products to [66] Blenders & Juicers`);

  // 6. Electronic Safe Boxes -> Cat 55
  const safesRes = await pool.query(`
    UPDATE products 
    SET category_id = 55 
    WHERE name_en ILIKE 'Safe Box%' OR name_ar ILIKE '%خزنة إلكترونية%'
    RETURNING id, name_en
  `);
  console.log(`\n✓ Moved ${safesRes.rows.length} products to [55] Safe Boxes`);

  // 7. Computer Monitors -> Cat 43
  const monitorsRes = await pool.query(`
    UPDATE products 
    SET category_id = 43 
    WHERE name_en ILIKE '%Dual Screen Monitor%' 
       OR name_en ILIKE '%Smart Monitor%' 
       OR name_en ILIKE '%UHD 27" 60HZ Monitor%'
    RETURNING id, name_en
  `);
  console.log(`\n✓ Moved ${monitorsRes.rows.length} products to [43] Monitors`);

  // 8. Deactivate truly empty subcategories that have 0 products so they don't show empty in UI
  const emptyCats = await pool.query(`
    SELECT c.id, c.name_ar, c.name_en
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    WHERE c.parent_id IS NOT NULL
    GROUP BY c.id, c.name_ar, c.name_en
    HAVING count(p.id) = 0
  `);
  
  if (emptyCats.rows.length > 0) {
    const emptyIds = emptyCats.rows.map(c => c.id);
    await pool.query(`UPDATE categories SET active = 0 WHERE id = ANY($1::int[])`, [emptyIds]);
    console.log(`\n✓ Deactivated ${emptyCats.rows.length} empty subcategories so store remains 100% clean:`);
    emptyCats.rows.forEach(c => console.log(`  - [${c.id}] ${c.name_ar} (${c.name_en})`));
  }

  // 9. Re-verify Category 56
  const check56 = await pool.query('SELECT count(*) as c FROM products WHERE category_id = 56');
  console.log(`\n=== Verification: Products in Category 56 (Cooling Radiator) now: ${check56.rows[0].c} ===`);

  await pool.end();
}

main().catch(console.error);
