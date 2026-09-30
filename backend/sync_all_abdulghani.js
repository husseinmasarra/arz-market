const https = require('https');
const querystring = require('querystring');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false },
  max: 10
});

const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true, maxSockets: 15 });

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
      headers: headers,
      timeout: 20000
    }, (res) => {
      if (jar) jar.setFromHeaders(res.headers);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
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
      },
      timeout: 20000
    }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null));
  });
}

async function performLogin(jar, email = 'info@arz-mart.com', password = 'Hussein123@%') {
  console.log(`[Login] Authenticating as ${email}...`);
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
    console.log('[Login] Success! Logged in as Merchant.');
    return true;
  }
  throw new Error('Login failed');
}

function extractCardsFromHtml(html) {
  const list = [];
  const cardRegex = /<form[^>]*class="[^"]*oe_product_cart[^"]*"[\s\S]*?<\/form>/gi;
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    const chunk = m[0];
    const titleMatch = chunk.match(/<h2 class="o_wsale_products_item_title[^"]*">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i);
    const priceMatch = chunk.match(/<span class="oe_currency_value">([\s\S]*?)<\/span>/i);
    const tmplMatch = chunk.match(/name="product_template_id"[^>]*value="(\d+)"/i) || chunk.match(/data-product-template-id="(\d+)"/i);
    const prodMatch = chunk.match(/name="product_id"[^>]*value="(\d+)"/i) || chunk.match(/data-product-product-id="(\d+)"/i);
    const imgMatch = chunk.match(/<img[^>]+src="([^">]+)"[^>]*class="[^"]*oe_product_image_img /i) || chunk.match(/<img[^>]+src="([^">]+)"/i);

    if (titleMatch) {
      let mainImgUrl = null;
      if (imgMatch && imgMatch[1]) {
        let src = imgMatch[1].replace(/image_\d+/, 'image_1920').replace(/&amp;/g, '&');
        if (src.startsWith('/')) {
          src = `https://www.abdulghanitrading.com${src}`;
        }
        mainImgUrl = src;
      }

      list.push({
        url: titleMatch[1],
        title: titleMatch[2].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
        price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '').trim()) : null,
        templateId: tmplMatch ? tmplMatch[1] : null,
        productId: prodMatch ? prodMatch[1] : null,
        mainImgUrl: mainImgUrl
      });
    }
  }
  return list;
}

// Subcategory Mapping
function mapCategory(title = '') {
  const text = title.toLowerCase();
  
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
  if (/shower gel|body wash|body lotion|body cream|soap|لوشن|صابون|شاور جل|غسول جسم|مرطب جسم|vaseline|dove|enchanteur|nivea|veet/i.test(text)) {
    return 120;
  }
  // 5. Face Masks -> 118
  if (/mask|قناع|ماسك/i.test(text)) {
    return 118;
  }
  // 6. Makeup & Cosmetics -> 117
  if (/makeup|lipstick|lip gloss|lip balm|mascara|eyeliner|foundation|blush|powder|مكياج|روج|مسكرة|كحل|فاونديشن|labello/i.test(text)) {
    return 117;
  }
  // 7. Arabic & Oriental Perfumes -> 115
  if (/arabic|oriental|oud|musk|bukhoor|عطر شرقي|عود|مسك|بخور|lattafa|ard al zaafaran|pendora/i.test(text)) {
    return 115;
  }
  // 8. Korean & French Skincare -> 116
  if (/skincare|serum|medicube|cosrx|anua|centella|beauty of joseon|cerave|la roche|ordinary|سيروم|بشرة|عناية بالبشرة|كريم وجه/i.test(text)) {
    return 116;
  }
  // 9. French & International Fragrances -> 114
  if (/perfume|fragrance|parfum|edp|edt|cologne|عطر|عطور|geparlys|l'orientale|maison alhambra|paris|bold|elixir/i.test(text)) {
    return 114;
  }
  
  return 114; // Default to French Fragrances
}

