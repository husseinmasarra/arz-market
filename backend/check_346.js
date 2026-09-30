const db = require('./src/config/db');
const fs = require('fs');

async function check346() {
  const products = await db.allAsync(`
    SELECT p.id, p.name_ar, p.name_en, p.description_ar, p.description_en, p.category_id, p.merchant_id, p.price_usd
    FROM products p
    ORDER BY p.id ASC
  `);

  const sim = fs.readFileSync('./backend/comprehensive_simulation.js', 'utf8');
  eval(sim.slice(sim.indexOf('function classifyProduct(p) {'), sim.indexOf('const finalCounts = {};')));

  const in87 = [];
  products.forEach(p => {
    const target = classifyProduct(p);
    if (target === 87) {
      in87.push(p);
    }
  });

  console.log(`Still in 87: ${in87.length}`);
  in87.forEach((p, idx) => {
    console.log(`[${idx+1}/${in87.length}] ID ${p.id}: ${p.name_ar} | ${p.name_en}`);
  });

  process.exit(0);
}

check346();
