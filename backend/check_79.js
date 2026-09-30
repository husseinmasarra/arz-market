const db = require('./src/config/db');

async function check79() {
  const c79 = await db.getAsync(`SELECT * FROM categories WHERE id = 79`);
  console.log('Root 79:', c79);
  const subs79 = await db.allAsync(`
    SELECT c.id, c.name_ar, c.name_en, c.sort_order, COUNT(p.id) as prod_count 
    FROM categories c 
    LEFT JOIN products p ON p.category_id = c.id 
    WHERE c.parent_id = 79 
    GROUP BY c.id, c.name_ar, c.name_en, c.sort_order
    ORDER BY c.sort_order ASC
  `);
  console.log('Subs of 79:');
  subs79.forEach(s => console.log(`  - [ID ${s.id}] ${s.name_ar} | ${s.name_en} -> ${s.prod_count} prods`));
  process.exit(0);
}

check79();