async function runFullSync(startPage = 1, endPage = 62) {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING ABDUL GHANI FULL CATALOG ULTRA-HD SYNC`);
  console.log(`Pages: ${startPage} to ${endPage} | VAT: 12%`);
  console.log(`======================================================\n`);

  const jar = new CookieJar();
  await performLogin(jar);

  // Ensure Merchant
  let merchantRes = await pool.query("SELECT id FROM merchants WHERE name = 'Abdul Ghani Trading' LIMIT 1");
  let merchantId;
  if (merchantRes.rows.length > 0) {
    merchantId = merchantRes.rows[0].id;
  } else {
    const insertM = await pool.query(
      "INSERT INTO merchants (name, company, email, phone, whatsapp_number) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      ['Abdul Ghani Trading', 'Abdul Ghani Trading', 'info@arz-mart.com', '+961 70 000 000', '+961 70 000 000']
    );
    merchantId = insertM.rows[0].id;
  }
  console.log(`[Merchant ID]: ${merchantId}`);

  const vatMultiplier = 1.12;
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (let page = startPage; page <= endPage; page++) {
    const pageUrl = page === 1 ? 'https://www.abdulghanitrading.com/shop' : `https://www.abdulghanitrading.com/shop/page/${page}`;
    console.log(`\n>>> Processing Page ${page}/${endPage}...`);

    try {
      // 1. Fetch in Retail Mode (public without session or with retail pricelist)
      const retailRes = await request(pageUrl);
      const retailCards = extractCardsFromHtml(retailRes.body);

      if (retailCards.length === 0) {
        console.log(`No products found on page ${page}. End of catalog reached.`);
        break;
      }

      // 2. Switch to Wholesale Pricelist & Fetch Wholesale Page
      await request('https://www.abdulghanitrading.com/shop/change_pricelist/%D8%B3%D8%B9%D8%B1-%D8%A7%D9%84%D8%AC%D9%85%D9%84%D8%A9-usd-3616', {}, null, jar);
      const wholesaleRes = await request(pageUrl, {}, null, jar);
      const wholesaleCards = extractCardsFromHtml(wholesaleRes.body);

      console.log(`Page ${page}: Found ${retailCards.length} products.`);

      for (let i = 0; i < retailCards.length; i++) {
        const rCard = retailCards[i];
        const wCard = wholesaleCards.find(w => w.templateId === rCard.templateId) || wholesaleCards[i];

        const retailPrice = rCard.price || (wCard ? wCard.price : null);
        if (!retailPrice || retailPrice <= 0) continue;

        const rawWholesale = (wCard && wCard.price && wCard.price > 0) ? wCard.price : retailPrice;
        
        // Exact 12% Pricing Formula:
        const costPriceWithVat = Math.round(rawWholesale * vatMultiplier * 100) / 100;
        const sellingPrice = Math.round(retailPrice * vatMultiplier * 100) / 100;
        const sku = `AGT-${rCard.templateId || (10000 + totalProcessed)}`;
        const catId = mapCategory(rCard.title);

        // Fetch Ultra-HD 1920px image
        let imageBase64 = null;
        if (rCard.mainImgUrl) {
          try {
            const buf = await fetchImageBuffer(rCard.mainImgUrl);
            if (buf && buf.length > 500) {
              const mime = rCard.mainImgUrl.includes('.png') ? 'image/png' : 'image/webp';
              imageBase64 = `data:${mime};base64,${buf.toString('base64')}`;
            }
          } catch (e) {
            // Ignore image download error
          }
        }

        // Check if exists in DB
        const existRes = await pool.query(
          "SELECT id, image_url FROM products WHERE sku = $1 OR (merchant_id = $2 AND name_en = $3) LIMIT 1",
          [sku, merchantId, rCard.title]
        );

        if (existRes.rows.length > 0) {
          const prodId = existRes.rows[0].id;
          let updateSql = "UPDATE products SET price_usd = $1, cost_price_usd = $2, old_price_usd = $3, stock = 50, category_id = $4";
          const updateParams = [sellingPrice, costPriceWithVat, sellingPrice, catId];

          if (imageBase64) {
            updateSql += ", image_url = $5 WHERE id = $6";
            updateParams.push(imageBase64, prodId);
          } else {
            updateSql += " WHERE id = $5";
            updateParams.push(prodId);
          }

          await pool.query(updateSql, updateParams);
          totalUpdated++;
        } else {
          await pool.query(`
            INSERT INTO products (
              sku, name_ar, name_en, description_ar, description_en,
              price_usd, cost_price_usd, old_price_usd, stock, category_id,
              merchant_id, image_url, images, is_new_arrival, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 50, $9, $10, $11, '[]', 1, NOW())
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
            merchantId,
            imageBase64 || ''
          ]);
          totalInserted++;
        }

        totalProcessed++;
      }

      console.log(`✓ Page ${page} finished. Total Synced so far: ${totalProcessed} (${totalInserted} new, ${totalUpdated} updated)`);
    } catch (pageErr) {
      console.error(`Error on page ${page}:`, pageErr.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 ALL DONE!`);
  console.log(`Total Products: ${totalProcessed} | New: ${totalInserted} | Updated: ${totalUpdated}`);
  console.log(`======================================================\n`);
  
  await pool.end();
}

const start = parseInt(process.argv[2]) || 1;
const end = parseInt(process.argv[3]) || 62;
runFullSync(start, end).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
