const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== ANALYZING ALL CATEGORIES FOR RELEVANT IMAGES ===');
  
  const cats = await pool.query(`
    SELECT c.id, c.name_ar, c.name_en, c.parent_id, c.image_url, c.active,
           count(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    WHERE c.active = 1 OR c.active IS NULL
    GROUP BY c.id, c.name_ar, c.name_en, c.parent_id, c.image_url, c.active
    ORDER BY c.parent_id NULLS FIRST, c.sort_order ASC, c.id ASC
  `);

  console.log(`Total Active Categories: ${cats.rows.length}\n`);

  for (const c of cats.rows) {
    // Get 3 sample products in this category
    const prods = await pool.query('SELECT name_ar, name_en FROM products WHERE category_id = $1 LIMIT 3', [c.id]);
    const samples = prods.rows.map(p => p.name_ar || p.name_en).join(' | ');
    const isMain = !c.parent_id ? '🌟 [MAIN]' : `  ↳ [SUB of ${c.parent_id}]`;
    console.log(`${isMain} ID ${c.id}: ${c.name_ar} (${c.name_en}) - Products: ${c.product_count}`);
    console.log(`   Img: ${c.image_url ? (c.image_url.startsWith('data:') ? 'BASE64' : c.image_url.substring(0, 70)) : 'NONE'}`);
    if (samples) console.log(`   Samples: ${samples.substring(0, 100)}`);
  }

  await pool.end();
}

main().catch(console.error);
