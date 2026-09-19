/**
 * DR PHONE Synchronization Service for Arz-Mart
 * Handles merging DR PHONE catalog into Arz-Mart database,
 * applying +45% margin, localizing images, and automated daily updates.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const BASE_URL = 'https://drphonewholesale.online';
const UPLOADS_DIR = path.join(__dirname, '../../uploads/products');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Arabic category translations mapping
const CATEGORY_TRANSLATIONS = {
  'Earphone': 'سماعات أذن سلكية',
  'Power Bank': 'بطاريات متنقلة وشواحن سفري',
  'Hair Trimmer': 'ماكينات حلاقة وعناية',
  'Holder & Stand': 'حوامل وقواعد الهواتف والسيارات',
  'Razer': 'منتجات ريزر للألعاب',
  'Airpods': 'سماعات ايربودز وبلوتوث',
  'Baby Monitor': 'كاميرات مراقبة الأطفال',
  'IP Camera': 'كاميرات مراقبة ذكية IP',
  'Light': 'إضاءات ورينغ لايت وليدات',
  'Speaker': 'مكبرات صوت وسبيكرات بلوتوث',
  'Toothbrush': 'فراشي أسنان كهربائية ذكية',
  'Charge & Cable': 'شواحن وكابلات توصيل سريعة',
  'Massage Machine': 'أجهزة تدليك ومساج',
  'Mix Product': 'منتجات وإلكترونيات منوعة',
  'Smart Watch': 'ساعات ذكية وسوارات رياضية',
  'HyperX': 'سماعات واكسسوارات هايبر إكس',
  'Jump Starter': 'أجهزة تشغيل بطاريات السيارات',
  'Bag': 'حقائب وحوافظ أجهزة ذكية',
  'Toys': 'ألعاب إلكترونية ومبتكرة',
  'Projector': 'أجهزة عرض بروجيكتور سينمائية',
  'Pen': 'أقلام ذكية وشاشات لمس',
  'Scale': 'موازين ذكية ديجيتال',
  'Microphone': 'مايكروفونات احترافية وبودكاست',
  'Blower & Fan': 'مراوح ومنافخ تنظيف إلكترونية',
  'FM Transmitter': 'وصلات وشواحن سيارة بلوتوث FM',
  'Smart Glasses': 'نظارات ذكية مدمجة بسماعات',
  'Monitor': 'شاشات كمبيوتر وألعاب',
  'Console Retro Game': 'أجهزة ألعاب كلاسيكية ريترو',
  'Cover': 'كفرات وأغطية حماية',
  'Keyboard & Mouse': 'لوحات مفاتيح وماوسات ألعاب',
  'Gaming Accessories': 'إكسسوارات جيمنج ومسكات تحكم',
  'Coffee Maker': 'ماكينات تحضير القهوة المحمولة',
  'Converter': 'محولات ومنافذ Type-C و HDMI',
  'Airtag': 'أجهزة تتبع وحماية ذكية',
  'Digital & Action Camera': 'كاميرات تصوير رقمية وأكشن',
  'Flash & Memory': 'فلاشات وبطاقات ذاكرة تخزين',
  'Tripod & Gimbal': 'ترايبود ومثبتات تصوير جيمبال',
  'TV Box': 'أجهزة تي في بوكس ذكية',
  'Safe Box': 'خزائن أمان إلكترونية',
  'Cooling Radiator': 'مبردات هواتف وأجهزة ألعاب',
  'Socket': 'مشتركات وأفياش كهرباء ذكية',
  'Gaming Chair': 'كراسي ألعاب مريحة',
  'Vape': 'سحبات وأجهزة فيب وملحقاتها',
  'Headphones': 'سماعات رأس محيطية',
  'AUX': 'كابلات ووصلات صوت AUX',
  'Screen Protector': 'لصقات حماية شاشة ضد الكسر',
  'Network': 'أجهزة شبكات ومقويات واي فاي',
  'Tablet': 'أجهزة تابلت ولوحية',
  'Diffusers': 'فواحات ومرطبات جو عطرية',
  'Blender': 'خلاطات فواكه ومشروبات محمولة'
};

function applyMarkup(price, markupPercent = 45) {
  if (price === undefined || price === null || isNaN(price)) return 2.5;
  const num = Number(price);
  if (num <= 0) return 2.5; // Avoid $0.00 products in store
  const factor = 1 + (markupPercent / 100);
  return Math.round(num * factor * 100) / 100;
}

// Clean and normalize target URL
function cleanUrl(inputUrl) {
  let url = (inputUrl || BASE_URL).trim();
  // Strip hash (e.g. #keyboard-mouse)
  url = url.split('#')[0];
  // Strip query parameters
  url = url.split('?')[0].replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

// Download image locally if missing
function downloadImageLocally(remoteUrl, filename, targetBaseUrl = BASE_URL) {
  return new Promise((resolve) => {
    const dest = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      return resolve(true);
    }
    const file = fs.createWriteStream(dest);
    const fullUrl = remoteUrl.startsWith('http') ? remoteUrl : `${targetBaseUrl}${remoteUrl.startsWith('/') ? '' : '/'}${remoteUrl}`;
    
    https.get(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': targetBaseUrl + '/'
      }
    }, res => {
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return resolve(false);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', () => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      resolve(false);
    });
  });
}

// Login & Fetch Raw DR PHONE Catalog
function fetchDrPhoneCatalog(passcode = 'Drphone123', targetBaseUrl = BASE_URL) {
  const cleanBase = cleanUrl(targetBaseUrl);
  return new Promise((resolve, reject) => {
    https.get(cleanBase + '/', res => {
      let html = '';
      const cookie1 = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
      res.on('data', c => html += c);
      res.on('end', () => {
        const csrfMatch = html.match(/name="csrf"\s+value="([^"]+)"/);
        const csrf = csrfMatch ? csrfMatch[1] : '';

        const body = new URLSearchParams({
          csrf,
          passcode,
          catalog_login: '1'
        }).toString();

        const req = https.request(cleanBase + '/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            'Cookie': cookie1,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': cleanBase + '/'
          }
        }, postRes => {
          const newCookies = postRes.headers['set-cookie'] || [];
          const authCookie = newCookies.map(c => c.split(';')[0]).join('; ') || cookie1;

          https.get(cleanBase + '/api/catalog.php', {
            headers: {
              'Cookie': authCookie,
              'User-Agent': 'Mozilla/5.0',
              'Referer': cleanBase + '/'
            }
          }, apiRes => {
            if (apiRes.statusCode === 401) {
              return reject(new Error('Unauthorized passcode for DR PHONE'));
            }
            let data = '';
            apiRes.on('data', c => data += c);
            apiRes.on('end', () => {
              try {
                const json = JSON.parse(data);
                resolve(json);
              } catch (e) {
                reject(new Error('Failed to parse catalog JSON: ' + e.message));
              }
            });
          }).on('error', reject);
        });

        req.on('error', reject);
        req.write(body);
        req.end();
      });
    }).on('error', reject);
  });
}

/**
 * Synchronize all DR PHONE catalog data into Arz-Mart database
 */

