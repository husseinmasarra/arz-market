process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');

const candidates = [
  // Gaming
  { id: 80, name: 'Gaming & Esports', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85' },
  // Powerbank
  { id: 18, name: 'Power Bank', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80' },
  // Baby Monitor / Cam
  { id: 23, name: 'Baby Monitor', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80' },
  // Toothbrush / Dental
  { id: 27, name: 'Toothbrush', url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80' },
  { id: 122, name: 'Oral Care', url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80' },
  // Mix Product
  { id: 30, name: 'Mix Product', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80' },
  // HyperX
  { id: 32, name: 'HyperX', url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80' },
  // Pen / Stylus
  { id: 37, name: 'Pen', url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=800&q=80' },
  // Smart Glasses
  { id: 42, name: 'Smart Glasses', url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80' },
  // Airtag / Tracker
  { id: 50, name: 'Airtag', url: 'https://images.unsplash.com/photo-1627989580309-bfaf3e58af6f?auto=format&fit=crop&w=800&q=80' },
  // Safe Box
  { id: 55, name: 'Safe Box', url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=800&q=80' },
  // Cooling Radiator
  { id: 56, name: 'Cooling Radiator', url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80' },
  // Gaming Chair
  { id: 58, name: 'Gaming Chair', url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=800&q=80' },
  // Cookware
  { id: 98, name: 'Cookware', url: 'https://images.unsplash.com/photo-1584990347449-3972a95c3b9b?auto=format&fit=crop&w=800&q=80' },
  // Food Storage
  { id: 102, name: 'Food Storage', url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80' },
  // Body Lotion
  { id: 120, name: 'Body Lotion', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80' }
];

async function verifyAll() {
  const verified = [];
  for (const item of candidates) {
    await new Promise((res) => {
      https.get(item.url, (r) => {
        console.log(`[ID ${item.id}] ${item.name}: HTTP ${r.statusCode}`);
        if (r.statusCode === 200) verified.push(item);
        res();
      }).on('error', (e) => {
        console.log(`[ID ${item.id}] ${item.name}: ERR ${e.message}`);
        res();
      });
    });
  }
  console.log(`Verified ${verified.length} / ${candidates.length} images`);
}
verifyAll();
