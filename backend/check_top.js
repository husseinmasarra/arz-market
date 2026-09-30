const db = require('./src/config/db');

async function checkTop() {
  const cats = await db.allAsync(`
    SELECT c.id, c.name_ar, c.name_en, c.parent_id, c.sort_order, c.active, COUNT(p.id) as prod_count 
    FROM categories c 
    LEFT JOIN products p ON p.category_id = c.id 
    GROUP BY c.id, c.name_ar, c.name_en, c.parent_id, c.sort_order, c.active
    ORDER BY c.sort_order ASC, c.id ASC
  `);

  const roots = cats.filter(c => !c.parent_id);
  const children = cats.filter(c => c.parent_id);

  console.log('=== ALL ROOT CATEGORIES AND COUNTS ===');
  roots.forEach(r => {
    const subs = children.filter(ch => ch.parent_id === r.id);
    const subTotal = subs.reduce((a, b) => a + parseInt(b.prod_count), 0);
    const total = parseInt(r.prod_count) + subTotal;
    console.log(`[Root ID ${r.id}] ${r.name_ar} | ${r.name_en} -> Direct: ${r.prod_count}, Subtotal: ${subTotal}, Total: ${total}`);
    subs.forEach(s => {
      console.log(`   └─ [Sub ID ${s.id}] ${s.name_ar} | ${s.name_en} -> ${s.prod_count} prods`);
    });
  });

  process.exit(0);
}

checkTop();
