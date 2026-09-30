const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== AUDITING ALL CATEGORIES AND THEIR PARENTS ===');
  
  const cats = await pool.query(`
    SELECT c.id, c.name_ar, c.name_en, c.parent_id, c.active, p.name_ar as parent_name_ar, p.name_en as parent_name_en
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    ORDER BY COALESCE(c.parent_id, c.id), c.id
  `);

  console.log(`Total categories in DB: ${cats.rows.length}`);
  
  const tree = {};
  for (const c of cats.rows) {
    if (!c.parent_id) {
      tree[c.id] = { ...c, children: [] };
    }
  }
  
  for (const c of cats.rows) {
    if (c.parent_id && tree[c.parent_id]) {
      tree[c.parent_id].children.push(c);
    } else if (c.parent_id) {
      console.log(`ORPHAN SUBCAT: [${c.id}] ${c.name_ar} -> parent_id: ${c.parent_id} (Parent not in root tree)`);
    }
  }

  for (const [id, mainCat] of Object.entries(tree)) {
    console.log(`\n📂 [MAIN ID: ${mainCat.id}] ${mainCat.name_ar} (${mainCat.name_en}) - Active: ${mainCat.active}`);
    if (mainCat.children.length === 0) {
      console.log('   (No subcategories)');
    } else {
      mainCat.children.forEach(sub => {
        console.log(`   ↳ [SUB ID: ${sub.id}] ${sub.name_ar} (${sub.name_en}) - Active: ${sub.active}`);
      });
    }
  }

  await pool.end();
}

main().catch(console.error);
