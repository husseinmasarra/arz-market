const https = require('https');
const http = require('http');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const UPLOADS_DIR = path.join(__dirname, 'uploads/products');

const pgPool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

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
    const client = url.startsWith('https') ? https : http;
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

// PRECISE logo detection - only covers the actual DeaL badge
function detectPreciseLogo(data, width, height, channels) {
  // Only scan the top-left 30% x 18% zone (where the badge actually is)
  const scanW = Math.round(width * 0.30);
  const scanH = Math.round(height * 0.18);
  
  let blueCount = 0, orangeCount = 0;
  let minX = scanW, maxX = 0, minY = scanH, maxY = 0;
  
  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      
      // Tight blue detection for DeaL logo (precise #0077c8 range)
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
  
  const totalLogoPixels = blueCount + orangeCount;
  
  // Only apply patch if we actually found a significant logo cluster (>500 pixels)
  if (totalLogoPixels > 500) {
    // Add small padding around the detected bounding box
    const padX = Math.round(width * 0.015);
    const padY = Math.round(height * 0.015);
    
    return {
      found: true,
      left: Math.max(0, minX - padX),
      top: Math.max(0, minY - padY),
      width: Math.min(width, (maxX - minX) + padX * 2),
      height: Math.min(height, (maxY - minY) + padY * 2),
      blueCount,
      orangeCount
    };
  }
  
  return { found: false };
}

async function cleanImagePrecise(rawBuffer) {
  const { data, info } = await sharp(rawBuffer).raw().toBuffer({ resolveWithObject: true });
  const logo = detectPreciseLogo(data, info.width, info.height, info.channels);
  
  if (!logo.found) {
    // No logo detected - just convert to webp, DON'T add any white patch
    return sharp(rawBuffer).webp({ quality: 90 }).toBuffer();
  }
  
  // Only cover the precise logo area
  const svg = `<svg width="${logo.width}" height="${logo.height}"><rect width="${logo.width}" height="${logo.height}" fill="#ffffff" /></svg>`;
  
  return sharp(rawBuffer)
    .composite([{ input: Buffer.from(svg), top: logo.top, left: logo.left }])
    .webp({ quality: 90 })
    .toBuffer();
}

const DEAL_CATEGORIES = [
  { id: '104', name_en: 'Home Supplies' },
  { id: '106', name_en: 'School Supplies' },
  { id: '107', name_en: 'Electronics & Accessories' },
  { id: '124', name_en: 'Beauty Products' },
  { id: '127', name_en: 'Toys & Baby Products' },
  { id: '129', name_en: 'Party Supplies' },
  { id: '134', name_en: 'Care Supplies' },
  { id: '174', name_en: 'Home Decor' },
  { id: '175', name_en: 'Super Deal' },
  { id: '162', name_en: 'Sports & Fitness' },
  { id: '164', name_en: 'Health Care' },
  { id: '168', name_en: 'Muller Koch' },
  { id: '179', name_en: 'Summer Essentials' }
];

function parseCards(html) {
  const cards = [];
  const cardRegex = /<div\s+class="deal-product-card[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
  const rawCards = html.match(cardRegex) || [];

  for (const cardHtml of rawCards) {
    const imgMatch = cardHtml.match(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/i);
    const imgSrc = imgMatch ? imgMatch[1] : '';
    if (!imgSrc || !imgSrc.includes('dealuploads/')) continue;

    const titleMatch = cardHtml.match(/<h3 class="deal-product-card__title">([\s\S]*?)<\/h3>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : (imgMatch ? imgMatch[2] : '');
    const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();

    const idMatch = cardHtml.match(/data-wishlist-deal=["'](\d+)["']/i);
    const dealId = idMatch ? idMatch[1] : '';

    if (cleanTitle) {
      const fullImgUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.deal.com.lb/${imgSrc.replace(/^\//, '')}`;
      cards.push({ dealId, title: cleanTitle, imageUrl: fullImgUrl });
    }
  }
  return cards;
}

function splitTitle(title) {
  let nameAr = '', nameEn = '';
  if (title.includes('|')) {
    const parts = title.split('|').map(s => s.trim());
    const isFirstAr = /[\u0600-\u06FF]/.test(parts[0]);
    if (isFirstAr) { nameAr = parts[0]; nameEn = parts.slice(1).join(' '); }
    else { nameEn = parts[0]; nameAr = parts.slice(1).join(' '); }
  } else {
    nameEn = title; nameAr = title;
  }
  return { nameAr: nameAr || title, nameEn: nameEn || title };
}

async function main() {
  console.log('=== PRECISE DEAL IMAGE RE-CLEAN (fixing over-aggressive patches) ===\n');
  
  // Scrape all live cards from deal.com.lb
  const allCards = [];
  for (const cat of DEAL_CATEGORIES) {
    try {
      const html = await fetchPage(`https://www.deal.com.lb/shop/?categ=${cat.id}`);
      const cards = parseCards(html);
      for (const c of cards) allCards.push(c);
      console.log(`${cat.name_en}: ${cards.length} products`);
    } catch (e) {
      console.error(`Error scraping ${cat.name_en}:`, e.message);
    }
  }
  console.log(`\nTotal live cards: ${allCards.length}\n`);

  let processed = 0, cleaned = 0, noLogo = 0, errors = 0;

  for (const card of allCards) {
    processed++;
    const bilingual = splitTitle(card.title);
    const sku = card.dealId ? `DEAL-${card.dealId}` : '';
    
    // Find matching product in PostgreSQL
    let pgProd = null;
    try {
      const q = await pgPool.query(
        `SELECT id FROM products WHERE name_en = $1 OR name_ar = $2 OR description_en LIKE $3 LIMIT 1`,
        [bilingual.nameEn, bilingual.nameAr, `%${sku}%`]
      );
      if (q.rows.length > 0) pgProd = q.rows[0];
    } catch (e) {}

    const prodId = pgProd ? pgProd.id : (card.dealId || processed + 10000);
    const fileName = `deal_prod_${prodId}.webp`;
    const localFilePath = path.join(UPLOADS_DIR, fileName);

    try {
      // Re-fetch the ORIGINAL image from deal.com.lb
      const rawBuf = await fetchBuffer(card.imageUrl);
      const cleanedBuf = await cleanImagePrecise(rawBuf);
      fs.writeFileSync(localFilePath, cleanedBuf);
      
      // Check if logo was found
      const { data, info } = await sharp(rawBuf).raw().toBuffer({ resolveWithObject: true });
      const logo = detectPreciseLogo(data, info.width, info.height, info.channels);
      if (logo.found) cleaned++;
      else noLogo++;

      if (processed % 50 === 0 || processed === allCards.length) {
        console.log(`[${processed}/${allCards.length}] Cleaned: ${cleaned}, No logo: ${noLogo}, Errors: ${errors}`);
      }
    } catch (err) {
      errors++;
      if (processed % 50 === 0) {
        console.log(`[${processed}/${allCards.length}] Error: ${err.message}`);
      }
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Total: ${processed}, Logo removed: ${cleaned}, No logo needed: ${noLogo}, Errors: ${errors}`);
  
  await pgPool.end();
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
