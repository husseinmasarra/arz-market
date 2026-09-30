const { Pool } = require('pg');
const { encodeBlurHash } = require('./utils/blurhash_encoder');

const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

const CATEGORY_PALETTES = {
  'beauty': [[245, 230, 224], [235, 185, 175], [220, 150, 160], [250, 240, 235]],
  'gaming': [[15, 23, 42], [30, 41, 59], [59, 130, 246], [147, 51, 234]],
  'perfume': [[245, 220, 160], [217, 119, 6], [180, 83, 9], [254, 243, 199]],
  'phone': [[241, 245, 249], [203, 213, 225], [148, 163, 184], [100, 116, 139]],
  'audio': [[30, 41, 59], [51, 65, 85], [15, 23, 42], [71, 85, 105]],
  'kitchen': [[248, 245, 240], [220, 180, 140], [180, 120, 80], [230, 210, 190]],
  'default': [[240, 244, 248], [226, 232, 240], [203, 213, 225], [180, 195, 210]]
};

function generateSyntheticBlurHash(name = '', categoryName = '', seed = 1) {
  const cat = String(categoryName || name).toLowerCase();
  let palette = CATEGORY_PALETTES.default;
  if (cat.includes('beauty') || cat.includes('تجميل') || cat.includes('مكياج') || cat.includes('skincare')) {
    palette = CATEGORY_PALETTES.beauty;
  } else if (cat.includes('gaming') || cat.includes('جيمنج') || cat.includes('ألعاب') || cat.includes('esports')) {
    palette = CATEGORY_PALETTES.gaming;
  } else if (cat.includes('perfume') || cat.includes('عطور') || cat.includes('بخور') || cat.includes('fragrance')) {
    palette = CATEGORY_PALETTES.perfume;
  } else if (cat.includes('phone') || cat.includes('هاتف') || cat.includes('شواحن') || cat.includes('power')) {
    palette = CATEGORY_PALETTES.phone;
  } else if (cat.includes('audio') || cat.includes('صوت') || cat.includes('سماعات') || cat.includes('camera')) {
    palette = CATEGORY_PALETTES.audio;
  } else if (cat.includes('kitchen') || cat.includes('مطبخ') || cat.includes('dining')) {
    palette = CATEGORY_PALETTES.kitchen;
  }

  const W = 32;
  const H = 32;
  const pixels = new Uint8ClampedArray(W * H * 4);

  const c1 = palette[0];
  const c2 = palette[1];
  const c3 = palette[2];
  const c4 = palette[3];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;
      const r = Math.round((1 - u) * (1 - v) * c1[0] + u * (1 - v) * c2[0] + (1 - u) * v * c3[0] + u * v * c4[0]);
      const g = Math.round((1 - u) * (1 - v) * c1[1] + u * (1 - v) * c2[1] + (1 - u) * v * c3[1] + u * v * c4[1]);
      const b = Math.round((1 - u) * (1 - v) * c1[2] + u * (1 - v) * c2[2] + (1 - u) * v * c3[2] + u * v * c4[2]);

      const idx = (x + y * W) * 4;
      pixels[idx] = Math.max(0, Math.min(255, r));
      pixels[idx + 1] = Math.max(0, Math.min(255, g));
      pixels[idx + 2] = Math.max(0, Math.min(255, b));
      pixels[idx + 3] = 255;
    }
  }

  return encodeBlurHash(pixels, W, H, 4, 3);
}

async function run() {
  console.log('Fetching all products to assign authentic BlurHashes in batch...');
  const res = await pool.query(`
    SELECT p.id, p.name_en, p.name_ar, c.name_en as cat_en, c.name_ar as cat_ar
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
  `);
  
  const all = res.rows;
  console.log(`Generating BlurHashes for ${all.length} products...`);
  
  const BATCH_SIZE = 200;
  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    const batch = all.slice(i, i + BATCH_SIZE);
    
    // Construct single batch UPDATE statement
    const values = [];
    const params = [];
    let pIdx = 1;

    for (const p of batch) {
      const hash = generateSyntheticBlurHash(p.name_en || p.name_ar, p.cat_en || p.cat_ar, p.id);
      values.push(`($${pIdx++}::int, $${pIdx++}::text)`);
      params.push(p.id, hash);
    }

    const sql = `
      UPDATE products AS p
      SET blurhash = v.blurhash
      FROM (VALUES ${values.join(', ')}) AS v(id, blurhash)
      WHERE p.id = v.id
    `;

    await pool.query(sql, params);
    console.log(`Updated products ${i + 1} to ${Math.min(i + BATCH_SIZE, all.length)} / ${all.length}`);
  }

  console.log('Done populating all product BlurHashes!');
  pool.end();
}
run();
