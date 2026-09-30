const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://arzmart_db_user:mJ6iK7YbfltDcXqcHU8xHJ1kNml3flkM@dpg-damrvbrm8hqs73f4b85g-a.oregon-postgres.render.com/arzmart_db',
  ssl: { rejectUnauthorized: false }
});

const categoryImages = {
  // --- الأقسام الرئيسية (Main Categories) ---
  79: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1200&q=85', // هواتف وإكسسوارات
  80: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85', // ألعاب وجيمنج
  81: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85', // صوتيات وكاميرات
  82: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1200&q=85', // كمبيوتر وتقنية ذكية
  83: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=85', // ساعات وأجهزة ذكية
  84: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=85', // أدوات ومعدات الصيانة
  85: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85', // عناية شخصية وصحة
  86: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85', // مستلزمات سيارات
  87: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85', // المنزل والمطبخ الذكي
  88: 'https://images.unsplash.com/photo-1556911073-38141963c9e0?auto=format&fit=crop&w=1200&q=85', // لوازم وأدوات المطبخ
  89: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=85', // مستلزمات مدرسية ومكتبية
  90: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85', // منتجات التجميل والعناية
  91: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=85', // مستلزمات الحفلات والمناسبات
  92: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85', // مستلزمات العناية والنظافة
  93: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85', // ديكور منزلي وأثاث
  94: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=85', // العروض والتخفيضات الحصرية
  95: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=85', // رياضة ولياقة بدنية
  96: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85', // مستلزمات الصيف والرحلات
  59: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=1200&q=85', // سحبات وأجهزة فيب وملحقاتها

  // --- الأقسام الفرعية (Subcategories) ---
  21: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80', // منتجات ريزر للألعاب
  22: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80', // سماعات ايربودز وبلوتوث
  60: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80', // سماعات رأس محيطية
  17: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', // سماعات أذن سلكية
  19: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=800&q=80', // ماكينات حلاقة وعناية
  20: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=800&q=80', // حوامل وقواعد الهواتف
  28: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80', // شواحن وكابلات توصيل
  39: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80', // مايكروفونات احترافية
  98: 'https://images.unsplash.com/photo-1584990347449-399066601f7a?auto=format&fit=crop&w=800&q=80', // طناجر ومقالي وصواني طهي
  99: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80', // أجهزة ومعدات المطبخ
  100: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=800&q=80', // سكاكين وأدوات تقطيع
  97: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', // أكواب ومجات وفناجين
  101: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80', // صحون وجاطات وبورسلان
  102: 'https://images.unsplash.com/photo-1584990347466-9a259c4b7899?auto=format&fit=crop&w=800&q=80', // منظمات وحوافظ طعام
  48: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80', // ماكينات القهوة
  65: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80', // فواحات ومرطبات جو
  40: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80', // مراوح ومنافخ تنظيف
  66: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80', // خلاطات فواكه
  29: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80', // أجهزة تدليك ومساج
  27: 'https://images.unsplash.com/photo-1559591937-e10b14421b5b?auto=format&fit=crop&w=800&q=80', // فراشي أسنان كهربائية
  38: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80', // موازين ذكية
  24: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80', // كاميرات مراقبة ذكية
  36: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80', // بروجيكتورات
  43: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80', // شاشات كمبيوتر
  46: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80', // كيبوردات وماوسات
  47: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=800&q=80', // إكسسوارات جيمنج ومسكات
  31: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80', // ساعات ذكية
  64: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80', // تابلت ولوحية
  37: 'https://images.unsplash.com/photo-1585336261026-7f57a070f3f2?auto=format&fit=crop&w=800&q=80', // أقلام ذكية لمس
  62: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80', // لصقات حماية شاشة
  44: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80', // أجهزة ألعاب ريترو
  26: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80', // مكبرات صوت وسبيكرات
  25: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80', // إضاءات ورينغ لايت
  53: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80', // ترايبود ومثبتات جيمبال
  51: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80', // كاميرات تصوير رقمية
  61: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80', // كابلات صوت AUX
  49: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80', // محولات Type-C و HDMI
  57: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80', // مشتركات كهرباء ذكية
  33: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80', // أجهزة تشغيل بطاريات
  41: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80', // وصلات وشواحن سيارة
  63: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', // مقويات واي فاي وشبكات
  52: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80', // فلاشات وبطاقات ذاكرة
  54: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80'  // أجهزة تي في بوكس
};

async function main() {
  console.log('=== UPDATING ALL CATEGORY COVERS WITH HIGHLY RELEVANT IMAGES ===\n');

  let updatedCount = 0;
  for (const [id, imageUrl] of Object.entries(categoryImages)) {
    const res = await pool.query('UPDATE categories SET image_url = $1 WHERE id = $2 RETURNING name_ar', [imageUrl, id]);
    if (res.rows.length > 0) {
      console.log(`✓ [ID ${id}] ${res.rows[0].name_ar} -> Updated`);
      updatedCount++;
    }
  }

  console.log(`\n=== COMPLETED: Updated ${updatedCount} Category Images ===\n`);
  await pool.end();
}

main().catch(console.error);
