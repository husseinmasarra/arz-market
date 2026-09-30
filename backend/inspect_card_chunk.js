const fs = require('fs');

const html = fs.readFileSync('retail_shop.html', 'utf8');

const titleIndex = html.indexOf('o_wsale_products_item_title');
if (titleIndex !== -1) {
  const start = Math.max(0, titleIndex - 500);
  const end = Math.min(html.length, titleIndex + 1200);
  console.log('=== SURROUNDING HTML CHUNK ===');
  console.log(html.slice(start, end));
}
