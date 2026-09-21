const https = require('https');
const db = require('../config/db');

const agent = new https.Agent({ rejectUnauthorized: false });

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

const DEAL_CATEGORIES = [
  { id: '104', name_en: 'Home Supplies', name_ar: 'مستلزمات منزلية' },
  { id: '106', name_en: 'School Supplies', name_ar: 'مستلزمات مدرسية' },
  { id: '107', name_en: 'Electronics & Accessories', name_ar: 'إلكترونيات وإكسسوارات' },
  { id: '124', name_en: 'Beauty Products', name_ar: 'منتجات التجميل والعناية' },
  { id: '127', name_en: 'Toys & Baby Products', name_ar: 'ألعاب ومستلزمات الأطفال' },
  { id: '129', name_en: 'Party Supplies', name_ar: 'مستلزمات الحفلات' },
  { id: '134', name_en: 'Care Supplies', name_ar: 'مستلزمات العناية' },
  { id: '174', name_en: 'Home Decor', name_ar: 'ديكور منزلي' },
  { id: '175', name_en: 'Super Deal', name_ar: 'عروض سوبر ديل' },
  { id: '162', name_en: 'Sports & Fitness', name_ar: 'رياضة ولياقة بدنية' },
  { id: '164', name_en: 'Health Care', name_ar: 'رعاية صحية' },
  { id: '168', name_en: 'Muller Koch', name_ar: 'أدوات مطبخ مولر كوخ' },
  { id: '179', name_en: 'Summer Essentials', name_ar: 'مستلزمات الصيف' }
];

function splitTitleBilingual(title) {
  let nameAr = '';
  let nameEn = '';

  if (title.includes('|')) {
    const parts = title.split('|').map(s => s.trim());
    const isFirstAr = /[\u0600-\u06FF]/.test(parts[0]);
    if (isFirstAr) {
      nameAr = parts[0];
      nameEn = parts.slice(1).join(' ');
    } else {
      nameEn = parts[0];
      nameAr = parts.slice(1).join(' ');
    }
  } else if (title.includes('–') || title.includes('—') || title.includes('-')) {
    const parts = title.split(/[–—-]/).map(s => s.trim());
    const arParts = parts.filter(p => /[\u0600-\u06FF]/.test(p));
    const enParts = parts.filter(p => !/[\u0600-\u06FF]/.test(p));
    nameAr = arParts.join(' ') || title;
    nameEn = enParts.join(' ') || title;
  } else {
    const words = title.split(/\s+/);
    const arWords = words.filter(w => /[\u0600-\u06FF]/.test(w));
    const enWords = words.filter(w => !/[\u0600-\u06FF]/.test(w));
    if (arWords.length > 0 && enWords.length > 0) {
      nameAr = arWords.join(' ');
      nameEn = enWords.join(' ');
    } else if (arWords.length > 0) {
      nameAr = title;
      nameEn = title;
    } else {
      nameAr = title;
      nameEn = title;
    }
  }

  return {
    name_ar: (nameAr || title).replace(/\s+/g, ' ').trim(),
    name_en: (nameEn || title).replace(/\s+/g, ' ').trim()
  };
}

