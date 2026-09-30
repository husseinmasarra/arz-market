const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

function mapCategory(title = '') {
  const text = title.toLowerCase();
  
  // 1. Dental Care -> 122
  if (/colgate|oral|dental|teeth|toothpaste|معجون|أسنان|فرشاة أسنان/i.test(text)) {
    return 122;
  }
  // 2. Deodorants & Roll-on -> 121
  if (/deodorant|roll-on|roll on|body spray|axe|rexona|مزيل عرق|رول اون|بخاخ جسم/i.test(text)) {
    return 121;
  }
  // 3. Hair Care & Shampoo -> 119
  if (/shampoo|conditioner|hair oil|hair mask|hair serum|شامبو|بلسم|عناية بالشعر|زيت شعر/i.test(text)) {
    return 119;
  }
  // 4. Body Lotions, Washes & Soaps -> 120
  if (/shower gel|body wash|body lotion|body cream|soap|لوشن|صابون|شاور جل|غسول جسم|مرطب جسم|vaseline|dove|enchanteur/i.test(text)) {
    return 120;
  }
  // 5. Face Masks -> 118
  if (/mask|قناع|ماسك/i.test(text)) {
    return 118;
  }
  // 6. Makeup & Cosmetics -> 117
  if (/makeup|lipstick|lip gloss|lip balm|mascara|eyeliner|foundation|blush|powder|مكياج|روج|مسكرة|كحل|فاونديشن/i.test(text)) {
    return 117;
  }
  // 7. Arabic & Oriental Perfumes -> 115
  if (/arabic|oriental|oud|musk|bukhoor|عطر شرقي|عود|مسك|بخور|lattafa|ard al zaafaran/i.test(text)) {
    return 115;
  }
  // 8. Korean & French Skincare -> 116
  if (/skincare|serum|medicube|cosrx|anua|centella|beauty of joseon|cerave|la roche|ordinary|سيروم|بشرة|عناية بالبشرة|كريم وجه/i.test(text)) {
    return 116;
  }
  // 9. French & International Fragrances -> 114
  if (/perfume|fragrance|parfum|edp|edt|cologne|عطر|عطور|geparlys|l'orientale|maison alhambra|paris/i.test(text)) {
    return 114;
  }
  
  return 114;
}

async function run() {
  console.log('=== Recategorizing Abdul Ghani Products into specific subcategories ===');
  const prods = await pool.query('SELECT id, name_en, name_ar FROM products WHERE merchant_id = 10');
  let count = 0;
  for (const p of prods.rows) {
    const targetCat = mapCategory(p.name_en || p.name_ar);
    await pool.query('UPDATE products SET category_id = $1 WHERE id = $2', [targetCat, p.id]);
    count++;
  }
  console.log(`Successfully recategorized all ${count} products.`);

  // Print summary
  const summary = await pool.query(`
    SELECT c.id, c.name_ar, c.name_en, COUNT(p.id) as count 
    FROM products p 
    JOIN categories c ON p.category_id = c.id 
    WHERE p.merchant_id = 10 
    GROUP BY c.id, c.name_ar, c.name_en
  `);
  console.log('\n=== New Subcategory Distribution ===');
  for (const s of summary.rows) {
    console.log(`- ${s.name_ar} (${s.name_en}) [ID: ${s.id}]: ${s.count} products`);
  }

  await pool.end();
}
run();
