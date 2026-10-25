const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const agent = new https.Agent({ rejectUnauthorized: false });

let UPLOADS_DIR = path.join(__dirname, '../../uploads/products');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  const os = require('os');
  UPLOADS_DIR = path.join(os.tmpdir(), 'uploads/products');
  try {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {}
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  setFromHeaders(headers) {
    const raw = headers['set-cookie'];
    if (!raw) return;
    const list = Array.isArray(raw) ? raw : [raw];
    for (const c of list) {
      const parts = c.split(';')[0].split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        this.cookies.set(name, value);
      }
    }
  }
  getCookieString() {
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

function request(url, options = {}, postData = null, jar = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options.headers
    };
    if (jar) {
      const cookieStr = jar.getCookieString();
      if (cookieStr) headers['Cookie'] = cookieStr;
    }

    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      agent: agent,
      headers: headers
    }, (res) => {
      if (jar) jar.setFromHeaders(res.headers);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.abdulghanitrading.com/'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).href;
        }
        return fetchImageBuffer(redirectUrl).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error('Image fetch HTTP ' + res.statusCode));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function performLogin(jar, email = 'info@arz-mart.com', password = 'Hussein123@%') {
  console.log(`[AbdulGhani] Logging in as ${email}...`);
  try {
    const loginPage = await request('https://www.abdulghanitrading.com/web/login', {}, null, jar);
    const csrfMatch = loginPage.body.match(/name="csrf_token"\s+value="([^"]+)"/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    const postBody = querystring.stringify({
      csrf_token: csrfToken,
      login: email,
      password: password,
      redirect: '/shop'
    });

    const res = await request('https://www.abdulghanitrading.com/web/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postBody),
        'Referer': 'https://www.abdulghanitrading.com/web/login'
      }
    }, postBody, jar);

    if (res.statusCode === 303 || jar.getCookieString().includes('session_id')) {
      console.log('[AbdulGhani] Login successful.');
      // Switch to wholesale pricelist
      try {
        await request('https://www.abdulghanitrading.com/shop/change_pricelist/%D8%B3%D8%B9%D8%B1-%D8%A7%D9%84%D8%AC%D9%85%D9%84%D8%A9-usd-3616', {}, null, jar);
        console.log('[AbdulGhani] Switched to wholesale pricelist.');
      } catch (e) {}
      return true;
    }
  } catch (err) {
    console.warn('[AbdulGhani] Login warning (will continue with public wholesale prices):', err.message);
  }
  return false;
}

function extractCardsFromHtml(html) {
  const list = [];
  // Modern theme: <article class="agt-card">
  const cardRegex = /<article class="agt-card"[\s\S]*?<\/article>/gi;
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    const chunk = m[0];
    const nameMatch = chunk.match(/class="agt-card__name"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const priceMatch = chunk.match(/class="agt-price[^"]*"[^>]*>\s*\$?([\d,.]+)/i);
    const tmplMatch = chunk.match(/data-product-template-id="(\d+)"/i);
    const prodMatch = chunk.match(/data-product-id="(\d+)"/i);
    const imgMatch = chunk.match(/class="agt-card__img1"[^>]+src="([^">]+)"/i);

    if (nameMatch) {
      const url = nameMatch[1];
      const title = nameMatch[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '').trim()) : null;
      let img = imgMatch ? imgMatch[1].replace(/&amp;/g, '&') : null;
      if (img && img.startsWith('/')) img = 'https://www.abdulghanitrading.com' + img;

      list.push({
        url,
        title,
        price,
        templateId: tmplMatch ? tmplMatch[1] : null,
        productId: prodMatch ? prodMatch[1] : null,
        img
      });
    }
  }

  // Fallback to legacy Odoo theme if any
  if (list.length === 0) {
    const legacyRegex = /<div class="o_wsale_product_information flex-grow-1 flex-shrink-1">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    while ((m = legacyRegex.exec(html)) !== null) {
      const chunk = m[1];
      const titleMatch = chunk.match(/<h2 class="o_wsale_products_item_title[^"]*">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i);
      const priceMatch = chunk.match(/<span class="oe_currency_value">([\s\S]*?)<\/span>/i);
      const tmplMatch = chunk.match(/name="product_template_id"[^>]*value="(\d+)"/i) || chunk.match(/data-product-template-id="(\d+)"/i);
      const prodMatch = chunk.match(/name="product_id"[^>]*value="(\d+)"/i) || chunk.match(/data-product-product-id="(\d+)"/i);

      if (titleMatch) {
        list.push({
          url: titleMatch[1],
          title: titleMatch[2].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
          price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '').trim()) : null,
          templateId: tmplMatch ? tmplMatch[1] : null,
          productId: prodMatch ? prodMatch[1] : null,
          img: null
        });
      }
    }
  }

  return list;
}

