process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');

const urls = [
  { key: 'gaming_80', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85' },
  { key: 'gaming_alt', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=85' },
  { key: 'toothbrush_27', url: 'https://images.unsplash.com/photo-1559591937-e62fb3d8d4bb?auto=format&fit=crop&w=800&q=80' },
  { key: 'pen_37', url: 'https://images.unsplash.com/photo-1585336261026-41ffb9829f0e?auto=format&fit=crop&w=800&q=80' },
  { key: 'hyperx_32', url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80' },
  { key: 'powerbank_18', url: 'https://images.unsplash.com/photo-1609592424369-0e86b81461bd?auto=format&fit=crop&w=800&q=80' }
];

async function test() {
  for (const item of urls) {
    await new Promise((res) => {
      https.get(item.url, (r) => {
        console.log(`${item.key}: HTTP ${r.statusCode}`);
        res();
      }).on('error', (e) => {
        console.log(`${item.key}: ERR ${e.message}`);
        res();
      });
    });
  }
}
test();
