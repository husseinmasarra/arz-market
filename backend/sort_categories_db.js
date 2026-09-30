const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query('SELECT * FROM categories ORDER BY id ASC');
  const all = res.rows;
  
  // 1. Main categories (parent_id is null or 0)
  const mainCats = all.filter(c => !c.parent_id || c.parent_id === 0);
  
  // Sort main categories alphabetically by Arabic name (and English)
  mainCats.sort((a, b) => {
    const cleanA = (a.name_ar || '').replace(/^ال/, '');
    const cleanB = (b.name_ar || '').replace(/^ال/, '');
    return (a.name_ar || '').localeCompare(b.name_ar || '', 'ar');
  });

  console.log('--- UPDATING MAIN CATEGORIES SORT ORDER ---');
  for (let i = 0; i < mainCats.length; i++) {
    const cat = mainCats[i];
    const order = (i + 1) * 10;
    await pool.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [order, cat.id]);
    console.log(`${i + 1}. [Order ${order}] ${cat.name_ar} (${cat.name_en})`);
  }

  // 2. Subcategories sorted within each parent
  const subCats = all.filter(c => c.parent_id && c.parent_id !== 0);
  const parents = [...new Set(subCats.map(c => c.parent_id))];

  for (const pId of parents) {
    const children = subCats.filter(c => c.parent_id === pId);
    children.sort((a, b) => (a.name_ar || '').localeCompare(b.name_ar || '', 'ar'));
    for (let j = 0; j < children.length; j++) {
      const child = children[j];
      const subOrder = (j + 1) * 10;
      await pool.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [subOrder, child.id]);
    }
  }

  // Also update categories.json
  const catJsonPath = path.join(__dirname, '../categories.json');
  if (fs.existsSync(catJsonPath)) {
    const resAll = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
    fs.writeFileSync(catJsonPath, JSON.stringify(resAll.rows, null, 2), 'utf8');
    console.log('Updated categories.json file successfully.');
  }

  pool.end();
}
run();
