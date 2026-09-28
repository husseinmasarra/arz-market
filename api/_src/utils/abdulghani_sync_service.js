const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const agent = new https.Agent({ rejectUnauthorized: false });

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
        this.cookies.set(parts[0].trim(), parts.slice(1).join('=').trim());
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
      if (res.statusCode !== 200) return reject(new Error('Image fetch HTTP ' + res.statusCode));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function performLogin(jar, email = 'info@arz-mart.com', password = 'Hussein123@%') {
  console.log(`[AbdulGhani] Logging in as ${email}...`);
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
    return true;
  }
  throw new Error('Login failed: invalid credentials or unexpected response');
}

function extractCardsFromHtml(html) {
  const list = [];
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
        title: titleMatch[2].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
        price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '').trim()) : null,
        templateId: tmplMatch ? tmplMatch[1] : null,
        productId: prodMatch ? prodMatch[1] : null
      });
    }
  }
  return list;
}

// Precise Subcategory Mapping (IDs 114 to 122)
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
  if (/skincare|serum|medicube|cosrx|anua|centella|beauty of joseon|cerave|la roche|ordinary|سيروم|بشرة|عناية بالبشرة|كريم وجه/i.test(text)) {
    return 116;
  }
  
  return 114; // Default to French Fragrances
}

