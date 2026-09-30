const db = require('./src/config/db');

async function inspectRemaining87() {
  const prods87 = await db.allAsync(`SELECT id, name_ar, name_en, merchant_id, price_usd FROM products WHERE category_id = 87 ORDER BY id ASC`);
  console.log(`Remaining in 87: ${prods87.length}`);
  prods87.forEach(p => {
    console.log(`[${p.id}] ${p.name_ar} | ${p.name_en}`);
  });
  process.exit(0);
}

inspectRemaining87();
