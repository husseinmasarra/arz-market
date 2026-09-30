const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('./node_modules/sharp');
const db = require('./src/config/db');

const ORIGINALS_DIR = path.join(__dirname, 'deal_originals');
const UPLOADS_DIR = path.join(__dirname, 'uploads/products');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const agent = new https.Agent({ rejectUnauthorized: false });

function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { agent, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).href;
        }
        return fetchImageBuffer(redirectUrl).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with HTTP status ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function detectLogoBox(data, width, height, channels) {
  const maxW = Math.round(width * 0.45);
  const maxH = Math.round(height * 0.30);
  
  let blueCount = 0, orangeCount = 0;
  let minX = maxW, maxX = 0, minY = maxH, maxY = 0;
  
  for (let y = 0; y < maxH; y++) {
    for (let x = 0; x < maxW; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      
      const isBlue = (r < 85 && g > 65 && g < 225 && b > 125);
      const isOrange = (r > 165 && g > 45 && g < 205 && b < 115);
      
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
  
  if (blueCount + orangeCount > 15) {
    const padX = Math.max(15, Math.round(width * 0.02));
    const padY = Math.max(15, Math.round(height * 0.02));
    const left = Math.max(0, minX - padX);
    const top = Math.max(0, minY - padY);
    const w = Math.min(width - left, (maxX - minX) + padX * 2);
    const h = Math.min(height - top, (maxY - minY) + padY * 2);
    return { found: true, left, top, width: w, height: h, blueCount, orangeCount };
  }
  
  return { found: false };
}

async function cleanImageBuffer(rawBuffer) {
  const { data, info } = await sharp(rawBuffer).raw().toBuffer({ resolveWithObject: true });
  const logo = detectLogoBox(data, info.width, info.height, info.channels);
  
  if (logo.found) {
    const svg = `<svg width="${logo.width}" height="${logo.height}"><rect width="${logo.width}" height="${logo.height}" fill="#ffffff" /></svg>`;
    return sharp(rawBuffer)
      .composite([{ input: Buffer.from(svg), top: logo.top, left: logo.left }])
      .webp({ quality: 90 })
      .toBuffer();
  }
  
  // Standard badge fallback for top-left
  const standardW = Math.round(info.width * 0.35);
  const standardH = Math.round(info.height * 0.18);
  const svgFallback = `<svg width="${standardW}" height="${standardH}"><rect width="${standardW}" height="${standardH}" fill="#ffffff" /></svg>`;
  return sharp(rawBuffer)
    .composite([{ input: Buffer.from(svgFallback), top: 0, left: 0 }])
    .webp({ quality: 90 })
    .toBuffer();
}

async function main() {
  console.log('=== ULTRA-FAST DEAL IMAGES RE-CLEAN & WATERMARK REMOVAL ===\n');

  // Fetch all Deal products
  const dealProds = await db.allAsync(`
    SELECT id, name_en, name_ar, image_url, description_en 
    FROM products 
    WHERE image_url LIKE '%deal%' 
       OR merchant_id IN (SELECT id FROM merchants WHERE name ILIKE '%deal%')
    ORDER BY id ASC
  `);

  console.log(`Found ${dealProds.length} total Deal products in database.\n`);

  let cleanedCount = 0;
  let alreadyCleanCount = 0;
  let dbUpdatesCount = 0;
  const dbUpdates = [];

  // Parallel processing in chunks of 15
  const CHUNK_SIZE = 15;
  for (let i = 0; i < dealProds.length; i += CHUNK_SIZE) {
    const chunk = dealProds.slice(i, i + CHUNK_SIZE);

    await Promise.all(chunk.map(async prod => {
      const targetFilename = `deal_prod_${prod.id}.webp`;
      const targetPath = path.join(UPLOADS_DIR, targetFilename);
      const dbImageUrl = `/uploads/products/${targetFilename}`;

      try {
        let rawBuf = null;

        // 1. Try to find raw uncleaned image in deal_originals
        let dealIdMatch = (prod.description_en || '').match(/SKU:\s*(?:ARZ-|DEAL-)?(\d+)/i) || 
                          (prod.image_url || '').match(/(\d+)\.(?:jpg|jpeg|png|jfif|webp)/i);
        let dealId = dealIdMatch ? dealIdMatch[1] : '';

        if (dealId) {
          const exts = ['.jpg', '.png', '.jfif', '.jpeg'];
          for (const ext of exts) {
            const f = path.join(ORIGINALS_DIR, `deal_${dealId}${ext}`);
            if (fs.existsSync(f)) {
              rawBuf = fs.readFileSync(f);
              break;
            }
          }
        }

        // 2. If image_url is a remote deal.com.lb URL, fetch it
        if (!rawBuf && prod.image_url && prod.image_url.startsWith('http')) {
          rawBuf = await fetchImageBuffer(prod.image_url);
        }

        // 3. If local file exists and image_url is already /uploads/products/deal_prod_...webp
        if (!rawBuf && fs.existsSync(targetPath)) {
          // If already cleaned and file exists, verify if it needs watermark removal
          rawBuf = fs.readFileSync(targetPath);
        }

        if (rawBuf) {
          const cleanedBuf = await cleanImageBuffer(rawBuf);
          fs.writeFileSync(targetPath, cleanedBuf);
          cleanedCount++;

          if (prod.image_url !== dbImageUrl) {
            dbUpdates.push({ id: prod.id, image_url: dbImageUrl });
          }
        } else {
          console.warn(`[Warning] No image buffer could be found for product ID ${prod.id} (${prod.name_en})`);
        }
      } catch (err) {
        console.error(`Error on product ID ${prod.id}:`, err.message);
      }
    }));

    console.log(`Processed ${Math.min(i + CHUNK_SIZE, dealProds.length)} / ${dealProds.length} products... (Cleaned: ${cleanedCount})`);
  }

  // Apply DB updates
  console.log(`\nApplying ${dbUpdates.length} database image_url updates...`);
  for (const u of dbUpdates) {
    await db.runAsync("UPDATE products SET image_url = ? WHERE id = ?", [u.image_url, u.id]);
  }

  console.log(`\n=== DONE! ===`);
  console.log(`Total Products: ${dealProds.length}`);
  console.log(`Cleaned Images Saved: ${cleanedCount}`);
  console.log(`Database Image URLs Updated: ${dbUpdates.length}`);

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
