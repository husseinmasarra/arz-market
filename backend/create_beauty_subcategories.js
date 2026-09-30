const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

const newSubcategories = [
  // Under Category 90: Beauty & Fragrances
  {
    name_ar: 'عطور فرنسية وعالمية فاخرة',
    name_en: 'French & International Fragrances',
    parent_id: 90,
    sort_order: 1,
    image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=85',
    code: 'fragrances_french'
  },
  {
    name_ar: 'عطور شرقية وعربية وبخور',
    name_en: 'Arabic & Oriental Perfumes',
    parent_id: 90,
    sort_order: 2,
    image_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=85',
    code: 'fragrances_arabic'
  },
  {
    name_ar: 'عناية بالبشرة وسيرومات كورية وفرنسية',
    name_en: 'Korean & French Skincare',
    parent_id: 90,
    sort_order: 3,
    image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=85',
    code: 'skincare_korean_french'
  },
  {
    name_ar: 'مكياج الوجه والعيون والشفاه',
    name_en: 'Face, Eyes & Lips Makeup',
    parent_id: 90,
    sort_order: 4,
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=85',
    code: 'makeup_cosmetics'
  },
  {
    name_ar: 'أقنعة وماسكات الوجه',
    name_en: 'Face Masks & Treatments',
    parent_id: 90,
    sort_order: 5,
    image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=85',
    code: 'face_masks'
  },

  // Under Category 85: Personal Care
  {
    name_ar: 'شامبو وعناية بالشعر',
    name_en: 'Hair Care & Shampoo',
    parent_id: 85,
    sort_order: 10,
    image_url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=85',
    code: 'hair_care'
  },
  {
    name_ar: 'لوشن ومرطبات وغسول الجسم',
    name_en: 'Body Lotions, Washes & Soaps',
    parent_id: 85,
    sort_order: 11,
    image_url: 'https://images.unsplash.com/photo-1608248597359-548455648834?auto=format&fit=crop&w=800&q=85',
    code: 'body_care'
  },
  {
    name_ar: 'مزيلات عرق ورول أون',
    name_en: 'Deodorants & Roll-on',
    parent_id: 85,
    sort_order: 12,
    image_url: 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?auto=format&fit=crop&w=800&q=85',
    code: 'deodorants'
  },
  {
    name_ar: 'عناية بالفم والأسنان',
    name_en: 'Oral & Dental Care',
    parent_id: 85,
    sort_order: 13,
    image_url: 'https://images.unsplash.com/photo-1559591937-e103282218fb?auto=format&fit=crop&w=800&q=85',
    code: 'dental_care'
  }
];

async function addSubcategories() {
  console.log('=== Adding / Updating Beauty & Personal Care Subcategories in PostgreSQL ===');
  
  for (const cat of newSubcategories) {
    const existing = await pool.query('SELECT id FROM categories WHERE name_en = $1 OR code = $2', [cat.name_en, cat.code]);
    if (existing.rows.length === 0) {
      const res = await pool.query(`
        INSERT INTO categories (name_ar, name_en, parent_id, sort_order, image_url, code, active)
        VALUES ($1, $2, $3, $4, $5, $6, 1)
        RETURNING id, name_ar, name_en
      `, [cat.name_ar, cat.name_en, cat.parent_id, cat.sort_order, cat.image_url, cat.code]);
      console.log(`+ Created: ID ${res.rows[0].id} -> ${res.rows[0].name_ar} (${res.rows[0].name_en})`);
    } else {
      await pool.query(`
        UPDATE categories 
        SET name_ar = $1, parent_id = $2, sort_order = $3, image_url = $4, code = $5, active = 1
        WHERE id = $6
      `, [cat.name_ar, cat.parent_id, cat.sort_order, cat.image_url, cat.code, existing.rows[0].id]);
      console.log(`✓ Updated: ID ${existing.rows[0].id} -> ${cat.name_ar}`);
    }
  }

  await pool.end();
}

addSubcategories().catch(console.error);
