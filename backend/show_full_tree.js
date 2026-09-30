const db = require('./src/config/db');

async function fullTree() {
  const cats = await db.allAsync(`
    SELECT c.id, c.name_ar, c.name_en, c.parent_id, c.sort_order, c.active, COUNT(p.id) as prod_count 
    FROM categories c 
    LEFT JOIN products p ON p.category_id = c.id 
    GROUP BY c.id, c.name_ar, c.name_en, c.parent_id, c.sort_order, c.active
    ORDER BY c.sort_order ASC, c.id ASC
  `);

  const roots = cats.filter(c => !c.parent_id);
  const children = cats.filter(c => c.parent_id);

  console.log('=== FULL CATEGORY TREE WITH PRODUCT COUNTS ===');
  roots.forEach(r => {
    const subs = children.filter(ch => ch.parent_id === r.id);
    const subTotal = subs.reduce((a, b) => a + parseInt(b.prod_count), 0);
    const total = parseInt(r.prod_count) + subTotal;
    console.log(`\n📁 [${r.id}] ${r.name_ar} / ${r.name_en} (Direct: ${r.prod_count}, Total with subcats: ${total}) [Sort: ${r.sort_order}]`);
    subs.forEach(s => {
      console.log(`   └── 📄 [${s.id}] ${s.name_ar} / ${s.name_en} -> ${s.prod_count} products [Sort: ${s.sort_order}, Active: ${s.active}]`);
    });
  });

  process.exit(0);
}

fullTree();
