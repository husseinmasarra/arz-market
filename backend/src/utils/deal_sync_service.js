const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const db = require('../config/db');

const agent = new https.Agent({ rejectUnauthorized: false });

const UPLOADS_DIR = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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

const http = require('http');

function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { agent, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).href;
        }
        return fetchImageBuffer(redirectUrl).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch image status: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function detectLogoPatches(data, width, height, channels) {
  const patches = [];
  const regions = [
    { name: 'top-left', x1: 0, y1: 0, x2: Math.round(width * 0.45), y2: Math.round(height * 0.35) },
    { name: 'top-right', x1: Math.round(width * 0.55), y1: 0, x2: width, y2: Math.round(height * 0.35) },
    { name: 'bottom-left', x1: 0, y1: Math.round(height * 0.65), x2: Math.round(width * 0.45), y2: height },
    { name: 'bottom-right', x1: Math.round(width * 0.55), y1: Math.round(height * 0.65), x2: width, y2: height }
  ];

  for (const reg of regions) {
    let minX = reg.x2, maxX = reg.x1, minY = reg.y2, maxY = reg.y1;
    let logoPixelCount = 0;

    for (let y = reg.y1; y < reg.y2; y++) {
      for (let x = reg.x1; x < reg.x2; x++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const isBlue = (r < 90 && g > 70 && g < 225 && b > 130);
        const isOrange = (r > 180 && g > 60 && g < 200 && b < 100);
        if (isBlue || isOrange) {
          logoPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (logoPixelCount > 15) {
      const padX = Math.max(20, Math.round(width * 0.03));
      const padY = Math.max(20, Math.round(height * 0.03));
      const patchLeft = Math.max(0, minX - padX);
      const patchTop = Math.max(0, minY - padY);
      const patchWidth = Math.min(width - patchLeft, (maxX - minX) + padX * 2);
      const patchHeight = Math.min(height - patchTop, (maxY - minY) + padY * 2);

      patches.push({
        name: reg.name,
        left: patchLeft,
        top: patchTop,
        width: patchWidth,
        height: patchHeight,
        count: logoPixelCount
      });
    }
  }

  // Ensure clean top-left standard corner
  const hasTopLeft = patches.some(p => p.name === 'top-left');
  if (!hasTopLeft) {
    patches.push({
      name: 'top-left-standard',
      left: 0,
      top: 0,
      width: Math.round(width * 0.38),
      height: Math.round(height * 0.22),
      count: 0
    });
  }

  return patches;
}

async function cleanAndSaveDealImage(imageUrl, skuOrId) {
  try {
    const rawBuffer = await fetchImageBuffer(imageUrl);
    const { data, info } = await sharp(rawBuffer).raw().toBuffer({ resolveWithObject: true });
    const patches = detectLogoPatches(data, info.width, info.height, info.channels);

    const compositeInputs = patches.map(p => ({
      input: Buffer.from(`<svg width="${p.width}" height="${p.height}"><rect width="${p.width}" height="${p.height}" fill="#ffffff" /></svg>`),
      top: p.top,
      left: p.left
    }));

    const cleanedBuffer = await sharp(rawBuffer)
      .composite(compositeInputs)
      .webp({ quality: 90 })
      .toBuffer();

    const fileName = `deal_prod_${skuOrId}.webp`;
    const localFilePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(localFilePath, cleanedBuffer);

    return `/uploads/products/${fileName}`;
  } catch (err) {
    console.error(`Error cleaning image ${imageUrl}:`, err.message);
    return imageUrl;
  }
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

    if (!matched) {
      if (dealCat.id === '127') matched = existingCats.find(c => c.name_en && c.name_en.toLowerCase().includes('toys'));
      if (dealCat.id === '107') matched = existingCats.find(c => c.name_en && (c.name_en.toLowerCase().includes('mix') || c.name_en.toLowerCase().includes('accessories')));
      if (dealCat.id === '168') matched = existingCats.find(c => c.name_en && (c.name_en.toLowerCase().includes('blender') || c.name_en.toLowerCase().includes('coffee')));
      if (dealCat.id === '164') matched = existingCats.find(c => c.name_en && (c.name_en.toLowerCase().includes('scale') || c.name_en.toLowerCase().includes('massage')));
    }

    if (matched) {
      categoryIdMap[dealCat.id] = matched.id;
    } else {
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
          existingProd = await db.getAsync("SELECT id, image_url FROM products WHERE (name_en = ? OR name_ar = ? OR description_en LIKE ?)", [
            bilingual.name_en,
            bilingual.name_ar,
            `%${sku}%`
          ]);
        } else {
          existingProd = await db.getAsync("SELECT id, image_url FROM products WHERE name_en = ? OR name_ar = ?", [
            bilingual.name_en,
            bilingual.name_ar
          ]);
        }

        let finalImageUrl = item.imageUrl;
        if (item.imageUrl.includes('deal.com.lb')) {
          finalImageUrl = await cleanAndSaveDealImage(item.imageUrl, item.dealId || Date.now());
        }

        if (existingProd) {
          await db.runAsync(`
            UPDATE products 
            SET price_usd = ?, cost_price_usd = ?, old_price_usd = ?, image_url = ?, category_id = ?, merchant_id = ?, stock = 50, sync_batch_time = ?
            WHERE id = ?
          `, [
            markupPrice,
            item.originalPrice,
            oldPrice,
            finalImageUrl,
            targetCatId,
            merchant.id,
            now,
            existingProd.id
          ]);
          totalUpdated++;
        } else {
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
            finalImageUrl,
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

  console.log(`\n[Deal.com.lb Sync Finished] Cleaned & Imported: ${totalImported}, Updated: ${totalUpdated}, Total: ${totalImported + totalUpdated}`);

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
  cleanAndSaveDealImage,
  DEAL_CATEGORIES
};
