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

async function testSession() {
  const jar = new CookieJar();

  console.log('--- 1. Get Login Page ---');
  const loginPage = await request('https://www.abdulghanitrading.com/web/login', {}, null, jar);
  console.log('Login page status:', loginPage.statusCode);
  console.log('Cookies after get:', jar.getCookieString());

  const csrfMatch = loginPage.body.match(/name="csrf_token"\s+value="([^"]+)"/i);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';
  console.log('CSRF Token:', csrfToken);

  console.log('\n--- 2. POST to /web/login ---');
  const postBody = querystring.stringify({
    csrf_token: csrfToken,
    login: 'info@arz-mart.com',
    password: 'Hussein123@%',
    redirect: '/my/home'
  });

  const loginRes = await request('https://www.abdulghanitrading.com/web/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postBody),
      'Referer': 'https://www.abdulghanitrading.com/web/login'
    }
  }, postBody, jar);

  console.log('POST status:', loginRes.statusCode);
  console.log('Redirect location:', loginRes.headers['location']);
  console.log('Cookies after POST:', jar.getCookieString());

  console.log('\n--- 3. Check /my/home ---');
  const myHome = await request('https://www.abdulghanitrading.com/my/home', {}, null, jar);
  console.log('/my/home status:', myHome.statusCode);
  console.log('Contains info@arz-mart.com:', myHome.body.includes('info@arz-mart.com'));
  console.log('Contains Logout/Sign out:', myHome.body.includes('Sign out') || myHome.body.includes('logout') || myHome.body.includes('/web/session/logout'));

  // Look for partner/user name in /my/home
  const nameMatch = myHome.body.match(/<span[^>]*class="[^"]*user[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
                 || myHome.body.match(/<a[^>]*href="\/my\/home"[^>]*>([\s\S]*?)<\/a>/i);
  console.log('User heading match:', nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : 'none');

  console.log('\n--- 4. Check /shop with logged-in Session ---');
  const shopRes = await request('https://www.abdulghanitrading.com/shop', {}, null, jar);
  console.log('/shop status:', shopRes.statusCode);
  console.log('Shop contains Logout/Sign out:', shopRes.body.includes('Sign out') || shopRes.body.includes('logout') || shopRes.body.includes('/web/session/logout'));

  // Look for pricelists or prices on logged in /shop
  fs.writeFileSync('logged_in_shop.html', shopRes.body);
  console.log('Saved logged_in_shop.html');

  // Let's test checking product page
  const prodRes = await request('https://www.abdulghanitrading.com/shop/geparlys-beautiful-girl-edp-80ml-46403', {}, null, jar);
  fs.writeFileSync('logged_in_prod.html', prodRes.body);
  console.log('Saved logged_in_prod.html');
}

testSession().catch(console.error);
