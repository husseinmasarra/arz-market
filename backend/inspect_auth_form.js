const fs = require('fs');

const authHtml = fs.readFileSync('logged_in_prod.html', 'utf8');

// Find form or product details
const formMatch = authHtml.match(/<form[^>]*action="\/shop\/cart\/update"[\s\S]*?<\/form>/i);
if (formMatch) {
  console.log('=== PRODUCT FORM IN AUTH ===');
  console.log(formMatch[0]);
}

// Find all spans or divs with price or discount or b2b
const priceDivs = authHtml.match(/<[^>]+class="[^"]*(?:price|b2b|wholesale|cost|discount|rate)[^"]*"[\s\S]*?<\/[^>]+>/gi) || [];
console.log('\n=== ALL PRICE/DISCOUNT ELEMENTS ===');
for (const div of priceDivs.slice(0, 15)) {
  console.log(div.replace(/\s+/g, ' ').slice(0, 200));
}
