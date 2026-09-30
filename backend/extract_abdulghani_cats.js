const fs = require('fs');

const html = fs.readFileSync('retail_shop.html', 'utf8');

// Find all category links and text
const catRegex = /<a[^>]*href="(\/shop\/category\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
const cats = [];
let m;
while ((m = catRegex.exec(html)) !== null) {
  const url = m[1];
  const name = m[2].replace(/<[^>]+>/g, '').trim();
  if (name && !cats.find(c => c.url === url)) {
    cats.push({ url, name });
  }
}

console.log('Categories found on abdulghanitrading.com:', cats);