// Fetch catalog from a Shopify store via open JSON feed
function fetchShopifyCatalog(targetBaseUrl) {
  const cleanBase = cleanUrl(targetBaseUrl);
  let storeOrigin = cleanBase;
  try {
    storeOrigin = new URL(cleanBase).origin;
  } catch (e) {}

  return new Promise((resolve, reject) => {
    const endpoints = [
      `${storeOrigin}/products.json?limit=250`,
      `${cleanBase}/products.json?limit=250`
    ];

    function tryEndpoint(idx) {
      if (idx >= endpoints.length) {
        return reject(new Error('Failed to fetch Shopify catalog: no valid endpoint found'));
      }
      const ep = endpoints[idx];
      https.get(ep, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json'
        }
      }, res => {
        if (res.statusCode !== 200) {
          return tryEndpoint(idx + 1);
        }
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const shopifyProducts = json.products || [];
            if (shopifyProducts.length === 0 && idx < endpoints.length - 1) {
              return tryEndpoint(idx + 1);
            }

            const catMap = {};
            for (const p of shopifyProducts) {
              let cat = (p.product_type || '').trim();
              if (!cat && p.tags && p.tags.length > 0) {
                cat = String(p.tags[0]).trim();
              }
              if (!cat) {
                const titleLower = p.title.toLowerCase();
                if (titleLower.includes('cable') || titleLower.includes('wire') || titleLower.includes('plug')) {
                  cat = 'كابلات وتوصيلات (Cables & Plugs)';
                } else if (titleLower.includes('module') || titleLower.includes('converter') || titleLower.includes('sensor')) {
                  cat = 'وحدات ومحولات إلكترونية (Modules & Converters)';
                } else if (titleLower.includes('battery') || titleLower.includes('power') || titleLower.includes('charger')) {
                  cat = 'بطاريات وشواحن (Batteries & Power)';
                } else {
                  cat = 'قطع وإلكترونيات منوعة (Electronics & Accessories)';
                }
              }

              if (!catMap[cat]) catMap[cat] = [];
              const price = p.variants && p.variants[0] ? Number(p.variants[0].price) : 5;
              const img = p.images && p.images[0] ? p.images[0].src : (p.image ? p.image.src : '');
              const stock = p.variants && p.variants[0] && p.variants[0].inventory_quantity !== null
                ? Math.max(5, p.variants[0].inventory_quantity)
                : 30;

              catMap[cat].push({
                name: p.title,
                name_ar: p.title,
                description: (p.body_html || p.title).replace(/<[^>]+>/g, '').trim(),
                description_ar: (p.body_html || p.title).replace(/<[^>]+>/g, '').trim(),
                price: price,
                image: img,
                stock: stock,
                options: (p.variants || []).map(v => ({ name: v.title, price: Number(v.price) }))
              });
            }

            const catalog = Object.keys(catMap).map(catName => ({
              name: catName,
              name_ar: catName,
              items: catMap[catName]
            }));

            resolve({ catalog, totalItems: shopifyProducts.length });
          } catch (e) {
            tryEndpoint(idx + 1);
          }
        });
      }).on('error', () => tryEndpoint(idx + 1));
    }

    tryEndpoint(0);
  });
}

