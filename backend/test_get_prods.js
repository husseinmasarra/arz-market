const db = require('./src/config/db');

async function testGetProducts() {
  try {
    const showAll = true;
    let query = `
      SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en, m.name as merchant_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      WHERE 1=1
      ORDER BY (CASE WHEN p.stock > 0 THEN 0 ELSE 1 END) ASC, p.id DESC
    `;
    console.log('Querying products with db.allAsync...');
    const start = Date.now();
    const rows = await db.allAsync(query, []);
    console.log(`Fetched ${rows.length} rows in ${Date.now() - start}ms`);
    process.exit(0);
  } catch (err) {
    console.error('Error in db.allAsync:', err);
    process.exit(1);
  }
}

setTimeout(testGetProducts, 1000);
