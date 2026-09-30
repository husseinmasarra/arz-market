const fs = require('fs');

const html = fs.readFileSync('retail_shop.html', 'utf8');

// Look for product grid container
const gridMatch = html.match(/<div[^>]*class="[^"]*(?:o_wsale_products_grid_table_wrapper|o_wsale_product_grid_wrapper|oe_product_cart|o_wsale_product_information)[^"]*"[\s\S]*?<\/div>/gi) || [];
console.log('Grid match count:', gridMatch.length);

// Look for oe_product_cart or product items
const cartRegex = /<div[^>]*class="[^"]*oe_product_cart[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;
const cards = [];
let m;
while ((m = cartRegex.exec(html)) !== null) {
  cards.push(m[0]);
}
console.log('Product cards found:', cards.length);

if (cards.length > 0) {
  console.log('\n--- First Card Sample ---');
  console.log(cards[0]);
} else {
  // Let's search for any div containing product title
  const titleDivs = html.match(/<h[1-6][^>]*class="[^"]*product[^"]*"[\s\S]*?<\/h[1-6]>/gi) || [];
  console.log('Title divs:', titleDivs.slice(0, 5));
  
  // Search for images with product
  const prodImgs = html.match(/<img[^>]*src="\/web\/image\/product\.template\/[^"]+"[^>]*>/gi) || [];
  console.log('Product images count:', prodImgs.length);
  if (prodImgs.length > 0) {
    console.log('Sample image:', prodImgs[0]);
  }
}
