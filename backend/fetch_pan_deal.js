const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

function fetch(url) {
  return new Promise((resolve) => {
    https.get(url, { agent, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: d, location: res.headers.location }));
    }).on('error', e => resolve({ status: 500, data: '', err: e.message }));
  });
}

async function run() {
  const urls = [
    'https://www.deal.com.lb/?query=36cm',
    'https://www.deal.com.lb/search?q=36cm',
    'https://www.deal.com.lb/deals?q=36cm',
    'https://www.deal.com.lb/deals?search=36cm',
    'https://www.deal.com.lb/kitchen'
  ];
  for (const u of urls) {
    const res = await fetch(u);
    console.log(u, 'Status:', res.status, 'Len:', res.data.length, 'Loc:', res.location);
    if (res.data.includes('69069') || res.data.toLowerCase().includes('frying pan')) {
      console.log('FOUND in', u);
      const m = res.data.match(/dealuploads\/[^"'\s>]+/g);
      console.log('Images:', m);
    }
  }
}
run();
