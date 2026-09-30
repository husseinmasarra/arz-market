const fs = require('fs');
const https = require('https');
const querystring = require('querystring');

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

async function debug() {
  const jar = new CookieJar();

  // Login
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

  // Switch to Wholesale pricelist
  const chRes = await request('https://www.abdulghanitrading.com/shop/change_pricelist/%D8%B3%D8%B9%D8%B1-%D8%A7%D9%84%D8%AC%D9%85%D9%84%D8%A9-usd-3616', {}, null, jar);
  console.log('Change pricelist redirect status:', chRes.statusCode, 'Location:', chRes.headers['location']);

  // Fetch product page directly as HTML and see what's rendered
  const prodPage = await request('https://www.abdulghanitrading.com/shop/medicube-glutathione-glow-serum-30g-46430', {}, null, jar);
  console.log('Medicube Serum Page length:', prodPage.body.length);
  
  // Extract all prices, title, images, description
  const prices = prodPage.body.match(/\$\s*[\d,.]+/g) || [];
  console.log('Prices found in Medicube page with Wholesale pricelist:', prices);

  const spans = prodPage.body.match(/<span[^>]*class="[^"]*oe_currency_value[^"]*"[^>]*>([\s\S]*?)<\/span>/gi) || [];
  console.log('Currency spans:', spans.map(s => s.replace(/<[^>]+>/g, '').trim()));
  
  // Now switch to Retail pricelist and fetch again
  await request('https://www.abdulghanitrading.com/shop/change_pricelist/retail-price-3633', {}, null, jar);
  const retailPage = await request('https://www.abdulghanitrading.com/shop/medicube-glutathione-glow-serum-30g-46430', {}, null, jar);
  const retailSpans = retailPage.body.match(/<span[^>]*class="[^"]*oe_currency_value[^"]*"[^>]*>([\s\S]*?)<\/span>/gi) || [];
  console.log('Currency spans with Retail pricelist:', retailSpans.map(s => s.replace(/<[^>]+>/g, '').trim()));

  // Let's inspect images and categories on the page
  const imgMatches = prodPage.body.match(/src="(\/web\/image\/[^\"]+)"/g) || [];
  console.log('Image URLs:', imgMatches);

  const descMatch = prodPage.body.match(/<div[^>]*id="product_full_description"[^>]*>([\s\S]*?)<\/div>/i);
  console.log('Has description:', !!descMatch);
}

debug().catch(console.error);
