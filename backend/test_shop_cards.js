const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

https.get('https://www.abdulghanitrading.com/shop', {
  agent,
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    // Find all img tags in shop page
    const imgs = body.match(/<img[^>]+>/gi) || [];
    console.log('--- IMGS ON SHOP PAGE (Sample 10) ---');
    imgs.slice(0, 10).forEach(img => console.log(img));

    // Find all product links and image references
    const cards = body.match(/<form[^>]*class="[^"]*oe_product_cart[^"]*"[\s\S]*?<\/form>/gi) || [];
    console.log('Cards found on shop page:', cards.length);
    if (cards[0]) {
      console.log('Sample Card HTML:\n', cards[0]);
    }
  });
});
