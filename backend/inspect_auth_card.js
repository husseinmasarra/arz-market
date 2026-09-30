const fs = require('fs');

const authHtml = fs.readFileSync('logged_in_shop.html', 'utf8');

const titleIndex = authHtml.indexOf('o_wsale_products_item_title');
if (titleIndex !== -1) {
  const start = Math.max(0, titleIndex - 500);
  const end = Math.min(authHtml.length, titleIndex + 1200);
  console.log('=== AUTH SHOP SURROUNDING HTML CHUNK ===');
  console.log(authHtml.slice(start, end));
}