async function syncAbdulGhani({ maxPages = 62, vatPercent = 12 } = {}) {
  console.log(`\n=== Starting Abdul Ghani Trading Sync (Max Pages: ${maxPages}, VAT: ${vatPercent}%) ===\n`);

  const jar = new CookieJar();
  await performLogin(jar);

  // Ensure Merchant exists in DB
  let merchant = await db.getAsync("SELECT id FROM merchants WHERE name = 'Abdul Ghani Trading' LIMIT 1");
  if (!merchant) {
    const res = await db.runAsync(
      "INSERT INTO merchants (name, company, email, phone, whatsapp_number) VALUES (?, ?, ?, ?, ?)",
      ['Abdul Ghani Trading', 'Abdul Ghani Trading', 'info@arz-mart.com', '+961 70 000 000', '+961 70 000 000']
    );
    merchant = { id: res.lastID };
    console.log('[AbdulGhani] Created Merchant in DB with ID:', merchant.id);
  }

  const vatMultiplier = 1 + (vatPercent / 100);
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? 'https://www.abdulghanitrading.com/shop' : `https://www.abdulghanitrading.com/shop/page/${page}`;
    console.log(`\n--- Fetching Page ${page}/${maxPages}: ${pageUrl} ---`);

    // 1. Fetch Retail Page (without wholesale session)
    const retailRes = await request(pageUrl);
    const retailCards = extractCardsFromHtml(retailRes.body);

    if (retailCards.length === 0) {
      console.log(`[AbdulGhani] No more products found on page ${page}. Finishing.`);
      break;
    }

    // 2. Switch to Wholesale Pricelist & Fetch Wholesale Page
    await request('https://www.abdulghanitrading.com/shop/change_pricelist/%D8%B3%D8%B9%D8%B1-%D8%A7%D9%84%D8%AC%D9%85%D9%84%D8%A9-usd-3616', {}, null, jar);
    const wholesaleRes = await request(pageUrl, {}, null, jar);
    const wholesaleCards = extractCardsFromHtml(wholesaleRes.body);

    for (let i = 0; i < retailCards.length; i++) {
      const rCard = retailCards[i];
      const wCard = wholesaleCards.find(w => w.templateId === rCard.templateId) || wholesaleCards[i];

      const retailPrice = rCard.price || (wCard ? wCard.price : null);
      if (!retailPrice || retailPrice <= 0) continue;

      const rawWholesale = (wCard && wCard.price && wCard.price > 0) ? wCard.price : retailPrice;
      const costPriceWithVat = Math.round(rawWholesale * vatMultiplier * 100) / 100;
      const sellingPrice = Math.round(retailPrice * vatMultiplier * 100) / 100;
      const sku = `AGT-${rCard.templateId || (10000 + totalProcessed)}`;
      const catId = mapCategory('', rCard.title);

      // Fetch individual product details for Ultra-HD 1920px image
      let imageBase64 = null;
      try {
        const prodPageUrl = `https://www.abdulghanitrading.com${rCard.url}`;
        const prodDetail = await request(prodPageUrl, {}, null, jar);
        
        // Try Ultra-HD 1920px first, fallback to 1024px
        let imgMatch = prodDetail.body.match(/src="(\/web\/image\/product\.(?:product|template)\/\d+\/image_1920\/[^"]+)"/i)
                    || prodDetail.body.match(/src="(\/web\/image\/product\.(?:product|template)\/\d+\/image_1024\/[^"]+)"/i)
                    || prodDetail.body.match(/src="(\/web\/image\/product\.(?:product|template)\/\d+\/image_\d+\/[^"]+)"/i)
                    || prodDetail.body.match(/src="(\/web\/image\/[^\"]+)"/i);

        if (imgMatch) {
          let targetImgUrl = imgMatch[1].replace(/image_\d+/, 'image_1920');
          const fullImgUrl = `https://www.abdulghanitrading.com${targetImgUrl.replace(/&amp;/g, '&')}`;
          
          try {
            const buf = await fetchImageBuffer(fullImgUrl);
            if (buf && buf.length > 500) {
              imageBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
            }
          } catch(e) {
            const bufFallback = await fetchImageBuffer(`https://www.abdulghanitrading.com${imgMatch[1].replace(/&amp;/g, '&')}`);
            if (bufFallback && bufFallback.length > 500) {
              imageBase64 = `data:image/jpeg;base64,${bufFallback.toString('base64')}`;
            }
          }
        }
      } catch (err) {
        // Continue
      }

      // Check if product exists in DB
      const existing = await db.getAsync("SELECT id, image_url FROM products WHERE sku = ? OR (merchant_id = ? AND name_en = ?)", [sku, merchant.id, rCard.title]);

      if (existing) {
        let updateSql = `
          UPDATE products 
          SET price_usd = ?, cost_price_usd = ?, old_price_usd = ?, stock = 50, category_id = ?
        `;
        const updateParams = [sellingPrice, costPriceWithVat, sellingPrice, catId];

        if (imageBase64) {
          updateSql += `, image_url = ?`;
          updateParams.push(imageBase64);
        }

        updateSql += ` WHERE id = ?`;
        updateParams.push(existing.id);

        await db.runAsync(updateSql, updateParams);
        totalUpdated++;
      } else {
        await db.runAsync(`
          INSERT INTO products (
            sku, name_ar, name_en, description_ar, description_en,
            price_usd, cost_price_usd, old_price_usd, stock, category_id,
            merchant_id, image_url, images, is_new_arrival, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 50, ?, ?, ?, '[]', 1, NOW())
        `, [
          sku,
          rCard.title,
          rCard.title,
          `منتج أصلي عالي الجودة من عبد الغني للتجارة. التوصيل متوفر لكافة المناطق اللبنانية. SKU: ${sku}`,
          `Original high quality product from Abdul Ghani Trading. Fast COD delivery across Lebanon. SKU: ${sku}`,
          sellingPrice,
          costPriceWithVat,
          sellingPrice,
          catId,
          merchant.id,
          imageBase64 || ''
        ]);
        totalInserted++;
      }

      totalProcessed++;
      if (totalProcessed % 5 === 0) {
        console.log(`[AbdulGhani] Synced ${totalProcessed} products (${totalInserted} new, ${totalUpdated} updated, Ultra-HD images)...`);
      }
    }
  }

  console.log(`\n=== Abdul Ghani Trading Sync Completed Successfully ===`);
  console.log(`Total Products Synced: ${totalProcessed}`);
  console.log(`New Products Inserted: ${totalInserted}`);
  console.log(`Existing Products Updated: ${totalUpdated}\n`);

  return { totalProcessed, totalInserted, totalUpdated };
}

module.exports = {
  syncAbdulGhani
};
