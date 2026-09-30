const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== FIXING MISASSIGNED CATEGORIES & TITLES ===');
  
  const fixes = [
    { id: 1603, name_ar: 'غطاء حماية شفاف لحقائب السفر مقاس 20 إنش ضد الماء', cat_id: 96 },
    { id: 1831, name_ar: 'أغطية أحذية سيليكون ضد الماء والمطر مانعة للانزلاق مقاس 30-33', cat_id: 96 },
    { id: 1647, name_ar: 'لهاية وفيدر سيليكون لإطعام الأطفال الفواكه الطازجة مع غطاء', cat_id: 85 },
    { id: 1838, name_ar: 'قناع واقي للوجه شفاف كامل للحماية من الرذاذ', cat_id: 85 },
    { id: 1689, name_ar: 'مفرش طاولة كرتوني للأطفال مقاوم للماء والبقع', cat_id: 87 },
    { id: 3812, cat_id: 83 },
    { id: 3813, cat_id: 83 },
    { id: 4391, cat_id: 62 },
    { id: 4387, cat_id: 62 },
    { id: 4390, cat_id: 62 },
    { id: 4055, cat_id: 79 },
    { id: 4064, cat_id: 79 }
  ];

  for (const f of fixes) {
    if (f.name_ar) {
      await pool.query('UPDATE products SET name_ar = $1, category_id = $2 WHERE id = $3', [f.name_ar, f.cat_id, f.id]);
    } else {
      await pool.query('UPDATE products SET category_id = $1 WHERE id = $2', [f.cat_id, f.id]);
    }
  }

  console.log('Fixed all 12 products successfully.');
  await pool.end();
}

main().catch(console.error);
