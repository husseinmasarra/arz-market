const https = require('https');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const agent = new https.Agent({ rejectUnauthorized: false });

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    client.get(url, { agent, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) redirectUrl = new URL(redirectUrl, url).href;
        return fetchBuffer(redirectUrl).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function analyzeRealLogo() {
  // Fetch a category page to get real image URLs
  const html = await fetchPage('https://www.deal.com.lb/shop/?categ=179');
  const imgRegex = /src=["']([^"']*dealuploads[^"']*\.(?:jpg|png|jpeg|webp))/gi;
  const matches = [];
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    matches.push(m[1]);
  }
  console.log('Found', matches.length, 'deal images on page');
  
  // Test the first 3 images to find the exact logo location
  for (let i = 0; i < Math.min(3, matches.length); i++) {
    let imgUrl = matches[i];
    if (!imgUrl.startsWith('http')) imgUrl = 'https://www.deal.com.lb/' + imgUrl.replace(/^\//, '');
    
    console.log('\nAnalyzing:', imgUrl.substring(imgUrl.lastIndexOf('/') + 1));
    
    try {
      const buf = await fetchBuffer(imgUrl);
      const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
      console.log('Image size:', info.width, 'x', info.height);
      
      // Scan ONLY the very small top-left corner for the DeaL badge
      const scanW = Math.round(info.width * 0.30);
      const scanH = Math.round(info.height * 0.15);
      
      let blueCount = 0, orangeCount = 0;
      let minX = scanW, maxX = 0, minY = scanH, maxY = 0;
      
      for (let y = 0; y < scanH; y++) {
        for (let x = 0; x < scanW; x++) {
          const idx = (y * info.width + x) * info.channels;
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          
          // Tight blue detection for DeaL logo
          const isBlue = (r < 40 && g > 100 && g < 190 && b > 165);
          // Orange text "www.deal.com.lb"
          const isOrange = (r > 200 && g > 80 && g < 170 && b < 60);
          
          if (isBlue || isOrange) {
            if (isBlue) blueCount++;
            if (isOrange) orangeCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      
      const logoW = maxX - minX;
      const logoH = maxY - minY;
      const logoPctW = Math.round(logoW / info.width * 100);
      const logoPctH = Math.round(logoH / info.height * 100);
      
      console.log('Blue pixels:', blueCount, 'Orange pixels:', orangeCount);
      console.log('Logo bounding box:', { minX, minY, maxX, maxY });
      console.log('Logo size:', logoW, 'x', logoH, '(', logoPctW + '% x', logoPctH + '%)');
      
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

analyzeRealLogo();
