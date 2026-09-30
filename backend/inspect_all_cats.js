const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT c.id, c.name_ar, c.name_en, c.parent_id, c.active,
           COUNT(p.id) as direct_count,
           (SELECT COUNT(*) FROM products p2 WHERE p2.category_id IN (SELECT c2.id FROM categories c2 WHERE c2.parent_id = c.id)) as child_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.parent_id NULLS FIRST, c.sort_order ASC, c.id ASC
  `);

  console.log('=== ALL ACTIVE CATEGORIES WITH 0 TOTAL PRODUCTS ===');
  let emptyCount = 0;
  for (const c of res.rows) {
    const direct = parseInt(c.direct_count);
    const child = parseInt(c.child_count);
    const total = direct + child;
    if (c.active === 1 && total === 0) {
      emptyCount++;
      console.log(`[EMPTY] ID: ${c.id} | Parent: ${c.parent_id} | Name: ${c.name_ar} (${c.name_en})`);
    }
  }
  console.log('Total empty active categories:', emptyCount);

  console.log('\n=== ALL ACTIVE MAIN CATEGORIES (parent_id IS NULL) ===');
  for (const c of res.rows.filter(c => !c.parent_id && c.active === 1)) {
    const direct = parseInt(c.direct_count);
    const child = parseInt(c.child_count);
    const total = direct + child;
    console.log(`Main ID: ${c.id} | Total: ${total} (Direct: ${direct}, Subcats: ${child}) | Name: ${c.name_ar} (${c.name_en})`);
  }

  await pool.end();
}
run();