function parseCards(html, categoryInfo) {
  const cardRegex = /<article[^>]*class=["'][^"']*deal-product-card[\s\S]*?<\/article>/gi;
  const cards = [];
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    const cardHtml = m[0];
    
    // Image
    const imgMatch = cardHtml.match(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/i);
    const imgSrc = imgMatch ? imgMatch[1] : '';
    const alt = imgMatch ? imgMatch[2] : '';
    
    // Skip if not a clean product photo
    if (!imgSrc || !imgSrc.includes('dealuploads/') || /banner|logo|store|appstore/i.test(imgSrc)) {
      continue;
    }

    // Title
    const titleMatch = cardHtml.match(/<h3 class="deal-product-card__title">([\s\S]*?)<\/h3>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : alt;
    const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();

    // Price
    const priceMatch = cardHtml.match(/<strong class="deal-product-card__price">[\s\S]*?\$?\s*([\d,.]+)/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;

    // Old Price
    const oldPriceMatch = cardHtml.match(/<del class="deal-product-card__old-price">[\s\S]*?\$?\s*([\d,.]+)/i);
    const oldPrice = oldPriceMatch ? parseFloat(oldPriceMatch[1].replace(/,/g, '')) : 0;

    // Deal ID
    const idMatch = cardHtml.match(/data-wishlist-deal=["'](\d+)["']/i) || cardHtml.match(/#(\d+)/i);
    const dealId = idMatch ? idMatch[1] : '';

    if (cleanTitle && price > 0) {
      const fullImgUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.deal.com.lb/${imgSrc.replace(/^\//, '')}`;
      const markupPrice = Math.round(price * 1.18 * 100) / 100; // +18% Markup
      const calculatedOldPrice = oldPrice > price ? Math.round(oldPrice * 1.18 * 100) / 100 : Math.round(markupPrice * 1.30 * 100) / 100;

      cards.push({
        dealId,
        title: cleanTitle,
        originalPrice: price,
        markupPrice,
        oldPrice: calculatedOldPrice,
        imageUrl: fullImgUrl,
        category: categoryInfo
      });
    }
  }
  return cards;
}

async function syncDealLebanon({ sourceId = null, markupPercent = 18 } = {}) {
  const effectiveMarkup = Number(markupPercent) >= 0 ? Number(markupPercent) : 18;
  const markupMultiplier = 1 + (effectiveMarkup / 100);
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  console.log(`[Deal.com.lb Sync] Starting sync with +${effectiveMarkup}% markup at ${now}...`);
  
  // 1. Ensure Merchant Deal.com.lb exists
  let merchant = await db.getAsync("SELECT id FROM merchants WHERE name = 'Deal.com.lb'");
  if (!merchant) {
    const res = await db.runAsync(
      "INSERT INTO merchants (name, company, phone, email, whatsapp_number) VALUES (?, ?, ?, ?, ?)",
      ['Deal.com.lb', 'Deal Lebanon', '+96170221998', 'support@deal.com.lb', '+96170221998']
    );
    merchant = { id: res.lastID };
    console.log(`[Deal.com.lb Sync] Created merchant Deal.com.lb with ID: ${merchant.id}`);
  }

  // 2. Ensure Supplier Source Deal.com.lb exists
  let source = null;
  if (sourceId) {
    source = await db.getAsync("SELECT * FROM supplier_sources WHERE id = ?", [sourceId]);
  }
  if (!source) {
    source = await db.getAsync("SELECT * FROM supplier_sources WHERE name = 'Deal.com.lb' OR url LIKE '%deal.com.lb%'");
  }
  if (!source) {
    const sRes = await db.runAsync(
      "INSERT INTO supplier_sources (name, url, passcode, markup_percent, sync_type, is_default, phone, email, whatsapp_number, shipping_notes) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)",
      ['Deal.com.lb', 'https://www.deal.com.lb/', '', effectiveMarkup, 'deal_scraper', '+96170221998', 'support@deal.com.lb', '+96170221998', 'منصة الصفقات والعروض في لبنان']
    );
    source = { id: sRes.lastID, name: 'Deal.com.lb' };
  }

  // 3. Fetch existing categories to avoid duplicates
  let existingCats = await db.allAsync("SELECT id, name_ar, name_en FROM categories");
  const norm = str => (str || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');

  const categoryIdMap = {};

  for (const dealCat of DEAL_CATEGORIES) {
    let matched = existingCats.find(c => 
      norm(c.name_en) === norm(dealCat.name_en) || 
      norm(c.name_ar) === norm(dealCat.name_ar)
    );

    // Fuzzy matching for existing categories
    if (!matched) {
      if (dealCat.id === '127') matched = existingCats.find(c => c.name_en.toLowerCase().includes('toys'));
      if (dealCat.id === '107') matched = existingCats.find(c => c.name_en.toLowerCase().includes('mix') || c.name_en.toLowerCase().includes('accessories'));
      if (dealCat.id === '168') matched = existingCats.find(c => c.name_en.toLowerCase().includes('blender') || c.name_en.toLowerCase().includes('coffee'));
      if (dealCat.id === '164') matched = existingCats.find(c => c.name_en.toLowerCase().includes('scale') || c.name_en.toLowerCase().includes('massage'));
    }

    if (matched) {
      categoryIdMap[dealCat.id] = matched.id;
    } else {
      // Create new clean category
      const res = await db.runAsync(
        "INSERT INTO categories (name_ar, name_en, active, sort_order) VALUES (?, ?, 1, 0)",
        [dealCat.name_ar, dealCat.name_en]
      );
      const newCatId = res.lastID;
      categoryIdMap[dealCat.id] = newCatId;
      existingCats.push({ id: newCatId, name_ar: dealCat.name_ar, name_en: dealCat.name_en });
    }
  }

  // 4. Scrape and insert/update products
  let totalImported = 0;
  let totalUpdated = 0;

  for (const dealCat of DEAL_CATEGORIES) {
    const targetCatId = categoryIdMap[dealCat.id];
    try {
      const html = await fetchUrl(`https://www.deal.com.lb/shop/?categ=${dealCat.id}`);
      const items = parseCards(html, dealCat);

      for (const item of items) {
        const bilingual = splitTitleBilingual(item.title);
        const sku = item.dealId ? `DEAL-${item.dealId}` : '';
        const markupPrice = Math.round(item.originalPrice * markupMultiplier * 100) / 100;
        const oldPrice = item.oldPrice > item.originalPrice 
          ? Math.round(item.oldPrice * markupMultiplier * 100) / 100 
          : Math.round(markupPrice * 1.30 * 100) / 100;

        // Check if product already exists
        let existingProd = null;
        if (sku) {
          existingProd = await db.getAsync("SELECT id FROM products WHERE (name_en = ? OR name_ar = ? OR description_en LIKE ?)", [
            bilingual.name_en,
            bilingual.name_ar,
            `%${sku}%`
          ]);
        } else {
          existingProd = await db.getAsync("SELECT id FROM products WHERE name_en = ? OR name_ar = ?", [
            bilingual.name_en,
            bilingual.name_ar
          ]);
        }

        if (existingProd) {
          // Update product price and ensure category and active status
          await db.runAsync(`
            UPDATE products 
            SET price_usd = ?, cost_price_usd = ?, old_price_usd = ?, image_url = ?, category_id = ?, merchant_id = ?, stock = 50, sync_batch_time = ?
            WHERE id = ?
          `, [
            markupPrice,
            item.originalPrice,
            oldPrice,
            item.imageUrl,
            targetCatId,
            merchant.id,
            now,
            existingProd.id
          ]);
          totalUpdated++;
        } else {
          // Insert new product
          await db.runAsync(`
            INSERT INTO products (
              name_ar, name_en, description_ar, description_en,
              price_usd, cost_price_usd, old_price_usd,
              category_id, merchant_id, image_url, stock,
              is_new_arrival, sync_batch_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          `, [
            bilingual.name_ar,
            bilingual.name_en,
            `منتج أصلي عالي الجودة متوفر للتوصيل الفوري والدفع عند الاستلام. SKU: ${sku}`,
            `Original high quality product available for fast delivery and cash on delivery in Lebanon. SKU: ${sku}`,
            markupPrice,
            item.originalPrice,
            oldPrice,
            targetCatId,
            merchant.id,
            item.imageUrl,
            50,
            now
          ]);
          totalImported++;
        }
      }
    } catch (catErr) {
      console.error(`Error processing category ${dealCat.name_en}:`, catErr.message);
    }
  }

  // 5. Update Supplier Source status
  const statusMsg = `جديد: +${totalImported} | تحديث: ${totalUpdated} | نفد: 0`;
  if (source && source.id) {
    await db.runAsync(`
      UPDATE supplier_sources 
      SET last_sync_time = ?, 
          last_sync_status = ?,
          last_sync_inserted = ?,
          last_sync_updated = ?,
          last_sync_out_of_stock = 0
      WHERE id = ?
    `, [now, statusMsg, totalImported, totalUpdated, source.id]).catch(() => {});
  }

  // 6. Invalidate product and category caches
  const { invalidateProductsCache } = require('../controllers/productController');
  if (invalidateProductsCache) invalidateProductsCache();
  const { invalidateCategoriesCache } = require('../controllers/categoryController');
  if (invalidateCategoriesCache) invalidateCategoriesCache();

  console.log(`\n[Deal.com.lb Sync Finished] Imported: ${totalImported}, Updated: ${totalUpdated}, Total: ${totalImported + totalUpdated}`);

  return {
    success: true,
    totalImported,
    totalUpdated,
    totalProcessed: totalImported + totalUpdated,
    markupApplied: `+${effectiveMarkup}%`,
    last_sync_time: now,
    message: statusMsg
  };
}

module.exports = {
  syncDealLebanon,
  DEAL_CATEGORIES
};
