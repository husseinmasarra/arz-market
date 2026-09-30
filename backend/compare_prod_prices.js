const fs = require('fs');

const guestHtml = fs.readFileSync('guest_prod.html', 'utf8');
const loggedInHtml = fs.readFileSync('logged_in_prod.html', 'utf8');

console.log('Guest length:', guestHtml.length);
console.log('Logged-in length:', loggedInHtml.length);

function extractPriceDetails(html, label) {
  console.log(`\n--- ${label} ---`);
  
  // Extract all currency spans
  const currencySpans = html.match(/<span[^>]*class="[^"]*oe_currency_value[^"]*"[^>]*>[\s\S]*?<\/span>/gi) || [];
  console.log('Currency spans:', currencySpans.map(s => s.replace(/<[^>]+>/g, '').trim()));

  // Extract entire product price block
  const priceBlock = html.match(/class="[^"]*product_price[^"]*"[\s\S]*?<\/div>/gi) || [];
  if (priceBlock.length > 0) {
    console.log('Price block:', priceBlock[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }

  // Look for discount or strikethrough or wholesale price
  const del = html.match(/<del[^>]*>[\s\S]*?<\/del>/gi) || [];
  console.log('Strikethrough <del>:', del.map(s => s.replace(/<[^>]+>/g, '').trim()));
}

extractPriceDetails(guestHtml, 'GUEST (RETAIL)');
extractPriceDetails(loggedInHtml, 'LOGGED-IN (MERCHANT)');
