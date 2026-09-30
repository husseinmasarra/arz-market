const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

https.get('https://www.abdulghanitrading.com/shop/maison-alhambra-glacier-bold-100ml-edp-men-7065', {
  agent,
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    // Find img tags
    const imgs = body.match(/<img[^>]+>/gi) || [];
    console.log('--- IMGS ON PAGE ---');
    imgs.forEach(img => {
      if (img.includes('product') || img.includes('image_') || img.includes('7065') || img.includes('Glacier')) {
        console.log(img);
      }
    });

    // Find all links or spans with image references
    const allMatches = body.match(/[^"'\s]+\.(?:jpg|jpeg|png|webp)[^"'\s]*/gi) || [];
    console.log('--- ALL IMAGE ASSETS ---');
    console.log([...new Set(allMatches)].filter(x => !x.includes('logo') && !x.includes('favicon')));
  });
});
