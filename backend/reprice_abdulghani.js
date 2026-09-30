const { Pool } = require('pg');
const https = require('https');
const querystring = require('querystring');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

function extractCardsFromHtml(html) {
  const list = [];
  const cardRegex = /<div class="o_wsale_product_information flex-grow-1 flex-shrink-1">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    const chunk = m[1];
    const titleMatch = chunk.match(/<h2 class="o_wsale_products_item_title[^"]*">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i);
    const priceMatch = chunk.match(/<span class="oe_currency_value">([\s\S]*?)<\/span>/i);
    const tmplMatch = chunk.match(/name="product_template_id"[^>]*value="(\d+)"/i) || chunk.match(/data-product-template-id="(\d+)"/i);

    if (titleMatch) {
      list.push({
        url: titleMatch[1],
        title: titleMatch[2].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
        price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '').trim()) : null,
        templateId: tmplMatch ? tmplMatch[1] : null
      });
    }
  }
  return list;
}

async function repriceAll() {
  console.log('=== Repricing Abdul Ghani Products with: Cost = Wholesale + 12%, Selling = Retail + 12% ===');
  
  const jar = new CookieJar();
  
  // 1. Login
  const loginPage = await request('https://www.abdulghanitrading.com/web/login', {}, null, jar);
  const csrfMatch = loginPage.body.match(/name="csrf_token"\s+value="([^"]+)"/i);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';

  const postBody = querystring.stringify({
    csrf_token: csrfToken,
    login: 'info@arz-mart.com',
    password: 'Hussein123@%',
    redirect: '/shop'
  });

  await request('https://www.abdulghanitrading.com/web/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postBody),
      'Referer': 'https://www.abdulghanitrading.com/web/login'
    }
  }, postBody, jar);

  for (let page = 1; page <= 5; page++) {
    const pageUrl = page === 1 ? 'https://www.abdulghanitrading.com/shop' : `https://www.abdulghanitrading.com/shop/page/${page}`;
    
    // Fetch Retail Page
    const retailRes = await request(pageUrl);
    const retailCards = extractCardsFromHtml(retailRes.body);
    if (retailCards.length === 0) break;

    // Fetch Wholesale Page
    await request('https://www.abdulghanitrading.com/shop/change_pricelist/%D8%B3%D8%B9%D8%B1-%D8%A7%D9%84%D8%AC%D9%85%D9%84%D8%A9-usd-3616', {}, null, jar);
    const wholesaleRes = await request(pageUrl, {}, null, jar);
    const wholesaleCards = extractCardsFromHtml(wholesaleRes.body);

    for (let i = 0; i < retailCards.length; i++) {
      const rCard = retailCards[i];
      const wCard = wholesaleCards.find(w => w.templateId === rCard.templateId) || wholesaleCards[i];

      const retailRaw = rCard.price || (wCard ? wCard.price : null);
      if (!retailRaw || retailRaw <= 0) continue;

      const wholesaleRaw = (wCard && wCard.price && wCard.price > 0) ? wCard.price : retailRaw;

      // FORMULA:
      // 1. Cost Price (سعر الاستلام) = Wholesale Raw * 1.12
      const costPriceWithVat = Math.round(wholesaleRaw * 1.12 * 100) / 100;

      // 2. Selling Price (سعر البيع لزبائن متجرك) = Retail Raw * 1.12
      const sellingPriceWithVat = Math.round(retailRaw * 1.12 * 100) / 100;

      const sku = `AGT-${rCard.templateId}`;

      const res = await pool.query(`
        UPDATE products 
        SET price_usd = $1, cost_price_usd = $2, old_price_usd = $1
        WHERE merchant_id = 10 AND (sku = $3 OR name_en = $4)
        RETURNING id, name_en, price_usd, cost_price_usd
      `, [sellingPriceWithVat, costPriceWithVat, sku, rCard.title]);

      if (res.rows.length > 0) {
        const item = res.rows[0];
        console.log(`✓ Updated [${item.id}]: "${item.name_en}"`);
        console.log(`  Raw Wholesale: $${wholesaleRaw} -> Cost +12%: $${item.cost_price_usd}`);
        console.log(`  Raw Retail: $${retailRaw} -> Selling +12%: $${item.price_usd}`);
        console.log(`  Profit: $${(item.price_usd - item.cost_price_usd).toFixed(2)}\n`);
      }
    }
  }

  await pool.end();
}

repriceAll().catch(console.error);
