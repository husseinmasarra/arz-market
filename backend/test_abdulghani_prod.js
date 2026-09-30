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

async function loginAndCompare() {
  console.log('--- Step 1: Performing Login to get Authenticated Session ---');
  const loginPage = await request('https://www.abdulghanitrading.com/web/login');
  const initCookies = getCookieString(loginPage.headers['set-cookie']);
  const csrfMatch = loginPage.body.match(/name="csrf_token"\s+value="([^"]+)"/i);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';

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

  const authCookies = getCookieString(formRes.headers['set-cookie']);
  console.log('Auth Cookies:', authCookies);

  const testProductUrl = 'https://www.abdulghanitrading.com/shop/geparlys-beautiful-girl-edp-80ml-46403';
  
  console.log('\n--- Step 2: Fetching Product Details as Guest (Retail) ---');
  const guestProd = await request(testProductUrl);
  fs.writeFileSync('guest_prod.html', guestProd.body);

  console.log('\n--- Step 3: Fetching Product Details as Merchant (Wholesale) ---');
  const authProd = await request(testProductUrl, {
    headers: {
      'Cookie': `${initCookies}; ${authCookies}`
    }
  });
  fs.writeFileSync('auth_prod.html', authProd.body);

  // Analyze prices in both
  function parseProductHtml(html) {
    const titleMatch = html.match(/<h1[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const priceMatch = html.match(/class="[^"]*oe_price[^"]*"[\s\S]*?<span[^>]*class="[^"]*oe_currency_value[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
                    || html.match(/class="[^"]*oe_currency_value[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
                    || html.match(/class="[^"]*product_price[^"]*"[\s\S]*?\$?\s*([\d,.]+)/i);

    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '').trim()) : null;

    // Look for all price numbers
    const allPrices = html.match(/\$\s*[\d,.]+/g) || [];

    // Look for images
    const imgMatches = html.match(/src="(\/web\/image\/product\.template\/[^\"]+)"/g) || [];

    // Look for SKU / internal reference
    const defaultCodeMatch = html.match(/itemprop="sku"[^>]*content="([^"]+)"/i) || html.match(/<span[^>]*class="[^"]*js_product_template_code[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const sku = defaultCodeMatch ? defaultCodeMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    return { title, price, allPrices, imgMatches, sku };
  }

  const guestData = parseProductHtml(guestProd.body);
  const authData = parseProductHtml(authProd.body);

  console.log('\n=== RESULTS ===');
  console.log('Guest (Retail) Data:', guestData);
  console.log('Merchant (Wholesale) Data:', authData);
}

loginAndCompare().catch(console.error);
