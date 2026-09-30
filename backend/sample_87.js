const db = require('./src/config/db');

async function analyzeDirectProducts() {
  const prods87 = await db.allAsync(`SELECT id, name_ar, name_en, merchant_id, price_usd FROM products WHERE category_id = 87 ORDER BY id ASC`);
  console.log(`Total prods in 87: ${prods87.length}`);

  // Let's sample every 20 products to see the diversity
  console.log('\n--- Sample of Category 87 items ---');
  for (let i = 0; i < prods87.length; i += 15) {
    const p = prods87[i];
    console.log(`[${p.id}] ${p.name_ar} | ${p.name_en}`);
  }

  process.exit(0);
}

analyzeDirectProducts();