async function syncDrPhoneToArzMart(options = {}) {
  const settings = await db.getAsync("SELECT * FROM settings ORDER BY id DESC LIMIT 1");
  const targetUrl = cleanUrl(options.url || (settings && settings.supplier_catalog_url) || BASE_URL);
  const passcode = (options.passcode || (settings && settings.supplier_catalog_passcode) || 'Drphone123').trim();
  const markupPercent = options.markupPercent !== undefined 
    ? Number(options.markupPercent) 
    : (settings && settings.supplier_markup_percent ? Number(settings.supplier_markup_percent) : 45);

  console.log(`[DR PHONE Sync Service] Starting synchronization from ${targetUrl} (Markup: +${markupPercent}%)...`);

  // Step 1: Fetch raw catalog based on source type
  let catalogData;
  const isShopifyCandidate = options.syncType === 'shopify_json' || 
                             options.syncType === 'open_json' || 
                             targetUrl.includes('myshopify.com') || 
                             targetUrl.toLowerCase().includes('collection') ||
                             targetUrl.includes('products.json');

  if (isShopifyCandidate) {
    try {
      catalogData = await fetchShopifyCatalog(targetUrl);
    } catch (shopifyErr) {
      console.log('[Sync Service] Shopify fetch error, falling back to wholesale:', shopifyErr.message);
      catalogData = await fetchDrPhoneCatalog(passcode, targetUrl);
    }
  } else {
    try {
      catalogData = await fetchDrPhoneCatalog(passcode, targetUrl);
    } catch (wholesaleErr) {
      console.log('[Sync Service] Wholesale fetch error, falling back to Shopify/JSON:', wholesaleErr.message);
      catalogData = await fetchShopifyCatalog(targetUrl);
    }
  }
  const rawCategories = (catalogData && catalogData.catalog) || [];

  console.log(`[DR PHONE Sync Service] Retrieved ${rawCategories.length} categories from ${targetUrl}.`);

  // Step 2: Ensure merchant exists in Arz-Mart
  const merchantName = options.merchantName || 'DR PHONE Wholesale';
  let merchant = await db.getAsync("SELECT id FROM merchants WHERE name = ?", [merchantName]);
  let merchantId;
  if (!merchant) {
    const res = await db.runAsync(
      "INSERT INTO merchants (name, phone, company, email) VALUES (?, ?, ?, ?)",
      [merchantName, '', targetUrl, '']
    );
    merchantId = res.lastID;
    console.log(`[Sync Service] Created merchant '${merchantName}' with ID: ${merchantId}`);
  } else {
    merchantId = merchant.id;
  }

  // Step 3: Cache existing categories in Arz-Mart
  const existingCats = await db.allAsync("SELECT id, name_en, name_ar FROM categories");
  const categoryMap = new Map(); // name_en -> id

  existingCats.forEach(c => {
    categoryMap.set(c.name_en.toLowerCase().trim(), c.id);
  });

  // Step 4: Sync categories into Arz-Mart
  for (const cat of rawCategories) {
    const catNameEn = cat.name.trim();
    const catNameAr = CATEGORY_TRANSLATIONS[catNameEn] || cat.name_ar || catNameEn;
    const catKey = catNameEn.toLowerCase();

    if (!categoryMap.has(catKey)) {
      // Find a sample image from the category
      const firstItem = (cat.items || cat.products || [])[0];
      let catImg = '';
      if (firstItem && firstItem.image) {
        const fn = firstItem.image.split('/').pop();
        catImg = `/uploads/products/${fn}`;
      }

      const res = await db.runAsync(
        "INSERT INTO categories (name_ar, name_en, image_url) VALUES (?, ?, ?)",
        [catNameAr, catNameEn, catImg]
      );
      categoryMap.set(catKey, res.lastID);
      console.log(`[DR PHONE Sync Service] Added Category '${catNameEn}' -> ID: ${res.lastID}`);
    }
  }

  // Step 5: Sync products into Arz-Mart
  let totalProcessed = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  for (const cat of rawCategories) {
    const catId = categoryMap.get(cat.name.trim().toLowerCase()) || null;
    const items = cat.items || cat.products || [];

    for (const p of items) {
      totalProcessed++;
      const isScreenProtector = cat.name.trim().toLowerCase() === 'screen protector' || 
                                cat.name.toLowerCase().includes('screen') || 
                                cat.name.toLowerCase().includes('protector');

      let wholesalePrice = (!isNaN(p.price) && p.price !== null) ? Number(p.price) : 0;
      if (isNaN(wholesalePrice) || wholesalePrice < 0) wholesalePrice = 0;
      if (wholesalePrice <= 0 && p.options && p.options.length > 0) {
        const optPrice = Number(p.options[0].price);
        wholesalePrice = (!isNaN(optPrice) && optPrice > 0) ? optPrice : 0;
      }
      let retailPrice = isScreenProtector ? 2.50 : applyMarkup(wholesalePrice, markupPercent);
      if (isNaN(retailPrice) || retailPrice <= 0) retailPrice = 2.50;
      const oldPrice = retailPrice > 0 ? Math.round(retailPrice * 1.15 * 100) / 100 : null;

      // Local image filename
      let imageFilename = '';
      if (p.image) {
        const cleanImg = p.image.split('?')[0];
        imageFilename = cleanImg.split('/').pop();
      }
      const localImageUrl = imageFilename ? `/uploads/products/${imageFilename}` : '';

      // Check if image needs downloading
      if (imageFilename && !fs.existsSync(path.join(UPLOADS_DIR, imageFilename))) {
        downloadImageLocally(`${targetUrl}/uploads/products/${imageFilename}`, imageFilename, targetUrl).catch(() => {});
      }

      const nameEn = p.name.trim();
      const nameAr = p.name_ar ? p.name_ar.trim() : nameEn;
      const descEn = p.description || `${nameEn} - Authentic high quality product with warranty.`;
      const descAr = p.description_ar || `${nameEn} - منتج أصلي عالي الجودة مع ضمان.`;
      let stock = 50;
      if (p.stock !== undefined && p.stock !== null && !isNaN(p.stock)) {
        stock = Math.max(0, parseInt(p.stock) || 0);
      }

      // Map options / variants / sizes
      const sizesJson = JSON.stringify((p.options || []).map(o => {
        const oPrice = Number(o.price) || 0;
        let finalPrice;
        if (isScreenProtector) {
          finalPrice = 2.50;
        } else if (oPrice > 0) {
          finalPrice = applyMarkup(oPrice, markupPercent);
        } else {
          finalPrice = retailPrice;
        }
        return { name: o.name, price: finalPrice };
      }));
      const colorsJson = '[]';

      // Check if product already exists by name_en or sku
      const existing = await db.getAsync(
        "SELECT id, price_usd, cost_price_usd, stock FROM products WHERE name_en = ? OR (description_en LIKE ? AND category_id = ?)",
        [nameEn, `%${p.sku || nameEn}%`, catId]
      );

      if (existing) {
        await db.runAsync(
          `UPDATE products SET 
            price_usd = ?, 
            cost_price_usd = ?, 
            old_price_usd = ?, 
            stock = ?,
            image_url = COALESCE(NULLIF(image_url, ''), ?),
            category_id = ?,
            sizes = ?
          WHERE id = ?`,
          [retailPrice, wholesalePrice, oldPrice, stock, localImageUrl, catId, sizesJson, existing.id]
        );
        updatedCount++;
      } else {
        // Product is new - insert into database
        await db.runAsync(
          `INSERT INTO products (
            name_ar, name_en, description_ar, description_en,
            price_usd, cost_price_usd, old_price_usd,
            category_id, merchant_id, image_url, stock,
            rating_sum, rating_count, colors, sizes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nameAr, nameEn, descAr, descEn,
            retailPrice, wholesalePrice, oldPrice,
            catId, merchantId, localImageUrl, stock,
            24, 5, colorsJson, sizesJson
          ]
        );
        insertedCount++;
      }
    }
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const statusMsg = `نجح الجلب: تم مزامنة ${totalProcessed} منتج و ${rawCategories.length} تصنيف`;
  try {
    if (options.sourceId) {
      await db.runAsync(
        "UPDATE supplier_sources SET last_sync_time = ?, last_sync_status = ? WHERE id = ?",
        [now, statusMsg, options.sourceId]
      );
    }
    if (settings) {
      await db.runAsync(
        "UPDATE settings SET last_sync_time = ?, last_sync_status = ? WHERE id = ?",
        [now, statusMsg, settings.id]
      );
    }
  } catch (e) {
    console.error('[DR PHONE Sync Service] Note updating last_sync_status:', e.message);
  }

  const result = {
    success: true,
    syncedAt: now,
    targetUrl,
    markupPercent,
    totalProcessed,
    insertedCount,
    updatedCount,
    unchangedCount,
    totalCategories: rawCategories.length,
    message: statusMsg
  };

  console.log(`[DR PHONE Sync Service] Complete! Processed: ${totalProcessed}, Inserted: ${insertedCount}, Updated: ${updatedCount}, Unchanged: ${unchangedCount}`);
  return result;
}

/**
 * Start recurring daily cron job for automatic updates
 */
function startDailyAutoSync(passcode = 'Drphone123', markupPercent = 45) {
  // Sync immediately on startup
  console.log('[DR PHONE Auto-Sync] Scheduling daily automatic synchronization...');
  
  // Run once on boot in the background after 5 seconds
  setTimeout(() => {
    syncDrPhoneToArzMart({ passcode, markupPercent })
      .then(res => console.log('[DR PHONE Auto-Sync] Initial boot sync succeeded:', res))
      .catch(err => console.error('[DR PHONE Auto-Sync] Initial boot sync error:', err.message));
  }, 5000);

  // Set 24-hour interval (86,400,000 ms)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    console.log('[DR PHONE Auto-Sync] Running scheduled daily sync...');
    syncDrPhoneToArzMart({ passcode, markupPercent })
      .then(res => console.log('[DR PHONE Auto-Sync] Daily sync finished:', res))
      .catch(err => console.error('[DR PHONE Auto-Sync] Daily sync error:', err.message));
  }, TWENTY_FOUR_HOURS);
}

module.exports = {
  syncDrPhoneToArzMart,
  startDailyAutoSync,
  applyMarkup
};

// If run via CLI
if (require.main === module) {
  syncDrPhoneToArzMart({ passcode: 'Drphone123', markupPercent: 45 })
    .then(res => {
      console.log('Done:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}
