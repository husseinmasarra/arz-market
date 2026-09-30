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

  // 2. Fetch page 1 and extract product cards
  const shopPage = await request('https://www.abdulghanitrading.com/shop', {}, null, jar);
  
  // Look for product links
  const prodRegex = /href="(\/shop\/[a-zA-Z0-9_-]+-(\d+))"/g;
  const products = [];
  let m;
  while ((m = prodRegex.exec(shopPage.body)) !== null) {
    if (!products.find(p => p.id === m[2])) {
      products.push({ url: m[1], id: m[2] });
    }
  }

  console.log(`Found ${products.length} products on /shop.`);

  // Test combination info for first 8 products
  for (const prod of products.slice(0, 8)) {
    // 1. Wholesale
    await request('https://www.abdulghanitrading.com/shop/change_pricelist/%D8%B3%D8%B9%D8%B1-%D8%A7%D9%84%D8%AC%D9%85%D9%84%D8%A9-usd-3616', {}, null, jar);
    const rpcWholesale = JSON.stringify({
      jsonrpc: '2.0', method: 'call',
      params: { product_template_id: parseInt(prod.id), combination: [], add_qty: 1, pricelist_id: 3616 }
    });
    const resWs = await request('https://www.abdulghanitrading.com/website_sale/get_combination_info', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    }, rpcWholesale, jar);

    // 2. Retail
    await request('https://www.abdulghanitrading.com/shop/change_pricelist/retail-price-3633', {}, null, jar);
    const rpcRetail = JSON.stringify({
      jsonrpc: '2.0', method: 'call',
      params: { product_template_id: parseInt(prod.id), combination: [], add_qty: 1, pricelist_id: 3633 }
    });
    const resRt = await request('https://www.abdulghanitrading.com/website_sale/get_combination_info', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    }, rpcRetail, jar);

    try {
      const dataWs = JSON.parse(resWs.body).result;
      const dataRt = JSON.parse(resRt.body).result;
      const wsPrice = dataWs ? (dataWs.price || dataWs.list_price) : null;
      const rtPrice = dataRt ? (dataRt.price || dataRt.list_price) : null;
      const wsWithTax = wsPrice ? Math.round(wsPrice * 1.12 * 100) / 100 : null; // +12% VAT

      console.log(`\nProduct: "${dataWs?.display_name || prod.url}" (ID: ${prod.id})`);
      console.log(`- Merchant Wholesale Price (سعر الجملة): $${wsPrice}`);
      console.log(`- Your Cost with 12% VAT (سعر الاستلام + 12% ضريبة): $${wsWithTax}`);
      console.log(`- Retail Selling Price (سعر الموقع العادي للزبون): $${rtPrice}`);
      if (rtPrice && wsWithTax) {
        console.log(`- Expected Profit Margin: $${(rtPrice - wsWithTax).toFixed(2)} (${(((rtPrice - wsWithTax)/wsWithTax)*100).toFixed(1)}%)`);
      }
    } catch(e) {
      console.error('Parse error:', e.message);
    }
  }
}

run().catch(console.error);
