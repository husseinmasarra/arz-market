const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== CHECKING CATEGORY 56 & PHONE COOLING RADIATORS ===\n');

  // 1. Check Category 56 info
  const cat56 = await pool.query('SELECT * FROM categories WHERE id = 56');
  console.log('Category 56:', cat56.rows[0]);

  // 2. Search for cooling / radiator / cooler / phone cooler / مروحة تبريد / تبريد هاتف
  const coolers = await pool.query(`
    SELECT p.id, p.name_ar, p.name_en, p.category_id, c.name_ar as cat_ar, c.name_en as cat_en
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.name_en ILIKE '%radiator%'
       OR p.name_en ILIKE '%cooler%'
       OR p.name_en ILIKE '%cooling%'
       OR p.name_ar ILIKE '%تبريد%'
       OR p.name_ar ILIKE '%راديتر%'
       OR p.name_ar ILIKE '%مروحة تبريد%'
  `);

  console.log(`\nFound ${coolers.rows.length} cooling/radiator products across database:`);
  coolers.rows.forEach(p => {
    console.log(`- [ID ${p.id}] Cat: ${p.category_id} (${p.cat_ar}) -> ${p.name_en}`);
  });

  // 3. Find ALL subcategories with 0 products
  const emptyCats = await pool.query(`
    SELECT c.id, c.name_ar, c.name_en, c.parent_id, p.name_ar as parent_name_ar
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    LEFT JOIN products pr ON pr.category_id = c.id
    WHERE (c.active = 1 OR c.active IS NULL)
    GROUP BY c.id, c.name_ar, c.name_en, c.parent_id, p.name_ar
    HAVING count(pr.id) = 0
    ORDER BY c.parent_id NULLS FIRST, c.id ASC
  `);

  console.log(`\nEmpty categories with 0 products (Total: ${emptyCats.rows.length}):`);
  emptyCats.rows.forEach(c => {
    console.log(`- [ID ${c.id}] ${c.name_ar} (${c.name_en}) - Parent: [${c.parent_id}] ${c.parent_name_ar || 'ROOT'}`);
  });

  await pool.end();
}

main().catch(console.error);
