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

async function testPricelists() {
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

  console.log('Logged in successfully. Cookies:', jar.getCookieString());

  // 2. Check how change_pricelist works (POST or GET)
  console.log('\n--- Switching to Wholesale Pricelist (3616) ---');
  // In Odoo: POST /shop/change_pricelist or GET /shop/change_pricelist/3616
  const changeRes = await request('https://www.abdulghanitrading.com/shop/change_pricelist/3616', {}, null, jar);
  console.log('GET change_pricelist/3616 status:', changeRes.statusCode, 'Location:', changeRes.headers['location']);

  // Also try POST /shop/change_pricelist
  const postPl = querystring.stringify({ pricelist_id: '3616' });
  const postPlRes = await request('https://www.abdulghanitrading.com/shop/change_pricelist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postPl)
    }
  }, postPl, jar);
  console.log('POST change_pricelist status:', postPlRes.statusCode);

  // 3. Fetch product with Wholesale pricelist (3616)
  const wholesaleProd = await request('https://www.abdulghanitrading.com/shop/geparlys-beautiful-girl-edp-80ml-46403', {}, null, jar);
  fs.writeFileSync('wholesale_prod.html', wholesaleProd.body);

  // 4. Switch to Retail Pricelist (3633)
  console.log('\n--- Switching to Retail Pricelist (3633) ---');
  await request('https://www.abdulghanitrading.com/shop/change_pricelist/3633', {}, null, jar);
  const retailProd = await request('https://www.abdulghanitrading.com/shop/geparlys-beautiful-girl-edp-80ml-46403', {}, null, jar);
  fs.writeFileSync('retail_prod.html', retailProd.body);

  // Extract prices from both
  function getPrices(html) {
    const valMatches = html.match(/<span[^>]*class="[^"]*oe_currency_value[^"]*"[^>]*>([\s\S]*?)<\/span>/gi) || [];
    return valMatches.map(s => s.replace(/<[^>]+>/g, '').trim());
  }

  console.log('\n=== PRICELIST EXTRACTION TEST ===');
  console.log('Wholesale (3616) prices:', getPrices(wholesaleProd.body));
  console.log('Retail (3633) prices:', getPrices(retailProd.body));
}

testPricelists().catch(console.error);
