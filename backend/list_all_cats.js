const db = require('./src/config/db');

async function listAll() {
  const allCats = await db.allAsync(`SELECT id, name_ar, name_en, parent_id, active, sort_order FROM categories ORDER BY id ASC`);
  console.log(`Total categories: ${allCats.length}`);
  allCats.forEach(c => {
    console.log(`ID ${c.id}: [Parent: ${c.parent_id}] ${c.name_ar} | ${c.name_en} (active: ${c.active})`);
  });
  process.exit(0);
}

listAll();
