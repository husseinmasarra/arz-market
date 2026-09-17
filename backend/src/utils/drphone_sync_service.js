/**
 * DR PHONE Synchronization Service for Arz-Mart
 * Handles merging DR PHONE catalog into Arz-Mart database,
 * applying +40% margin, localizing images, and automated daily updates.
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

function applyMarkup(price, markupPercent = 40) {
  if (price === undefined || price === null || isNaN(price)) return 0;
  const num = Number(price);
  const factor = 1 + (markupPercent / 100);
  return Math.round(num * factor * 100) / 100;
}

// Download image locally if missing
function downloadImageLocally(remoteUrl, filename) {
  return new Promise((resolve) => {
    const dest = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      return resolve(true);
    }
    const file = fs.createWriteStream(dest);
    https.get(remoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://drphonewholesale.online/'
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
function fetchDrPhoneCatalog(passcode = 'Drphone123') {
  return new Promise((resolve, reject) => {
    https.get(BASE_URL + '/', res => {
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

        const req = https.request(BASE_URL + '/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            'Cookie': cookie1,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': BASE_URL + '/'
          }
        }, postRes => {
          const newCookies = postRes.headers['set-cookie'] || [];
          const authCookie = newCookies.map(c => c.split(';')[0]).join('; ') || cookie1;

          https.get(BASE_URL + '/api/catalog.php', {
            headers: {
              'Cookie': authCookie,
              'User-Agent': 'Mozilla/5.0',
              'Referer': BASE_URL + '/'
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
async function syncDrPhoneToArzMart(options = {}) {
  const passcode = options.passcode || 'Drphone123';
  const markupPercent = options.markupPercent !== undefined ? Number(options.markupPercent) : 40;

  console.log(`[DR PHONE Sync Service] Starting synchronization (Markup: +${markupPercent}%)...`);

  // Step 1: Fetch raw catalog
  const catalogData = await fetchDrPhoneCatalog(passcode);
  const rawCategories = catalogData.catalog || [];

  console.log(`[DR PHONE Sync Service] Retrieved ${rawCategories.length} categories from DR PHONE.`);

  // Step 2: Ensure "DR PHONE Wholesale" merchant exists in Arz-Mart
  let merchant = await db.getAsync("SELECT id FROM merchants WHERE name = 'DR PHONE Wholesale'");
  let merchantId;
  if (!merchant) {
    const res = await db.runAsync(
      "INSERT INTO merchants (name, phone, company, email) VALUES (?, ?, ?, ?)",
      ['DR PHONE Wholesale', '+96170908028', 'DR PHONE Lebanon', 'wholesale@drphonewholesale.online']
    );
    merchantId = res.lastID;
    console.log(`[DR PHONE Sync Service] Created merchant 'DR PHONE Wholesale' with ID: ${merchantId}`);
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
      const wholesalePrice = Number(p.price) || 0;
      const retailPrice = applyMarkup(wholesalePrice, markupPercent);
      const oldPrice = retailPrice > 0 ? Math.round(retailPrice * 1.15 * 100) / 100 : null;

      // Local image filename
      let imageFilename = '';
      if (p.image) {
        imageFilename = p.image.split('/').pop();
      }
      const localImageUrl = imageFilename ? `/uploads/products/${imageFilename}` : '';

      // Check if image needs downloading
      if (imageFilename && !fs.existsSync(path.join(UPLOADS_DIR, imageFilename))) {
        downloadImageLocally(`https://drphonewholesale.online/uploads/products/${imageFilename}`, imageFilename).catch(() => {});
      }

      const nameEn = p.name.trim();
      const nameAr = p.name_ar ? p.name_ar.trim() : nameEn;
      const descEn = p.description || `${nameEn} - Authentic high quality product with warranty.`;
      const descAr = p.description_ar || `${nameEn} - منتج أصلي عالي الجودة مع ضمان.`;
      const stock = typeof p.stock === 'number' ? p.stock : 50;
      const colorsJson = JSON.stringify(Array.isArray(p.colors) ? p.colors : ['Standard']);
      const sizesJson = JSON.stringify((p.options || []).map(o => ({
        name: o.name,
        price: applyMarkup(Number(o.price) || wholesalePrice, markupPercent)
      })));

      // Check if product already exists by name_en or sku
      const existing = await db.getAsync(
        "SELECT id, price_usd, cost_price_usd, stock FROM products WHERE name_en = ? OR (description_en LIKE ? AND category_id = ?)",
        [nameEn, `%${p.sku || nameEn}%`, catId]
      );

      if (existing) {
        // Product exists - update if price or stock changed
        const priceChanged = Math.abs(existing.price_usd - retailPrice) > 0.01 || Math.abs(existing.cost_price_usd - wholesalePrice) > 0.01;
        const stockChanged = existing.stock !== stock;

        if (priceChanged || stockChanged) {
          await db.runAsync(
            `UPDATE products SET 
              price_usd = ?, 
              cost_price_usd = ?, 
              old_price_usd = ?, 
              stock = ?,
              image_url = COALESCE(NULLIF(image_url, ''), ?),
              category_id = ?
            WHERE id = ?`,
            [retailPrice, wholesalePrice, oldPrice, stock, localImageUrl, catId, existing.id]
          );
          updatedCount++;
        } else {
          unchangedCount++;
        }
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

  const result = {
    success: true,
    syncedAt: new Date().toISOString(),
    markupPercent,
    totalProcessed,
    insertedCount,
    updatedCount,
    unchangedCount,
    totalCategories: rawCategories.length
  };

  console.log(`[DR PHONE Sync Service] Complete! Processed: ${totalProcessed}, Inserted: ${insertedCount}, Updated: ${updatedCount}, Unchanged: ${unchangedCount}`);
  return result;
}

/**
 * Start recurring daily cron job for automatic updates
 */
function startDailyAutoSync(passcode = 'Drphone123', markupPercent = 40) {
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
  syncDrPhoneToArzMart({ passcode: 'Drphone123', markupPercent: 40 })
    .then(res => {
      console.log('Done:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}
