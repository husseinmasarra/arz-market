const fs = require('fs');

const retailHtml = fs.existsSync('retail_shop.html') ? fs.readFileSync('retail_shop.html', 'utf8') : '';
const authHtml = fs.existsSync('auth_shop.html') ? fs.readFileSync('auth_shop.html', 'utf8') : '';

console.log('Retail HTML len:', retailHtml.length);
console.log('Auth HTML len:', authHtml.length);

// Let's find product links and card containers
const productLinkRegex = /href="(\/shop\/[a-zA-Z0-9_-]+-\d+)"/g;
const links = [];
let m;
while ((m = productLinkRegex.exec(retailHtml)) !== null) {
  if (!links.includes(m[1])) links.push(m[1]);
}
console.log(`Found ${links.length} unique product URLs on page 1:`);
console.log(links.slice(0, 10));

// Find category links
const catRegex = /href="(\/shop\/category\/[a-zA-Z0-9_/-]+)"/g;
const categories = [];
while ((m = catRegex.exec(retailHtml)) !== null) {
  if (!categories.includes(m[1])) categories.push(m[1]);
}
console.log(`\nFound ${categories.length} category URLs:`);
console.log(categories.slice(0, 10));

// Find pagination links
const pageRegex = /href="(\/shop\/page\/\d+[^\"]*)"/g;
const pages = [];
while ((m = pageRegex.exec(retailHtml)) !== null) {
  if (!pages.includes(m[1])) pages.push(m[1]);
}
console.log(`\nFound ${pages.length} pagination URLs:`, pages);

// Let's inspect a product card chunk from retailHtml vs authHtml
const tableCellRegex = /<td[^>]*class="[^"]*oe_product[^"]*"[\s\S]*?<\/td>/gi;
const retailCells = retailHtml.match(tableCellRegex) || [];
const authCells = authHtml.match(tableCellRegex) || [];
console.log(`\nFound ${retailCells.length} retail product cells and ${authCells.length} auth product cells.`);

if (retailCells.length > 0) {
  console.log('\n--- Sample Retail Product Cell ---');
  console.log(retailCells[0].slice(0, 800));
}

if (authCells.length > 0) {
  console.log('\n--- Sample Auth Product Cell ---');
  console.log(authCells[0].slice(0, 800));
}