// Category Mapping (IDs 114 to 122)
function mapCategory(categoryName = '', title = '') {
  const text = (categoryName + ' ' + title).toLowerCase();
  
  // 1. Dental Care -> 122
  if (/colgate|oral|dental|teeth|toothpaste|معجون|أسنان|فرشاة أسنان/i.test(text)) {
    return 122;
  }
  // 2. Deodorants & Roll-on -> 121
  if (/deodorant|roll-on|roll on|body spray|axe|rexona|مزيل عرق|رول اون|بخاخ جسم/i.test(text)) {
    return 121;
  }
  // 3. Hair Care & Shampoo -> 119
  if (/shampoo|conditioner|hair oil|hair mask|hair serum|شامبو|بلسم|عناية بالشعر|زيت شعر/i.test(text)) {
    return 119;
  }
  // 4. Body Lotions, Washes & Soaps -> 120
  if (/shower gel|body wash|body lotion|body cream|soap|لوشن|صابون|شاور جل|غسول جسم|مرطب جسم|vaseline|dove|enchanteur/i.test(text)) {
    return 120;
  }
  // 5. Face Masks -> 118
  if (/mask|قناع|ماسك/i.test(text)) {
    return 118;
  }
  // 6. Makeup & Cosmetics -> 117
  if (/makeup|lipstick|lip gloss|lip balm|mascara|eyeliner|foundation|blush|powder|مكياج|روج|مسكرة|كحل|فاونديشن/i.test(text)) {
    return 117;
  }
  // 7. Arabic & Oriental Perfumes -> 115
  if (/arabic|oriental|oud|musk|bukhoor|عطر شرقي|عود|مسك|بخور|lattafa|ard al zaafaran/i.test(text)) {
    return 115;
  }
  // 8. French & International Fragrances -> 114
  if (/perfume|fragrance|parfum|edp|edt|cologne|عطر|عطور|geparlys|l'orientale|maison alhambra|paris/i.test(text)) {
    return 114;
  }
  // 9. Korean & French Skincare -> 116
  if (/skincare|serum|medicube|cosrx|anua|centella|beauty of joseon|cerave|la roche|ordinary|panoxyl|facial wash|cleanser|sunscreen|sun cream|سيروم|بشرة|عناية بالبشرة|كريم وجه|غسول وجه|واقي شمس/i.test(text)) {
    return 116;
  }
  
  return 114; // Default to French Fragrances
}

