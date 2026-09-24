const db = require('../config/db');

exports.getSitemapXml = async (req, res) => {
  try {
    const baseUrl = 'https://arzmart.com';
    const now = new Date().toISOString().split('T')[0];

    // Fetch categories
    const categories = await db.allAsync(
      "SELECT id, name_ar, name_en FROM categories WHERE active = 1 ORDER BY id ASC"
    ).catch(() => []);

    // Fetch products
    const products = await db.allAsync(
      "SELECT id, name_ar, name_en, image_url, created_at FROM products WHERE stock > 0 ORDER BY id DESC LIMIT 5000"
    ).catch(() => []);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Homepage
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // 2. Categories
    for (const cat of categories) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/?category=${cat.id}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // 3. Products
    for (const prod of products) {
      const prodDate = prod.created_at || now;
      const formattedDate = prodDate.includes('T') ? prodDate.split('T')[0] : prodDate.substring(0, 10);
      const prodTitle = prod.name_ar || prod.name_en || 'Product';
      const fullImg = prod.image_url 
        ? (prod.image_url.startsWith('http') ? prod.image_url : `${baseUrl}${prod.image_url.startsWith('/') ? '' : '/'}${prod.image_url}`)
        : '';

      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/?product=${prod.id}</loc>\n`;
      xml += `    <lastmod>${formattedDate || now}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      if (fullImg) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${fullImg.replace(/&/g, '&amp;')}</image:loc>\n`;
        xml += `      <image:title><![CDATA[${prodTitle}]]></image:title>\n`;
        xml += `    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(xml);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).send('Error generating sitemap');
  }
};
