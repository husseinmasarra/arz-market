const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const c94 = await pool.query('SELECT * FROM categories WHERE id = 94 OR parent_id = 94');
  console.log('Category 94 and children:', c94.rows);
  
  const allCats = await pool.query('SELECT c.id, c.name_en, c.name_ar, c.parent_id, c.active, COUNT(p.id) as direct_prod_count FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id ORDER BY c.id');
  
  console.log('--- ALL CATEGORIES AND THEIR STATUS ---');
  for (const cat of allCats.rows) {
    if (cat.active === 1) {
      const children = allCats.rows.filter(c => c.parent_id === cat.id && c.active === 1);
      const childProdCount = children.reduce((acc, c) => acc + parseInt(c.direct_prod_count), 0);
      const totalProds = parseInt(cat.direct_prod_count) + childProdCount;
      if (totalProds === 0) {
        console.log(`EMPTY ACTIVE CATEGORY: ID=${cat.id}, Name=${cat.name_en} / ${cat.name_ar}, ParentID=${cat.parent_id}, ChildrenCount=${children.length}`);
      } else {
        // console.log(`OK: ID=${cat.id} (${cat.name_en}): ${totalProds} prods`);
      }
    }
  }

  // Also check products with discounts or deals
  const discounted = await pool.query('SELECT COUNT(*) FROM products WHERE old_price_usd > price_usd');
  console.log('Products with old_price_usd > price_usd:', discounted.rows[0].count);

  await pool.end();
}
run();
