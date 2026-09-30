const https = require('https');
const querystring = require('querystring');
const fs = require('fs');

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

async function run() {
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

  // Let's test Korean Skincare category
  console.log('\n--- Fetching Korean Skincare Category ---');
  const catRes = await request('https://www.abdulghanitrading.com/shop/category/skincare-korean-skincare-13', {}, null, jar);
  
  // Extract product links from category page
  const prodRegex = /href="(\/shop\/[a-zA-Z0-9_-]+-(\d+))"/g;
  const products = [];
  let m;
  while ((m = prodRegex.exec(catRes.body)) !== null) {
    if (!products.find(p => p.id === m[2])) {
      products.push({ url: m[1], id: m[2] });
    }
  }

  console.log(`Found ${products.length} products in Korean Skincare:`);
  for (const p of products.slice(0, 5)) {
    // 1. Fetch with wholesale pricelist (3616)
    await request('https://www.abdulghanitrading.com/shop/change_pricelist/%D8%B3%D8%B9%D8%B1-%D8%A7%D9%84%D8%AC%D9%85%D9%84%D8%A9-usd-3616', {}, null, jar);
    const wsHtml = await request(`https://www.abdulghanitrading.com${p.url}`, {}, null, jar);
    const wsSpans = wsHtml.body.match(/<span[^>]*class="[^"]*oe_currency_value[^"]*"[^>]*>([\s\S]*?)<\/span>/gi) || [];
    const wsPrice = wsSpans[0] ? parseFloat(wsSpans[0].replace(/<[^>]+>/g, '').trim()) : null;

    // 2. Fetch with retail pricelist (3633)
    await request('https://www.abdulghanitrading.com/shop/change_pricelist/retail-price-3633', {}, null, jar);
    const rtHtml = await request(`https://www.abdulghanitrading.com${p.url}`, {}, null, jar);
    const rtSpans = rtHtml.body.match(/<span[^>]*class="[^"]*oe_currency_value[^"]*"[^>]*>([\s\S]*?)<\/span>/gi) || [];
    const rtPrice = rtSpans[0] ? parseFloat(rtSpans[0].replace(/<[^>]+>/g, '').trim()) : null;

    const titleMatch = wsHtml.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : p.url;

    const wsWithVat = wsPrice ? Math.round(wsPrice * 1.12 * 100) / 100 : null;

    console.log(`\n📦 Product: ${title}`);
    console.log(`   - Wholesale (سعر الجملة): $${wsPrice}`);
    console.log(`   - Your Cost + 12% VAT (سعر الاستلام مع الضريبة): $${wsWithVat}`);
    console.log(`   - Retail Website Price (سعر الموقع العادي للزبون): $${rtPrice}`);
    if (rtPrice && wsWithVat) {
      console.log(`   - Net Profit (صافي الربح): $${(rtPrice - wsWithVat).toFixed(2)} (${(((rtPrice - wsWithVat)/wsWithVat)*100).toFixed(1)}%)`);
    }
  }
}

run().catch(console.error);
