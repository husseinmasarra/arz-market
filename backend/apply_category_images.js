process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

const updates = [
  // 1. Main Category: Gaming & Esports (The empty one in user screenshot!)
  { id: 80, name: 'Gaming & Esports', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85' },
  // Subcategories
  { id: 18, name: 'Power Bank', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80' },
  { id: 23, name: 'Baby Monitor', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80' },
  { id: 27, name: 'Toothbrush', url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80' },
  { id: 122, name: 'Oral Care', url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80' },
  { id: 30, name: 'Mix Product', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80' },
  { id: 32, name: 'HyperX', url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80' },
  { id: 37, name: 'Pen', url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=800&q=80' },
  { id: 42, name: 'Smart Glasses', url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80' },
  { id: 50, name: 'Airtag', url: 'https://images.unsplash.com/photo-1627989580309-bfaf3e58af6f?auto=format&fit=crop&w=800&q=80' },
  { id: 55, name: 'Safe Box', url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=800&q=80' },
  { id: 56, name: 'Cooling Radiator', url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80' },
  { id: 58, name: 'Gaming Chair', url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=800&q=80' },
  { id: 98, name: 'Cookware', url: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=800&q=80' },
  { id: 102, name: 'Food Storage', url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80' },
  { id: 120, name: 'Body Lotion', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80' }
];

async function updateDb() {
  for (const item of updates) {
    await pool.query('UPDATE categories SET image_url = $1 WHERE id = $2', [item.url, item.id]);
    console.log(`Updated [ID ${item.id}] ${item.name} image -> ${item.url}`);
  }

  // Also update categories.json if exists
  const catJsonPath = path.join(__dirname, '../categories.json');
  if (fs.existsSync(catJsonPath)) {
    try {
      const list = JSON.parse(fs.readFileSync(catJsonPath, 'utf8'));
      if (Array.isArray(list)) {
        list.forEach(c => {
          const u = updates.find(x => x.id === c.id);
          if (u) c.image_url = u.url;
        });
        fs.writeFileSync(catJsonPath, JSON.stringify(list, null, 2), 'utf8');
        console.log('Updated categories.json file successfully.');
      }
    } catch (e) {
      console.error('Error updating categories.json:', e);
    }
  }

  pool.end();
}
updateDb();
