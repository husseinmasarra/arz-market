const fs = require('fs');

const authHtml = fs.readFileSync('logged_in_shop.html', 'utf8');

// Search for pricelist dropdown or active pricelist
const plMatch = authHtml.match(/class="[^"]*pricelist[^"]*"[\s\S]*?<\/div>/gi) || [];
console.log('Pricelist elements in logged_in_shop.html:');
for (const pl of plMatch) {
  console.log(pl.replace(/\s+/g, ' '));
}

// Search for all currency values in logged_in_shop.html
const allPrices = authHtml.match(/<span[^>]*class="[^"]*oe_currency_value[^"]*"[^>]*>([\s\S]*?)<\/span>/gi) || [];
console.log(`Found ${allPrices.length} currency values in logged_in_shop.html`);
console.log('Sample currency values:', allPrices.slice(0, 10).map(s => s.replace(/<[^>]+>/g, '').trim()));
