const db = require('../config/db');

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Facebook / Meta Catalog Product Feed (RSS 2.0 / XML)
 */
exports.getFacebookFeed = async (req, res) => {
  try {
    const products = await db.allAsync(`
      SELECT p.*, c.name_ar as cat_ar, c.name_en as cat_en, m.name as merchant_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      WHERE p.price_usd > 0
      ORDER BY p.id DESC
    `);

    const siteUrl = 'https://arzmart.com';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ArzMart Product Catalog</title>
    <link>${siteUrl}</link>
    <description>ArzMart Lebanon Online Store - Electronics, Fragrances &amp; Everyday Goods</description>
`;

    for (const p of products) {
      const prodUrl = `${siteUrl}/?product_id=${p.id}`;
      const title = escapeXml(p.name_ar || p.name_en || 'ArzMart Product');
      const desc = escapeXml(p.description_ar || p.description_en || p.name_ar || 'Original Product from ArzMart');
      const category = escapeXml(p.cat_en || p.cat_ar || 'General Merchandise');
      const brand = escapeXml(p.merchant_name || 'ArzMart');
      const condition = 'new';
      const availability = (p.stock > 0) ? 'in stock' : 'out of stock';
      const price = `${Number(p.price_usd).toFixed(2)} USD`;
      
      let imgLink = p.image_url;
      if (!imgLink || imgLink.startsWith('data:')) {
        imgLink = `${siteUrl}/logo.png`;
      } else if (imgLink.startsWith('/')) {
        imgLink = `${siteUrl}${imgLink}`;
      }
      imgLink = escapeXml(imgLink);

      xml += `    <item>
      <g:id>${p.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${escapeXml(prodUrl)}</g:link>
      <g:image_link>${imgLink}</g:image_link>
      <g:brand>${brand}</g:brand>
      <g:condition>${condition}</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
      <g:product_type>${category}</g:product_type>
      <g:mpn>${escapeXml(p.sku || `SKU-${p.id}`)}</g:mpn>
    </item>
`;
    }

    xml += `  </channel>
</rss>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (err) {
    console.error('Facebook feed error:', err);
    res.status(500).send('Error generating Facebook feed');
  }
};

/**
 * Google Merchant Center Shopping Feed (XML)
 */
exports.getGoogleFeed = async (req, res) => {
  return exports.getFacebookFeed(req, res);
};

/**
 * TikTok Catalog Feed (CSV Format)
 */
exports.getTikTokFeed = async (req, res) => {
  try {
    const products = await db.allAsync(`
      SELECT p.*, c.name_ar as cat_ar, c.name_en as cat_en, m.name as merchant_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      WHERE p.price_usd > 0
      ORDER BY p.id DESC
    `);

    const siteUrl = 'https://arzmart.com';
    const headers = [
      'sku_id', 'title', 'description', 'availability', 'condition',
      'price', 'link', 'image_link', 'brand', 'google_product_category'
    ];

    let csv = headers.join(',') + '\n';

    for (const p of products) {
      const prodUrl = `${siteUrl}/?product_id=${p.id}`;
      let imgLink = p.image_url;
      if (!imgLink || imgLink.startsWith('data:')) {
        imgLink = `${siteUrl}/logo.png`;
      } else if (imgLink.startsWith('/')) {
        imgLink = `${siteUrl}${imgLink}`;
      }

      const row = [
        escapeCsv(p.sku || `SKU-${p.id}`),
        escapeCsv(p.name_ar || p.name_en),
        escapeCsv(p.description_ar || p.description_en || p.name_ar),
        escapeCsv(p.stock > 0 ? 'in_stock' : 'out_of_stock'),
        escapeCsv('new'),
        escapeCsv(`${Number(p.price_usd).toFixed(2)} USD`),
        escapeCsv(prodUrl),
        escapeCsv(imgLink),
        escapeCsv(p.merchant_name || 'ArzMart'),
        escapeCsv(p.cat_en || p.cat_ar || 'General')
      ];

      csv += row.join(',') + '\n';
    }

    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="arzmart_tiktok_catalog.csv"');
    res.send(csv);
  } catch (err) {
    console.error('TikTok feed error:', err);
    res.status(500).send('Error generating TikTok feed');
  }
};