async function syncAbdulGhani({ maxPages = 74, vatPercent = 12, markupPercent = 30 } = {}) {
  console.log(`\n=== Starting Abdul Ghani Trading Sync (Max Pages: ${maxPages}, VAT: ${vatPercent}%, Markup: ${markupPercent}%) ===\n`);

  const jar = new CookieJar();
  await performLogin(jar);

  // Ensure Merchant exists in DB
  let merchant = await db.getAsync("SELECT id FROM merchants WHERE name = 'Abdul Ghani Trading' LIMIT 1");
  if (!merchant) {
    const res = await db.runAsync(
      "INSERT INTO merchants (name, company, email, phone, whatsapp_number) VALUES (?, ?, ?, ?, ?)",
      ['Abdul Ghani Trading', 'Abdul Ghani Trading', 'info@arz-mart.com', '+961 70 000 000', '+961 70 000 000']
    );
    merchant = { id: res.lastID || 8 };
    console.log('[AbdulGhani] Created Merchant in DB with ID:', merchant.id);
  }

  const vatMultiplier = 1 + (vatPercent / 100);
  const markupMultiplier = 1 + (markupPercent / 100);

  // Pre-load existing products into memory for O(1) instant lookup
  const existingProds = await db.allAsync(
    "SELECT id, sku, name_en, image_url FROM products WHERE merchant_id = ?",
    [merchant.id]
  );
  const prodMap = new Map();
  for (const p of existingProds) {
    if (p.sku) prodMap.set(p.sku, p);
    if (p.name_en) prodMap.set(p.name_en, p);
  }
  console.log(`[AbdulGhani] Pre-loaded ${prodMap.size} existing products in memory.`);

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? 'https://www.abdulghanitrading.com/shop' : `https://www.abdulghanitrading.com/shop/page/${page}`;
    console.log(`[AbdulGhani] Fetching Page ${page}/${maxPages}: ${pageUrl}`);

    let res;
    try {
      res = await request(pageUrl, {}, null, jar);
    } catch (e) {
      console.warn(`[AbdulGhani] Request error on page ${page}:`, e.message);
      continue;
    }

    const cards = extractCardsFromHtml(res.body);
    if (!cards || cards.length === 0) {
      console.log(`[AbdulGhani] No products found on page ${page}. Finishing.`);
      break;
    }

    let pageInserted = 0;
    let pageUpdated = 0;

    await Promise.all(cards.map(async (card) => {
      if (!card.price || card.price <= 0) return;

      const rawWholesale = card.price;
      const costPriceWithVat = Math.round(rawWholesale * vatMultiplier * 100) / 100;
      const sellingPrice = Math.round(costPriceWithVat * markupMultiplier * 100) / 100;
      const oldPrice = Math.round(sellingPrice * 1.25 * 100) / 100;
      const sku = `AGT-${card.templateId || (10000 + totalProcessed)}`;
      const catId = mapCategory('', card.title);

      const imageUrl = card.templateId 
        ? `/uploads/products/agt_${card.templateId}.webp`
        : (card.img || '');

      const existing = prodMap.get(sku) || prodMap.get(card.title);

      if (existing) {
        await db.runAsync(`
          UPDATE products 
          SET price_usd = ?, cost_price_usd = ?, old_price_usd = ?, stock = 50, category_id = ?, image_url = ?, sync_batch_time = NOW()
          WHERE id = ?
        `, [
          sellingPrice,
          costPriceWithVat,
          oldPrice,
          catId,
          existing.image_url && existing.image_url.startsWith('/uploads/') ? existing.image_url : imageUrl,
          existing.id
        ]);
        pageUpdated++;
      } else {
        const insertRes = await db.runAsync(`
          INSERT INTO products (
            sku, name_ar, name_en, description_ar, description_en,
            price_usd, cost_price_usd, old_price_usd, stock, category_id,
            merchant_id, image_url, images, is_new_arrival, created_at, sync_batch_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 50, ?, ?, ?, '[]', 1, NOW(), NOW())
        `, [
          sku,
          card.title,
          card.title,
          `منتج أصلي عالي الجودة من عبد الغني للتجارة. التوصيل متوفر لكافة المناطق اللبنانية والدفع عند الاستلام. SKU: ${sku}`,
          `Original high quality product from Abdul Ghani Trading. Fast COD delivery across Lebanon. SKU: ${sku}`,
          sellingPrice,
          costPriceWithVat,
          oldPrice,
          catId,
          merchant.id,
          imageUrl
        ]);
        prodMap.set(sku, { id: insertRes.lastID, sku, name_en: card.title, image_url: imageUrl });
        pageInserted++;
      }
    }));

    totalInserted += pageInserted;
    totalUpdated += pageUpdated;
    totalProcessed += (pageInserted + pageUpdated);

    console.log(`[AbdulGhani] Page ${page} complete (Total: ${totalProcessed} | +${totalInserted} new | ${totalUpdated} updated)`);
  }

  // Update supplier_sources table with sync statistics
  try {
    const statusMsg = `جديد: +${totalInserted} | تحديث: ${totalUpdated}`;
    await db.runAsync(`
      UPDATE supplier_sources 
      SET last_sync_time = NOW(),
          last_sync_status = ?,
          last_sync_inserted = ?,
          last_sync_updated = ?
      WHERE id = 3 OR sync_type = 'abdulghani' OR name = 'Abdul Ghani Trading'
    `, [statusMsg, totalInserted, totalUpdated]);
  } catch (e) {
    console.warn('[AbdulGhani] Could not update supplier_sources:', e.message);
  }

  console.log(`\n=== Abdul Ghani Trading Sync Completed Successfully ===`);
  console.log(`Total Products Synced: ${totalProcessed}`);
  console.log(`New Products Inserted: ${totalInserted}`);
  console.log(`Existing Products Updated: ${totalUpdated}\n`);

  return { totalProcessed, totalInserted, totalUpdated };
}

module.exports = {
  syncAbdulGhani,
  extractCardsFromHtml,
  mapCategory
};

if (require.main === module) {
  const pages = parseInt(process.argv[2]) || 74;
  syncAbdulGhani({ maxPages: pages, vatPercent: 12, markupPercent: 30 })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Sync error:', err);
      process.exit(1);
    });
}
