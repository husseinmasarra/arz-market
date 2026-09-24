/**
 * ArzMart Catalog Reformation & Enhancement Engine (Ultra-Fast Batch Mode)
 */

const db = require('./src/config/db.js');

// 1. Master Categories Structure
const MASTER_CATEGORIES = [
  // Top Level Categories
  { id: 101, name_ar: 'الهواتف والأجهزة اللوحية', name_en: 'Smartphones & Tablets', parent_id: null, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80' },
  { id: 102, name_ar: 'الشواحن وبنوك الطاقة والكيابل', name_en: 'Power & Charging', parent_id: null, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80' },
  { id: 103, name_ar: 'السماعات ومكبرات الصوت', name_en: 'Audio & Headphones', parent_id: null, sort_order: 3, image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80' },
  { id: 104, name_ar: 'الساعات الذكية والأجهزة القابلة للارتداء', name_en: 'Smartwatches & Wearables', parent_id: null, sort_order: 4, image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' },
  { id: 105, name_ar: 'الكفرات وحماية الشاشات', name_en: 'Cases & Screen Protectors', parent_id: null, sort_order: 5, image_url: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80' },
  { id: 106, name_ar: 'مستلزمات وإلكترونيات السيارات', name_en: 'Car Accessories', parent_id: null, sort_order: 6, image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80' },
  { id: 107, name_ar: 'الكمبيوتر والتخزين وملحقات الألعاب', name_en: 'Computing & Gaming', parent_id: null, sort_order: 7, image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80' },
  { id: 108, name_ar: 'المنزل الذكي والإلكترونيات الحديثة', name_en: 'Smart Home & Gadgets', parent_id: null, sort_order: 8, image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80' },
  { id: 109, name_ar: 'العناية الشخصية والأجهزة الصحية', name_en: 'Personal Care & Wellness', parent_id: null, sort_order: 9, image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80' },
  { id: 110, name_ar: 'أدوات الصيانة والمعدات', name_en: 'Tools & Workshop Equipment', parent_id: null, sort_order: 10, image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80' },

  // Subcategories - Charging & Power (102)
  { id: 201, name_ar: 'شواحن جدارية ومنزلية سريعة', name_en: 'Wall Chargers & Fast Adapters', parent_id: 102, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=500&q=80' },
  { id: 202, name_ar: 'كوابل شحن ونقل بيانات', name_en: 'Charging & Data Cables', parent_id: 102, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=500&q=80' },
  { id: 203, name_ar: 'بنوك طاقة وبطاريات متنقلة', name_en: 'Power Banks & Portable Batteries', parent_id: 102, sort_order: 3, image_url: 'https://images.unsplash.com/photo-1609592424368-245c1106e235?auto=format&fit=crop&w=500&q=80' },
  { id: 204, name_ar: 'شواحن لاسلكية وماج سيف', name_en: 'Wireless & MagSafe Chargers', parent_id: 102, sort_order: 4, image_url: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?auto=format&fit=crop&w=500&q=80' },

  // Subcategories - Audio (103)
  { id: 301, name_ar: 'سماعات بلوتوث لاسلكية (إيربودز)', name_en: 'TWS Wireless Earbuds', parent_id: 103, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=500&q=80' },
  { id: 302, name_ar: 'سماعات رأس كلاسيكية ومحيطية', name_en: 'Over-Ear Headphones', parent_id: 103, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80' },
  { id: 303, name_ar: 'سماعات أذن سلكية (Type-C / 3.5mm / Lightning)', name_en: 'Wired In-Ear Earphones', parent_id: 103, sort_order: 3, image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=500&q=80' },
  { id: 304, name_ar: 'مكبرات صوت سبيكرات بلوتوث', name_en: 'Bluetooth Speakers', parent_id: 103, sort_order: 4, image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80' },

  // Subcategories - Smartwatches (104)
  { id: 401, name_ar: 'ساعات ذكية وأساور رياضية', name_en: 'Smartwatches & Fitness Trackers', parent_id: 104, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80' },
  { id: 402, name_ar: 'أحزمة وإكسسوارات الساعات الذكية', name_en: 'Watch Straps & Accessories', parent_id: 104, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=500&q=80' },

  // Subcategories - Protection (105)
  { id: 501, name_ar: 'كفرات وأغطية حماية الهواتف', name_en: 'Phone Cases & Covers', parent_id: 105, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=500&q=80' },
  { id: 502, name_ar: 'لصقات حماية شاشة ضد الكسر واللقافة', name_en: 'Screen & Privacy Protectors', parent_id: 105, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=500&q=80' },
  { id: 503, name_ar: 'حماية عدسات الكاميرا الخلفية', name_en: 'Camera Lens Protectors', parent_id: 105, sort_order: 3, image_url: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=500&q=80' },

  // Subcategories - Car Accessories (106)
  { id: 601, name_ar: 'حوامل وقواعد الهواتف للسيارة', name_en: 'Car Phone Mounts & Holders', parent_id: 106, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=500&q=80' },
  { id: 602, name_ar: 'شواحن سيارة سريعة وأجهزة FM بلوتوث', name_en: 'Car Chargers & FM Transmitters', parent_id: 106, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=500&q=80' },

  // Subcategories - Computing & Storage (107)
  { id: 701, name_ar: 'فلاشات وبطاقات ذاكرة تخزين', name_en: 'Flash Drives & MicroSD Cards', parent_id: 107, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=500&q=80' },
  { id: 702, name_ar: 'ماوسات ولوحات مفاتيح وملحقات', name_en: 'Mouse, Keyboards & Hubs', parent_id: 107, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=500&q=80' },
  { id: 703, name_ar: 'أذرع وملحقات ألعاب الفيديو', name_en: 'Gaming Controllers & Triggers', parent_id: 107, sort_order: 3, image_url: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=500&q=80' },

  // Subcategories - Smart Home & Gadgets (108)
  { id: 801, name_ar: 'إضاءات ذكية ورينغ لايت وليدات', name_en: 'Ring Lights & Smart Lamps', parent_id: 108, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=500&q=80' },
  { id: 802, name_ar: 'فواحات ومرطبات جو عطرية', name_en: 'Aroma Diffusers & Humidifiers', parent_id: 108, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=500&q=80' },
  { id: 803, name_ar: 'مراوح ومنافخ تنظيف إلكترونية', name_en: 'Mini Fans & Air Blowers', parent_id: 108, sort_order: 3, image_url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=500&q=80' },
  { id: 804, name_ar: 'موازين ذكية وأجهزة منزلية صغيرة', name_en: 'Smart Scales & Mini Appliances', parent_id: 108, sort_order: 4, image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80' },

  // Subcategories - Personal Care (109)
  { id: 901, name_ar: 'ماكينات حلاقة وتشذيب الشعر', name_en: 'Hair Trimmers & Shavers', parent_id: 109, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=500&q=80' },
  { id: 902, name_ar: 'فراشي أسنان كهربائية ذكية', name_en: 'Electric Toothbrushes', parent_id: 109, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1559591937-e1032b49520a?auto=format&fit=crop&w=500&q=80' },
  { id: 903, name_ar: 'أجهزة تدليك ومساج واسترخاء', name_en: 'Massage Guns & Relax Devices', parent_id: 109, sort_order: 3, image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=500&q=80' },

  // Subcategories - Tools (110)
  { id: 1001, name_ar: 'مفكات ومجموعات أدوات صيانة دقيقة', name_en: 'Precision Screwdriver Toolkits', parent_id: 110, sort_order: 1, image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80' },
  { id: 1002, name_ar: 'أجهزة فحص وكاويات لحام ومعدات ورش', name_en: 'Soldering & Workshop Equipment', parent_id: 110, sort_order: 2, image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=500&q=80' }
];

// Brand Normalization Map
const BRAND_MAP = {
  'apple': { ar: 'آبل Apple', en: 'Apple' },
  'samsung': { ar: 'سامسونج Samsung', en: 'Samsung' },
  'xiaomi': { ar: 'شاومي Xiaomi', en: 'Xiaomi' },
  'xo': { ar: 'إكس أو XO', en: 'XO' },
  'joyroom': { ar: 'جويروم Joyroom', en: 'Joyroom' },
  'hoco': { ar: 'هوكو Hoco', en: 'Hoco' },
  'baseus': { ar: 'بيسوس Baseus', en: 'Baseus' },
  'remax': { ar: 'ريماكس Remax', en: 'Remax' },
  'anker': { ar: 'أنكر Anker', en: 'Anker' },
  'jbl': { ar: 'جي بي إل JBL', en: 'JBL' },
  'yesido': { ar: 'يسيدو Yesido', en: 'Yesido' },
  'moxom': { ar: 'موكسوم Moxom', en: 'Moxom' },
  'wiwu': { ar: 'ويوو WiWU', en: 'WiWU' },
  'ldnio': { ar: 'لدنيو LDNIO', en: 'LDNIO' },
  'vidvie': { ar: 'فيدفي Vidvie', en: 'Vidvie' },
  'green lion': { ar: 'جرين ليون Green Lion', en: 'Green Lion' },
  'borofone': { ar: 'بوروفون Borofone', en: 'Borofone' },
  'porodo': { ar: 'بورودو Porodo', en: 'Porodo' },
  'kaku': { ar: 'كاكو Kaku', en: 'Kaku' },
  'celebrat': { ar: 'سيليبرات Celebrat', en: 'Celebrat' },
  'usams': { ar: 'يوسامز USAMS', en: 'USAMS' },
  'bavin': { ar: 'بافين Bavin', en: 'Bavin' },
  'vgr': { ar: 'في جي آر VGR', en: 'VGR' },
  'dany': { ar: 'داني Dany', en: 'Dany' },
  'geemy': { ar: 'جيمي Geemy', en: 'Geemy' },
  'kemei': { ar: 'كيمي Kemei', en: 'Kemei' },
  'sandisk': { ar: 'سان ديسك SanDisk', en: 'SanDisk' },
  'kingston': { ar: 'كينغستون Kingston', en: 'Kingston' }
};

function analyzeProduct(title) {
  const tLower = (title || '').toLowerCase();

  let detectedBrand = null;
  for (const [key, val] of Object.entries(BRAND_MAP)) {
    if (tLower.includes(key)) {
      detectedBrand = val;
      break;
    }
  }

  let categoryId = 108;
  let typeAr = 'منتج إلكتروني ذكي';
  let typeEn = 'Smart Electronic Product';
  let specsAr = [];
  let specsEn = [];

  // 1. Cables
  if (tLower.includes('cable') || tLower.includes('cord') || tLower.includes('كابل') || tLower.includes('سلك')) {
    categoryId = 202;
    if (tLower.includes('type-c to type-c') || tLower.includes('type c to type c') || tLower.includes('c to c')) {
      typeAr = 'كابل شحن سريع Type-C إلى Type-C';
      typeEn = 'Type-C to Type-C Fast Charging Cable';
      specsAr.push('دعم تقنية الشحن فائق السرعة PD');
      specsEn.push('Supports PD Fast Charging');
    } else if (tLower.includes('type-c to ip') || tLower.includes('type c to ip') || tLower.includes('type-c to lightning') || tLower.includes('c to lightning')) {
      typeAr = 'كابل شحن سريع Type-C إلى آيفون Lightning';
      typeEn = 'Type-C to Lightning PD Fast Cable';
      specsAr.push('شحن سريع متوافق مع جميع أجهزة آبل آيفون');
      specsEn.push('Fast Charging compatible with Apple iPhone');
    } else if (tLower.includes('type-c') || tLower.includes('type c')) {
      typeAr = 'كابل شحن ونقل بيانات Type-C فائق السرعة';
      typeEn = 'Type-C Fast Charging & Data Cable';
    } else if (tLower.includes('lightning') || tLower.includes('ip') || tLower.includes('iphone')) {
      typeAr = 'كابل شحن ونقل بيانات للآيفون Lightning';
      typeEn = 'Lightning Charging & Sync Cable';
    } else if (tLower.includes('micro')) {
      typeAr = 'كابل شحن Micro-USB عالي الكفاءة';
      typeEn = 'Micro-USB High Durability Cable';
    } else {
      typeAr = 'كابل شحن ونقل بيانات متعدد الاستخدامات';
      typeEn = 'Universal Fast Charging & Data Cable';
    }

    if (tLower.includes('100w')) { specsAr.push('قدرة شحن هائلة تصل إلى 100 واط'); specsEn.push('Super 100W Power Delivery'); }
    else if (tLower.includes('60w') || tLower.includes('65w')) { specsAr.push('قدرة شحن سريعة 60 واط PD'); specsEn.push('Fast 60W Power Delivery'); }
    else if (tLower.includes('20w') || tLower.includes('27w') || tLower.includes('30w')) { specsAr.push('شحن سريع 20W - 30W'); specsEn.push('20W-30W Fast Charging'); }
    
    if (tLower.includes('2m') || tLower.includes('2 meter') || tLower.includes('2.0m')) { specsAr.push('طول عملي 2 متر'); specsEn.push('Length: 2 Meters'); }
    else if (tLower.includes('1.2m') || tLower.includes('1.2 meter')) { specsAr.push('طول مثالي 1.2 متر'); specsEn.push('Length: 1.2 Meters'); }
    else if (tLower.includes('1m') || tLower.includes('1 meter')) { specsAr.push('طول مريح 1 متر'); specsEn.push('Length: 1 Meter'); }
  }

  // 2. Wall Chargers & Adapters
  else if (tLower.includes('charger') || tLower.includes('adapter') || tLower.includes('شاحن') || tLower.includes('رأس شاحن') || tLower.includes('wall charger')) {
    if (tLower.includes('car') || tLower.includes('سيارة')) {
      categoryId = 602;
      typeAr = 'شاحن سيارة سريع مدمج';
      typeEn = 'Fast Car Charger Adapter';
      specsAr.push('متوافق مع ولاعة ومنافذ جميع أنواع السيارات');
      specsEn.push('Universal 12V-24V Car Cigarette Lighter Fit');
    } else if (tLower.includes('wireless') || tLower.includes('magsafe') || tLower.includes('لاسلكي')) {
      categoryId = 204;
      typeAr = 'شاحن مغناطيسي لاسلكي سريع بتقنية MagSafe';
      typeEn = 'Magnetic MagSafe Fast Wireless Charger';
      specsAr.push('تثبيت مغناطيسي محكم وشحن لاسلكي ذكي آمن');
      specsEn.push('Secure Magnetic Snap & Safe Wireless Fast Charging');
    } else {
      categoryId = 201;
      typeAr = 'شاحن جداري فائق السرعة';
      typeEn = 'Fast Wall Charger Power Adapter';
      if (tLower.includes('gan')) { specsAr.push('تقنية GaN المتقدمة لكفاءة شحن أعلى وحجم أصغر'); specsEn.push('Advanced GaN Fast Technology'); }
      if (tLower.includes('65w') || tLower.includes('67w')) { specsAr.push('قدرة شحن فائقة 65 واط للهواتف واللابتوبات'); specsEn.push('Ultra 65W Output for Phones & Laptops'); }
      else if (tLower.includes('45w')) { specsAr.push('قدرة شحن فائقة 45 واط تدعم شحن سامسونج فائق السرعة'); specsEn.push('45W Super Fast Charging 2.0'); }
      else if (tLower.includes('30w')) { specsAr.push('شحن سريع بقدرة 30 واط'); specsEn.push('30W PD Fast Charging'); }
      else if (tLower.includes('20w')) { specsAr.push('شحن سريع 20 واط مخصص لهواتف آيفون وسامسونج'); specsEn.push('20W PD Output Optimized for iPhone & Galaxy'); }
    }
  }

  // 3. Power Banks
  else if (tLower.includes('power bank') || tLower.includes('powerbank') || tLower.includes('بور بانك') || tLower.includes('بنك طاقة') || tLower.includes('بطارية متنقلة') || tLower.includes('power pack')) {
    categoryId = 203;
    typeAr = 'بنك طاقة وبطارية متنقلة سريعة';
    typeEn = 'Fast Charging Power Bank';
    if (tLower.includes('50000') || tLower.includes('50000mah') || tLower.includes('50,000')) { specsAr.push('سعة عملاقة 50,000 ميلي أمبير'); specsEn.push('Huge Capacity: 50,000mAh'); }
    else if (tLower.includes('30000') || tLower.includes('30000mah') || tLower.includes('30,000')) { specsAr.push('سعة هائلة 30,000 ميلي أمبير'); specsEn.push('High Capacity: 30,000mAh'); }
    else if (tLower.includes('20000') || tLower.includes('20000mah') || tLower.includes('20,000')) { specsAr.push('سعة كبيرة 20,000 ميلي أمبير'); specsEn.push('Large Capacity: 20,000mAh'); }
    else if (tLower.includes('10000') || tLower.includes('10000mah') || tLower.includes('10,000')) { specsAr.push('سعة مثالية ومدمجة 10,000 ميلي أمبير'); specsEn.push('Portable Capacity: 10,000mAh'); }
    
    if (tLower.includes('magsafe') || tLower.includes('magnetic') || tLower.includes('wireless')) {
      specsAr.push('يدعم الشحن اللاسلكي المغناطيسي MagSafe');
      specsEn.push('Supports Magnetic MagSafe Wireless Charging');
    }
    specsAr.push('منافذ إخراج متعددة للشحن السريع مع حماية ذكية من ارتفاع الحرارة');
    specsEn.push('Multi-port Fast Charging with MultiProtect Safety');
  }

  // 4. Earphones & Audio
  else if (tLower.includes('earphone') || tLower.includes('airpod') || tLower.includes('tws') || tLower.includes('headphone') || tLower.includes('headset') || tLower.includes('earbud') || tLower.includes('سماعة') || tLower.includes('سماعات') || tLower.includes('سبيكر') || tLower.includes('speaker') || tLower.includes('soundbar')) {
    if (tLower.includes('speaker') || tLower.includes('سبيكر') || tLower.includes('مكبر صوت') || tLower.includes('soundbar')) {
      categoryId = 304;
      typeAr = 'مكبر صوت سبيكر بلوتوث لاسلكي';
      typeEn = 'Portable Bluetooth Wireless Speaker';
      specsAr.push('صوت ستيريو نقي وقوي مع تقنية الباس المضخم (Deep Bass)');
      specsEn.push('Crystal Clear Stereo Sound with Deep Bass');
    } else if (tLower.includes('tws') || tLower.includes('wireless') || tLower.includes('bluetooth') || tLower.includes('airpod') || tLower.includes('earbud') || tLower.includes('لاسلكي')) {
      categoryId = 301;
      typeAr = 'سماعات أذن لاسلكية TWS بلوتوث';
      typeEn = 'TWS True Wireless Bluetooth Earbuds';
      specsAr.push('أحدث إصدار بلوتوث 5.3 لاتصال فائق السرعة والاستقرار');
      specsEn.push('Bluetooth 5.3 for Instant Auto-Pairing & Low Latency');
      if (tLower.includes('anc') || tLower.includes('noise')) {
        specsAr.push('تقنية إلغاء الضوضاء النشطة (ANC) لعزل الأصوات الخارجية');
        specsEn.push('Active Noise Cancellation (ANC) Technology');
      }
    } else if (tLower.includes('headphone') || tLower.includes('over ear') || tLower.includes('رأس')) {
      categoryId = 302;
      typeAr = 'سماعة رأس كلاسيكية مريحة مع مايك';
      typeEn = 'Over-Ear High Fidelity Headphones';
    } else {
      categoryId = 303;
      typeAr = 'سماعة أذن سلكية نقية مع ميكروفون';
      typeEn = 'Wired In-Ear Earphones with Microphone';
      if (tLower.includes('type-c') || tLower.includes('type c')) { specsAr.push('منفذ Type-C متوافق مع أحدث الهواتف الذكية'); specsEn.push('Digital Type-C Connector'); }
      else if (tLower.includes('lightning') || tLower.includes('ip')) { specsAr.push('منفذ Lightning لأجهزة آيفون وآيباد'); specsEn.push('Lightning Connector for Apple Devices'); }
      else { specsAr.push('منفذ صوت قياسي 3.5mm متوافق مع جميع الأجهزة'); specsEn.push('Standard 3.5mm Audio Jack'); }
    }
  }

  // 5. Smartwatches
  else if (tLower.includes('watch') || tLower.includes('smartwatch') || tLower.includes('ساعة') || tLower.includes('سوار') || tLower.includes('strap') || tLower.includes('band')) {
    if (tLower.includes('strap') || tLower.includes('قشاط') || tLower.includes('حزام') || tLower.includes('band')) {
      categoryId = 402;
      typeAr = 'حزام قشاط أنيق لساعة ذكية';
      typeEn = 'Premium Smartwatch Replacement Strap';
    } else {
      categoryId = 401;
      typeAr = 'ساعة ذكية رياضية متطورة';
      typeEn = 'Smartwatch & Fitness Tracker';
      specsAr.push('إجراء واستقبال المكالمات عبر البلوتوث وعرض الإشعارات');
      specsEn.push('Bluetooth Calling & Real-Time Push Notifications');
      specsAr.push('مراقبة نبضات القلب ومستوى الأكسجين وتتبع الأنشطة الرياضية');
      specsEn.push('Heart Rate, SpO2 & Multi-Sport Fitness Tracking');
    }
  }

  // 6. Car Accessories & Mounts
  else if (tLower.includes('holder') || tLower.includes('mount') || tLower.includes('stand') || tLower.includes('حامل') || tLower.includes('ستاند') || tLower.includes('قاعدة')) {
    if (tLower.includes('car') || tLower.includes('سيارة')) {
      categoryId = 601;
      typeAr = 'حامل هاتف مغناطيسي للسيارة فائق التثبيت';
      typeEn = 'Car Air Vent & Dashboard Phone Mount';
      specsAr.push('دوران 360 درجة لزاوية رؤية مثالية أثناء القيادة');
      specsEn.push('360 Degree Rotation for Best Driving Angle');
    } else {
      categoryId = 804;
      typeAr = 'قاعدة وستاند مكتبي قابل للتعديل للهواتف والأجهزة اللوحية';
      typeEn = 'Adjustable Desktop Stand for Phones & Tablets';
    }
  }

  // 7. Covers & Screen Protectors
  else if (tLower.includes('case') || tLower.includes('cover') || tLower.includes('كفر') || tLower.includes('غلاف') || tLower.includes('جراب')) {
    categoryId = 501;
    typeAr = 'كفر حماية فائق مقاوم للصدمات والخدوش';
    typeEn = 'Shockproof Protective Phone Case';
  } else if (tLower.includes('screen') || tLower.includes('glass') || tLower.includes('protector') || tLower.includes('لصقة') || tLower.includes('حماية شاشة') || tLower.includes('privacy')) {
    if (tLower.includes('lens') || tLower.includes('camera') || tLower.includes('عدسة')) {
      categoryId = 503;
      typeAr = 'حماية زجاجية مقواة لعدسات الكاميرا';
      typeEn = 'HD Camera Lens Tempered Glass Protector';
    } else {
      categoryId = 502;
      typeAr = 'لصقة حماية شاشة زجاجية ضد الكسر عالية الشفافية';
      typeEn = '9H Tempered Glass Screen Protector';
      if (tLower.includes('privacy') || tLower.includes('لقافة')) {
        specsAr.push('تقنية الخصوصية وحجب الرؤية الجانبية (Privacy)');
        specsEn.push('Anti-Spy Privacy Filter');
      }
    }
  }

  // 8. Flash Storage & Memory
  else if (tLower.includes('flash') || tLower.includes('usb') || tLower.includes('memory') || tLower.includes('sd') || tLower.includes('فلاش') || tLower.includes('ذاكرة')) {
    categoryId = 701;
    typeAr = 'فلاشة وذاكرة تخزين ونقل بيانات سريعة';
    typeEn = 'High Speed USB Flash Drive & Memory Card';
    specsAr.push('سرعة قراءة ونقل بيانات عالية، توافق شامل مع الكمبيوتر والهواتف');
    specsEn.push('High-Speed Read/Write Performance, Plug & Play');
  }

  // 9. Personal Care & Grooming
  else if (tLower.includes('trimmer') || tLower.includes('clipper') || tLower.includes('shaver') || tLower.includes('حلاقة') || tLower.includes('ماكينة')) {
    categoryId = 901;
    typeAr = 'ماكينة حلاقة وتشذيب رجالية دقيقة وقابلة لإعادة الشحن';
    typeEn = 'Rechargeable Cordless Hair Trimmer & Shaver';
  } else if (tLower.includes('toothbrush') || tLower.includes('فرشاة أسنان') || tLower.includes('اسنان')) {
    categoryId = 902;
    typeAr = 'فرشاة أسنان كهربائية ذكية صوتية';
    typeEn = 'Sonic Electric Toothbrush';
  } else if (tLower.includes('massage') || tLower.includes('مساج') || tLower.includes('تدليك')) {
    categoryId = 903;
    typeAr = 'جهاز مساج وتدليك العضلات الاحترافي';
    typeEn = 'Deep Tissue Muscle Massage Gun';
  }

  // 10. Smart Home & Gadgets
  else if (tLower.includes('diffuser') || tLower.includes('humidifier') || tLower.includes('فواحة') || tLower.includes('مرطب')) {
    categoryId = 802;
    typeAr = 'فواحة ومرطبة جو عطرية بالموجات فوق الصوتية مع إضاءة LED';
    typeEn = 'Ultrasonic Aroma Diffuser & Humidifier with LED';
  } else if (tLower.includes('fan') || tLower.includes('blower') || tLower.includes('مروحة') || tLower.includes('منفاخ')) {
    categoryId = 803;
    typeAr = 'مروحة ومنفاخ تنظيف إلكتروني محمول قوي';
    typeEn = 'Portable Rechargeable Mini Fan & Air Blower';
  } else if (tLower.includes('scale') || tLower.includes('ميزان')) {
    categoryId = 804;
    typeAr = 'ميزان إلكتروني ذكي ديجيتال عالي الدقة';
    typeEn = 'Smart Digital High Precision Body Scale';
  } else if (tLower.includes('light') || tLower.includes('lamp') || tLower.includes('ring') || tLower.includes('إضاءة') || tLower.includes('رينغ')) {
    categoryId = 801;
    typeAr = 'رينغ لايت وإضاءة استوديو تصوير احترافية';
    typeEn = 'Professional Ring Light & Smart Ambient Lamp';
  }

  // Clean Model & Title formatting
  let cleanModel = title
    .replace(/^([a-zA-Z0-9_\s-]+)\s*-\s*/, '')
    .replace(/wholesale|catalog|price list|high copy/gi, '')
    .trim();

  let brandNameAr = detectedBrand ? detectedBrand.ar : 'ماركة أصلية معتمدة';
  let brandNameEn = detectedBrand ? detectedBrand.en : 'Original';

  let nameAr = `${typeAr} ${cleanModel}`;
  if (detectedBrand && !nameAr.toLowerCase().includes(detectedBrand.en.toLowerCase())) {
    nameAr = `${typeAr} من ${detectedBrand.ar} (${cleanModel})`;
  }

  let nameEn = `${brandNameEn} - ${cleanModel}`;
  if (!nameEn.toLowerCase().includes(typeEn.toLowerCase().split(' ')[0])) {
    nameEn = `${brandNameEn} ${cleanModel} (${typeEn})`;
  }

  if (nameAr.length > 140) nameAr = nameAr.substring(0, 137) + '...';
  if (nameEn.length > 140) nameEn = nameEn.substring(0, 137) + '...';

  const defaultSpecsAr = [
    'منتج أصلي عالي الجودة ومطابق للمواصفات القياسية',
    'تصميم عملي وأنيق مريح للاستخدام اليومي',
    'ضمان تشغيلي واستبدال ضد العيوب المصنعية',
    'توصيل سريع لكافة المناطق اللبنانية مع خيار الدفع عند الاستلام (COD)'
  ];

  const defaultSpecsEn = [
    'Premium quality built with durable & certified materials',
    'Ergonomic, modern and compact design for daily use',
    'Warranty against manufacturing defects',
    'Fast nationwide delivery across Lebanon with Cash on Delivery (COD)'
  ];

  const allSpecsAr = [...specsAr, ...defaultSpecsAr];
  const allSpecsEn = [...specsEn, ...defaultSpecsEn];

  const descAr = `**${nameAr}**

تمتع بأداء استثنائي وتجربة استخدام فائقة مع هذا المنتج المتميز من ${brandNameAr}. صُمم بأحدث التقنيات ليوفر لك أعلى درجات الاعتمادية والراحة والأناقة في الاستخدام اليومي.

✨ **أبرز المميزات والمواصفات:**
${allSpecsAr.map(s => `• ${s}`).join('\n')}

📦 **جاهز للشحن الفوري:** توصيل سريع ومباشر إلى باب منزلك في جميع أنحاء لبنان مع الدفع عند الاستلام.`;

  const descEn = `**${nameEn}**

Experience outstanding performance and premium build quality with this product from ${brandNameEn}. Engineered with the latest technology for exceptional durability, efficiency, and comfort in daily use.

✨ **Key Features & Specifications:**
${allSpecsEn.map(s => `• ${s}`).join('\n')}

📦 **Fast Shipping:** Rapid nationwide delivery across all Lebanese regions with Cash on Delivery (COD) supported.`;

  return { nameAr, nameEn, descAr, descEn, categoryId };
}

async function runReformation() {
  console.log('🚀 [Fast Reformation Engine] Starting execution...');

  // Step 1: Insert Master Categories
  console.log('📁 [Step 1] Creating/Updating Master Categories...');
  for (const cat of MASTER_CATEGORIES) {
    await new Promise((resolve) => {
      const sql = `REPLACE INTO categories (id, name_ar, name_en, parent_id, image_url, active, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)`;
      db.run(sql, [cat.id, cat.name_ar, cat.name_en, cat.parent_id, cat.image_url, cat.sort_order], resolve);
    });
  }
  console.log(`✅ [Step 1] ${MASTER_CATEGORIES.length} Categories setup.`);

  // Step 2: Fetch Products
  const products = await new Promise((resolve) => {
    db.all('SELECT id, name_ar, name_en, cost_price_usd, price_usd FROM products', [], (err, rows) => {
      resolve(rows || []);
    });
  });

  console.log(`📦 [Step 2] Processing ${products.length} products in fast batch mode...`);

  // Batch process in chunks of 50
  const chunkSize = 50;
  let processed = 0;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    await new Promise((resolve) => {
      let remaining = chunk.length;
      if (remaining === 0) return resolve();

      chunk.forEach((p) => {
        const rawTitle = p.name_en || p.name_ar || `Item #${p.id}`;
        const analyzed = analyzeProduct(rawTitle);

        const updateSql = `UPDATE products SET name_ar = ?, name_en = ?, description_ar = ?, description_en = ?, category_id = ? WHERE id = ?`;
        db.run(updateSql, [analyzed.nameAr, analyzed.nameEn, analyzed.descAr, analyzed.descEn, analyzed.categoryId, p.id], () => {
          remaining--;
          processed++;
          if (remaining === 0) resolve();
        });
      });
    });
  }

  console.log(`🎉 [Step 2] Successfully updated ${processed} products with rich Arabic/English data.`);
  console.log('🌟 [Completed] Catalog is now 100% reformed!');
  process.exit(0);
}

runReformation().catch((e) => {
  console.error(e);
  process.exit(1);
});
