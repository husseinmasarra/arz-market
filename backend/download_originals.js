const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ORIGINALS_DIR = path.join(__dirname, 'deal_originals');
if (!fs.existsSync(ORIGINALS_DIR)) fs.mkdirSync(ORIGINALS_DIR, { recursive: true });

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

const DEAL_CATEGORIES = [
  { id: '104', name_en: 'Home_Supplies' },
  { id: '106', name_en: 'School_Supplies' },
  { id: '107', name_en: 'Electronics' },
  { id: '124', name_en: 'Beauty' },
  { id: '127', name_en: 'Toys' },
  { id: '129', name_en: 'Party' },
  { id: '134', name_en: 'Care' },
  { id: '174', name_en: 'Home_Decor' },
  { id: '175', name_en: 'Super_Deal' },
  { id: '162', name_en: 'Sports' },
  { id: '164', name_en: 'Health' },
  { id: '168', name_en: 'Muller_Koch' },
  { id: '179', name_en: 'Summer' }
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
    const idMatch = cardHtml.match(/data-wishlist-deal=["'](\d+)["']/i);
    const dealId = idMatch ? idMatch[1] : '';
    if (rawTitle) {
      const fullImgUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.deal.com.lb/${imgSrc.replace(/^\//, '')}`;
      cards.push({ dealId, title: rawTitle.replace(/\s+/g, ' ').trim(), imageUrl: fullImgUrl });
    }
  }
  return cards;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== Downloading ALL original Deal.com.lb images (with pagination) ===');
  console.log('Saving to:', ORIGINALS_DIR, '\n');

  const seenUrls = new Set();
  const allCards = [];

  for (const cat of DEAL_CATEGORIES) {
    let page = 1;
    let catTotal = 0;
    
    while (true) {
      try {
        const url = `https://www.deal.com.lb/shop/?categ=${cat.id}&page=${page}`;
        const html = await fetchPage(url);
        const cards = parseCards(html);
        
        // Filter duplicates
        const newCards = cards.filter(c => !seenUrls.has(c.imageUrl));
        newCards.forEach(c => { 
          seenUrls.add(c.imageUrl);
          c.category = cat.name_en;
          allCards.push(c); 
        });
        
        catTotal += newCards.length;
        
        // If no new cards found on this page, stop pagination
        if (newCards.length === 0 || cards.length === 0) break;
        
        page++;
        await sleep(300); // Be nice to the server
      } catch (e) {
        console.error(`  Error on ${cat.name_en} page ${page}:`, e.message);
        break;
      }
    }
    console.log(`${cat.name_en}: ${catTotal} products (${page} pages)`);
  }
  
  console.log(`\nTotal unique images to download: ${allCards.length}\n`);

  const csvLines = ['dealId,category,title,originalUrl,localFile'];
  let downloaded = 0, errors = 0;

  for (const card of allCards) {
    const ext = card.imageUrl.match(/\.(jpg|jpeg|png|webp)/i);
    const fileExt = ext ? ext[1].toLowerCase() : 'jpg';
    const safeName = (card.dealId || (downloaded + 50000)).toString();
    const fileName = `deal_${safeName}.${fileExt}`;
    const filePath = path.join(ORIGINALS_DIR, fileName);

    // Skip if already downloaded
    if (fs.existsSync(filePath)) {
      downloaded++;
      csvLines.push(`${card.dealId},"${card.category}","${card.title.replace(/"/g, '""')}","${card.imageUrl}","${fileName}"`);
      continue;
    }

    try {
      const buf = await fetchBuffer(card.imageUrl);
      fs.writeFileSync(filePath, buf);
      downloaded++;
      csvLines.push(`${card.dealId},"${card.category}","${card.title.replace(/"/g, '""')}","${card.imageUrl}","${fileName}"`);
      if (downloaded % 50 === 0) {
        console.log(`[${downloaded}/${allCards.length}] Downloaded...`);
      }
    } catch (e) {
      errors++;
      console.error(`Failed: deal_${safeName} - ${e.message}`);
      await sleep(500);
    }
  }

  fs.writeFileSync(path.join(ORIGINALS_DIR, '_manifest.csv'), csvLines.join('\n'), 'utf8');

  console.log(`\n=== DONE ===`);
  console.log(`Downloaded: ${downloaded}, Errors: ${errors}`);
  console.log(`Images saved in: ${ORIGINALS_DIR}`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
