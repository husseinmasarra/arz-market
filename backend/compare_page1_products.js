const fs = require('fs');

const retailHtml = fs.readFileSync('retail_shop.html', 'utf8');
const authHtml = fs.readFileSync('logged_in_shop.html', 'utf8');

function extractProducts(html) {
  const list = [];
  // Match each product card chunk
  const cardRegex = /<div class="o_wsale_product_information flex-grow-1 flex-shrink-1">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    const chunk = m[1];
    const titleMatch = chunk.match(/<h2 class="o_wsale_products_item_title[^"]*">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i);
    const priceMatch = chunk.match(/<span class="oe_currency_value">([\s\S]*?)<\/span>/i);
    const tmplMatch = chunk.match(/name="product_template_id"[^>]*value="(\d+)"/i) || chunk.match(/data-product-template-id="(\d+)"/i);
    const prodMatch = chunk.match(/name="product_id"[^>]*value="(\d+)"/i) || chunk.match(/data-product-product-id="(\d+)"/i);

    if (titleMatch) {
      list.push({
        url: titleMatch[1],
        title: titleMatch[2].trim(),
        price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '').trim()) : null,
        templateId: tmplMatch ? tmplMatch[1] : null,
        productId: prodMatch ? prodMatch[1] : null
      });
    }
  }
  return list;
}

const retailProds = extractProducts(retailHtml);
const authProds = extractProducts(authHtml);

console.log(`Retail count: ${retailProds.length} | Auth count: ${authProds.length}`);
console.log('\n=== COMPARING PAGE 1 PRODUCTS ===');
for (let i = 0; i < Math.max(retailProds.length, authProds.length); i++) {
  const r = retailProds[i];
  const a = authProds[i];
  const wsPrice = a ? a.price : null;
  const rtPrice = r ? r.price : null;
  const costWithVat = wsPrice ? Math.round(wsPrice * 1.12 * 100) / 100 : (rtPrice ? Math.round(rtPrice * 1.12 * 100) / 100 : null);
  
  console.log(`${i+1}. "${r?.title || a?.title}" (ID: ${r?.templateId})`);
  console.log(`   - Retail Price (سعر الموقع العادي): $${rtPrice}`);
  console.log(`   - Wholesale Price (سعر الجملة): $${wsPrice}`);
  console.log(`   - Cost + 12% VAT (سعر الاستلام مع الضريبة): $${costWithVat}`);
}
