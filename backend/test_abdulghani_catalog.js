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

async function analyze() {
  const jar = new CookieJar();
  console.log('Logging in...');
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

  console.log('Logged in successfully. Inspecting shop page 1 and total pagination...');
  const shop1 = await request('https://www.abdulghanitrading.com/shop', {}, null, jar);

  // Check pagination links
  const pageLinks = shop1.body.match(/\/shop\/page\/\d+/g) || [];
  console.log('Pagination links found:', [...new Set(pageLinks)]);

  // Check categories menu
  const catMatches = shop1.body.match(/<a[^>]*href="\/shop\/category\/[^"]+"[^>]*>[\s\S]*?<\/a>/gi) || [];
  console.log('Categories found:', catMatches.length);
  catMatches.slice(0, 15).forEach(c => {
    const text = c.replace(/<[^>]+>/g, '').trim();
    const href = (c.match(/href="([^"]+)"/i) || [])[1];
    if (text) console.log(`  Cat: ${text} -> ${href}`);
  });

  // Inspect sample product page for images
  const sampleUrl = 'https://www.abdulghanitrading.com/shop/maison-alhambra-glacier-bold-100ml-edp-men-7065';
  const prodPage = await request(sampleUrl, {}, null, jar);
  const images = prodPage.body.match(/\/web\/image\/[^\s"'>]+/gi) || [];
  console.log('Image URLs on sample product:', [...new Set(images)]);
}

analyze().catch(console.error);
