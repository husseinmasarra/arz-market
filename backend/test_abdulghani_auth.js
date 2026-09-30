const https = require('https');
const querystring = require('querystring');
const fs = require('fs');

const agent = new https.Agent({ rejectUnauthorized: false });

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      agent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function getCookieString(cookieHeaders) {
  if (!cookieHeaders) return '';
  const cookies = Array.isArray(cookieHeaders) ? cookieHeaders : [cookieHeaders];
  return cookies.map(c => c.split(';')[0]).join('; ');
}

async function run() {
  console.log('=== Step 1: Getting /web/login page ===');
  const loginPage = await request('https://www.abdulghanitrading.com/web/login');
  console.log('Login page status:', loginPage.statusCode);
  
  const initCookies = getCookieString(loginPage.headers['set-cookie']);
  console.log('Initial cookies:', initCookies);
  
  const csrfMatch = loginPage.body.match(/name="csrf_token"\s+value="([^"]+)"/i);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';
  console.log('CSRF Token:', csrfToken);

  // Try JSON-RPC authenticate first (Odoo standard API)
  console.log('\n=== Step 2: Testing Odoo JSON-RPC Auth ===');
  const rpcPayload = JSON.stringify({
    jsonrpc: '2.0',
    method: 'call',
    params: {
      db: 'abdulghanitrading', // or check if db is needed
      login: 'info@arz-mart.com',
      password: 'Hussein123@%'
    }
  });

  const rpcRes = await request('https://www.abdulghanitrading.com/web/session/authenticate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': initCookies
    }
  }, rpcPayload);

  console.log('RPC Auth status:', rpcRes.statusCode);
  console.log('RPC Auth body:', rpcRes.body.slice(0, 300));
  const rpcCookies = getCookieString(rpcRes.headers['set-cookie']);
  console.log('RPC Set-Cookie:', rpcCookies);

  // Also try Standard Form POST login
  console.log('\n=== Step 3: Testing Standard Form POST Login ===');
  const formData = querystring.stringify({
    csrf_token: csrfToken,
    login: 'info@arz-mart.com',
    password: 'Hussein123@%',
    redirect: '/shop'
  });

  const formRes = await request('https://www.abdulghanitrading.com/web/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formData),
      'Cookie': initCookies,
      'Referer': 'https://www.abdulghanitrading.com/web/login'
    }
  }, formData);

  console.log('Form POST status:', formRes.statusCode);
  console.log('Form POST Location:', formRes.headers['location']);
  const formCookies = getCookieString(formRes.headers['set-cookie']);
  console.log('Form POST Set-Cookie:', formCookies);

  const activeCookie = formCookies || rpcCookies || initCookies;

  // Let's test fetching /shop with and without login to compare prices!
  console.log('\n=== Step 4: Testing /shop without login (Retail Price) ===');
  const retailShop = await request('https://www.abdulghanitrading.com/shop');
  fs.writeFileSync('retail_shop.html', retailShop.body);
  console.log('Retail /shop length:', retailShop.body.length);

  console.log('\n=== Step 5: Testing /shop WITH login (Merchant Price) ===');
  const authShop = await request('https://www.abdulghanitrading.com/shop', {
    headers: {
      'Cookie': `${initCookies}; ${activeCookie}`
    }
  });
  fs.writeFileSync('auth_shop.html', authShop.body);
  console.log('Auth /shop length:', authShop.body.length);

  // Let's check sample products from both pages
  console.log('\n=== Step 6: Sample Price Comparison ===');
  // Simple extraction of product cards
  const extractItems = (html) => {
    const items = [];
    const itemRegex = /<form[^>]*action="\/shop\/cart\/update"[^>]*>([\s\S]*?)<\/form>/gi;
    let m;
    while ((m = itemRegex.exec(html)) !== null) {
      const block = m[1];
      const titleM = block.match(/class="[^"]*o_wsale_products_item_title[^"]*"[^>]*>([\s\S]*?)<\/a>/i) || block.match(/<h6>\s*<a[^>]*>([\s\S]*?)<\/a>/i);
      const priceM = block.match(/class="[^"]*oe_currency_value[^"]*"[^>]*>([\s\S]*?)<\/span>/i) || block.match(/(\$[\d,.]+)/i);
      if (titleM) {
        items.push({
          title: titleM[1].replace(/<[^>]+>/g, '').trim(),
          price: priceM ? priceM[1].replace(/<[^>]+>/g, '').trim() : 'N/A'
        });
      }
    }
    return items;
  };

  const retailItems = extractItems(retailShop.body);
  const authItems = extractItems(authShop.body);
  console.log(`Extracted ${retailItems.length} retail items and ${authItems.length} auth items.`);
  for (let i = 0; i < Math.min(5, retailItems.length); i++) {
    console.log(`Product ${i+1}: "${retailItems[i]?.title}" | Retail: ${retailItems[i]?.price} | Merchant: ${authItems[i]?.price}`);
  }
}

run().catch(console.error);
