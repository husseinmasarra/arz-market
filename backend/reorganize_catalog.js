const db = require('./src/config/db');

async function reorganizeCatalog() {
  console.log('--- STARTING PROFESSIONAL CATALOG REORGANIZATION ---');

  // 1. Create or ensure "العطور والبخور / Perfumes & Fragrances" root category exists
  let perfumeRoot = await db.getAsync(`SELECT * FROM categories WHERE (code = 'perfumes_fragrances' OR name_en ILIKE '%perfume%' OR name_ar LIKE '%عطور%') AND parent_id IS NULL LIMIT 1`);
  if (!perfumeRoot) {
    const res = await db.runAsync(
      `INSERT INTO categories (name_ar, name_en, parent_id, image_url, active, sort_order, code) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'العطور والبخور الفاخرة',
        'Perfumes & Luxury Fragrances',
        null,
        'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85',
        1,
        1,
        'perfumes_fragrances'
      ]
    );
    const newId = res.lastID;
    perfumeRoot = await db.getAsync(`SELECT * FROM categories WHERE id = $1`, [newId]);
    console.log('Created Perfumes & Fragrances Root Category ID:', perfumeRoot.id);
  } else {
    await db.runAsync(
      `UPDATE categories SET name_ar = 'العطور والبخور الفاخرة', name_en = 'Perfumes & Luxury Fragrances', sort_order = 1, active = 1, image_url = 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85' WHERE id = $1`,
      [perfumeRoot.id]
    );
    console.log('Updated Perfumes Root Category ID:', perfumeRoot.id);
  }

  // Ensure 114 (French Perfumes), 115 (Arabic Perfumes) are children of perfumeRoot
  await db.runAsync(`UPDATE categories SET parent_id = $1, sort_order = 1 WHERE id = 114`, [perfumeRoot.id]);
  await db.runAsync(`UPDATE categories SET parent_id = $1, sort_order = 2 WHERE id = 115`, [perfumeRoot.id]);

  // Set Root categories sort orders and high quality images
  const rootOrder = [
    { id: perfumeRoot.id, ar: 'العطور والبخور الفاخرة', en: 'Perfumes & Luxury Fragrances', sort: 1, img: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85' },
    { id: 79, ar: 'هواتف وإكسسوارات', en: 'Phones & Accessories', sort: 2, img: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1200&q=85' },
    { id: 81, ar: 'صوتيات وكاميرات وتصوير', en: 'Audio, Media & Cameras', sort: 3, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=85' },
    { id: 80, ar: 'ألعاب وجيمنج', en: 'Gaming & Esports', sort: 4, img: 'https://images.unsplash.com/photo-1612287233207-6f815049b49f?auto=format&fit=crop&w=1200&q=85' },
    { id: 83, ar: 'ساعات وأجهزة ذكية', en: 'Smart Watches & Wearables', sort: 5, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85' },
    { id: 82, ar: 'كمبيوتر وتقنية وشبكات', en: 'Computing, Storage & Networking', sort: 6, img: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=1200&q=85' },
    { id: 90, ar: 'منتجات التجميل والمكياج', en: 'Beauty & Skincare', sort: 7, img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=85' },
    { id: 85, ar: 'عناية شخصية وصحة', en: 'Personal Care & Wellness', sort: 8, img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=85' },
    { id: 88, ar: 'لوازم وأدوات المطبخ', en: 'Kitchen Supplies & Dining', sort: 9, img: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85' },
    { id: 87, ar: 'المنزل والديكور والأجهزة', en: 'Smart Home & Living', sort: 10, img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85' },
    { id: 84, ar: 'أدوات ومعدات الصيانة', en: 'Repair & Workshop Tools', sort: 11, img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=85' },
    { id: 86, ar: 'مستلزمات سيارات', en: 'Car Accessories', sort: 12, img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85' },
    { id: 95, ar: 'رياضة ولياقة بدنية', en: 'Sports & Fitness', sort: 13, img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=85' },
    { id: 89, ar: 'مستلزمات مدرسية ومكتبية', en: 'School & Office Supplies', sort: 14, img: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=1200&q=85' },
    { id: 91, ar: 'مستلزمات الحفلات والمناسبات', en: 'Party & Celebration Supplies', sort: 15, img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=85' },
    { id: 93, ar: 'ديكور منزلي وأثاث', en: 'Home Decor & Living', sort: 16, img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85' },
    { id: 92, ar: 'مستلزمات العناية والنظافة', en: 'Care & Cleaning Supplies', sort: 17, img: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=1200&q=85' },
    { id: 59, ar: 'سحبات وأجهزة فيب وملحقاتها', en: 'Vape & E-Cigarettes', sort: 18, img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=85' }
  ];

  for (const r of rootOrder) {
    await db.runAsync(
      `UPDATE categories SET name_ar = $1, name_en = $2, sort_order = $3, image_url = $4, active = 1 WHERE id = $5`,
      [r.ar, r.en, r.sort, r.img, r.id]
    );
  }

  // Ensure subcategories are active
  await db.runAsync(`UPDATE categories SET active = 1 WHERE parent_id IS NOT NULL`);

  // Now classify all products
  const products = await db.allAsync(`
    SELECT p.id, p.name_ar, p.name_en, p.description_ar, p.description_en, p.category_id, p.merchant_id
    FROM products p
  `);

  console.log(`Processing ${products.length} products with strict classification rules...`);

  function classifyProduct(p) {
    const text = `${p.name_ar || ''} ${p.name_en || ''} ${p.description_ar || ''} ${p.description_en || ''}`.toLowerCase();
    const title = `${p.name_ar || ''} ${p.name_en || ''}`.toLowerCase();

    // 1. CAR AIR FRESHENERS & BODY SPLASH / DIFFUSERS
    if (/black odor|gulf orchid|body splash|body mist|بودي سبلاش|معطر جو|معطر سيارة|فواحة|مرطب جو|diffuser|humidifier|air freshener/i.test(title)) {
      return 65; // Diffusers & Air Fresheners
    }

    // 2. PERFUMES
    if (p.category_id === 114 || p.category_id === 115 || /عطر|بخور|عود|مسك|eau de parfum|eau de toilette|edp|edt|cologne|fragrance|perfume/i.test(title)) {
      if (/بخور|عود|مسك|شرقي|لطافة|أفنان|أرض الزعفران|lattafa|afnan|ard al zaafaran|oriental|arabian|mousuf|khamrah|asad|fursan|yara|raghba|dirham/i.test(text)) {
        return 115; // Arabic & Oriental Perfumes
      }
      return 114; // French & International Fragrances
    }

    // 3. BEAUTY & SKINCARE & HAIR
    if (/سيروم|كريم وجه|غسول وجه|تونر|واقي شمس|ترطيب|بشرة|sunscreen|serum|toner|cleanser|moisturizer|retinol|hyaluronic|anua|cosrx|beauty of joseon|the ordinary|skin1004|bioderma|cerave|la roche|sun cream|anti-aging|snail mucin|centella|salicylic/i.test(title)) {
      return 116;
    }
    if (/ماسك|قناع|sheet mask|face mask|peeling mask|collagen mask/i.test(title)) {
      return 118;
    }
    if (/مكياج|أحمر شفاه|روج|مسكرة|كحل|ايلاينر|بودرة|فاونديشن|كونسيلر|ظل عيون|تنت|رموش|eyelash|blush|makeup|lipstick|lip gloss|mascara|eyeliner|foundation|concealer|palette|eyebrow/i.test(title)) {
      return 117;
    }
    if (/شامبو|بلسم|زيت شعر|ماسك شعر|سيروم شعر|كيراتين|تساقط شعر|صبغة شعر|مجفف شعر|مكواة شعر|مملس شعر|hair dryer|hair straightener|hair curler|hair styler|hair comb|shampoo|conditioner|hair oil|hair mask|hair care|hair serum|hair dye/i.test(title)) {
      return 119;
    }
    if (/لوشن|غسول جسم|شاور جل|صابون|مرطب جسم|body lotion|body wash|shower gel|soap|dove|nivea|vaseline/i.test(title)) {
      return 120;
    }
    if (/مزيل عرق|رول اون|ديودورنت|ستيك عرق|deodorant|roll-on|roll on|antiperspirant/i.test(title)) {
      return 121;
    }
    if (/معجون أسنان|فرشاة أسنان|خيط أسنان|غسول فم|toothpaste|mouthwash|dental floss|teeth whitening/i.test(title) && !/كهربائية|electric|sonic/i.test(title)) {
      return 122;
    }

    // 4. RAZER & HYPERX
    if (/razer/i.test(title)) return 21;
    if (/hyperx/i.test(title)) return 32;

    // 5. CAMERAS, ACTION, DASH CAMS & PHOTOGRAPHY ACCESSORIES
    if (/dash cam|dashcam|كاميرا سيارة|كاميرا مراقبة سيارة/i.test(title)) return 41;
    if (/ip camera|كاميرا مراقبة|كاميرات مراقبة|security camera/i.test(title)) return 24;
    if (/baby monitor|مراقبة الأطفال/i.test(title)) return 23;
    if (/instax|fuji film|gopro|go pro|sport cam|action cam|digital camera|كاميرا رقمية|كاميرا فورية|كاميرا اكشن|webcam|web cam|camera.*light/i.test(title)) return 51;
    if (/dji|osmo|gimbal|tripod|ترايبود|جيمبال|مثبت تصوير|selfie stick|snapgrip|shutter.*grip|magnetic grip/i.test(title)) return 53;
    if (/ring light|ringlight|رينغ لايت|إضاءة تصوير|لمبة تصوير|softbox|solar lamp|solar light|bulbo solar|إضاءة شمسية|كشاف|night light|pat light|star light|astronaut/i.test(title)) return 25;

    // 6. STORAGE & MEMORY
    if (/sandisk|kingstone|lexar|ssd|portable ssd|nvme|hdd|hard drive|hard disk|micro sd|sdxc|memory card|flash drive|بطاقة ذاكرة|فلاش ميموري|فلاشة|ميموري كارد/i.test(title)) return 52;

    // 7. NETWORKING
    if (/tp-link|mercusys|cudy|router|mesh wifi|wifi extender|wifi adapter|modem|4g lte|5g.*modem|mobile wifi|wifi signal|راوتر|مقوي واي فاي|أجهزة شبكات|مقوي شبكة/i.test(title)) return 63;

    // 8. TV BOXES & STREAMING
    if (/tv stick|tv box|streaming stick|dongle.*screen|تي في بوكس|سمارت ستيك|watch tv/i.test(title)) return 54;

    // 9. POWER & CHARGING
    if (/power bank|powerbank|باور بانك|بنك طاقة|بطارية متنقلة|magsafe battery|travel kit combo/i.test(title)) return 18;
    if (/jump starter|جامب ستارتر|مشغل بطارية سيارة/i.test(title)) return 33;
    if (/car charger|شاحن سيارة|ولاعة سيارة|fm transmitter|inverter car|محول سيارة|water pressure washer|غسيل سيارات|car.*washer/i.test(title)) return 41;
    if (/شاحن|رأس شاحن|شاحن جداري|شاحن سريع|شاحن لاسلكي|كابل|كيبل|سلك شحن|wall charger|fast charger|charging cable|usb cable|type-c cable|lightning cable|gan charger|pd charger|magnetic wireless charge/i.test(title)) return 28;

    // 10. PHONE CASES, PROTECTORS, HOLDERS, COOLERS, ADAPTERS
    if (/كفر|جراب|case|cover/i.test(title) && !/airpod|earbud|airtag|pencil|tool/i.test(title)) return 45;
    if (/screen protector|glass protector|tempered glass|lens camera|rebull glass|og glass|back film|glass tab|حامي شاشة|لصقة حماية|حماية شاشة/i.test(title)) return 62;
    if (/حامل|ستاند|قاعدة|holder|stand|mount|desk stand|laptop stand|jmary.*stand|geatix/i.test(title)) return 20;
    if (/phone cooler|cooler pad|cooling radiator|مبرد هاتف|مروحة تبريد/i.test(title)) return 56;
    if (/airtag|ايتاج|أجهزة تتبع/i.test(title)) return 50;
    if (/adapter|converter|card reader|hdmi|usb-c hub|ethernet.*hub|splitter|محول|وصلة type-c|قارئ بطاقات|موزع/i.test(title) && !/soldering|module|pcb|power supply/i.test(title)) return 49;

    // 11. AUDIO
    if (/airpods|earbuds|tws|سماعات بلوتوث|سماعة بلوتوث|سماعات لاسلكية/i.test(title)) return 22;
    if (/headphones|headset|over-ear|سماعة رأس|سماعات محيطية/i.test(title)) return 60;
    if (/wired earphone|in-ear earphone|سماعة سلكية|سماعات أذن سلكية/i.test(title)) return 17;
    if (/speaker|soundbar|سبيكر|مكبر صوت/i.test(title)) return 26;
    if (/microphone|mic|مايك|ميكروفون/i.test(title)) return 39;
    if (/aux cable|وصلة aux|كابل aux/i.test(title)) return 61;

    // 12. SMART WATCHES & TABLETS & GLASSES
    if (/smart watch|smartwatch|smart band|ساعة ذكية|سوار ذكي|galaxy watch|apple watch|xiaomi.*band|kids watch|fitbit|whoop|calling watch|tasbih/i.test(title)) return 31;
    if (/tablet|ipad|تابلت|لوحي/i.test(title)) return 64;
    if (/stylus|touch pen|قلم لمس|قلم ايباد|green lion.*pencil/i.test(title)) return 37;

    // 13. COMPUTING & PRINTERS
    if (/monitor|شاشة كمبيوتر|شاشة ألعاب/i.test(title)) return 43;
    if (/thermal printer|mobile printer|laser printer|desktop printer|طابعة فواتير|طابعة حرارية|طابعة ليزر|xprinter|canon|hp.*printer|calculator|حاسبة/i.test(title)) return 89;

    // 14. GAMING
    if (/keyboard|mouse|كيبورد|ماوس|لوحة مفاتيح|فأرة/i.test(title)) return 46;
    if (/controller|gamepad|joystick|finger sleeve|racing.*wheel|steering wheel|dual sense|gaming combo|يد تحكم|مسكة ألعاب/i.test(title)) return 47;
    if (/retro game|arcade|game box|جهاز ألعاب كلاسيكي|ريترو/i.test(title)) return 44;
    if (/gaming chair|gaming seat|racing.*chair|كرسي ألعاب|كرسي جيمنج/i.test(title)) return 58;
    if (/toys|labubu|doll|puzzle|slime|robot|musical slide|boxing machine|fire bullets|لعبة أطفال|العاب أطفال/i.test(title)) return 35;

    // 15. KITCHEN & DINING
    if (/طنجرة|مقلاة|صينية فرن|قلاية|طقم طناجر|قالب كيك|شواية|منقل فحم|bbq|cookware|frying pan|pot|oven tray|baking pan|grill|pan|muller koch|شيش برك|tray set/i.test(title)) return 98;
    if (/coffee maker|ماكينة قهوة|إبريق قهوة|milk warmer|سخان حليب/i.test(title)) return 48;
    if (/blender|juicer|خلاط|عصارة/i.test(title)) return 66;
    if (/طباخ|فرن|قلاية هوائية|air fryer|cooker|toaster|عجانة|breakfast trio/i.test(title)) return 99;
    if (/سكين|سكاكين|ملعقة|شوكة|مغرفة|مقص مطبخ|لوح تقطيع|knife|knives|cutlery|spoon|fork|cutting board/i.test(title)) return 100;
    if (/كوب|مج|ترمس|فنجان|مطارة|قنينة|mug|cup|thermos|water bottle|tumbler|bottle|pitcher/i.test(title)) return 97;
    if (/صحن|جاط|زبادي|سلطانية|بورسلان|أطباق ضيافة|ashtray|منفضة|plate|bowl|platter/i.test(title)) return 101;
    if (/حافظة طعام|منظم بهارات|مطربان|لانش بوكس|علب تخزين|بخاخ زيت|ثقالة ورق عنب|ورق لف|أغطية طعام|صندوق ثلج|سلة تنظيم|food container|lunch box|spice rack|storage box|oil sprayer|ice box|storage container/i.test(title)) return 102;

    // 16. WORKSHOP & REPAIR
    if (/soldering|solder|welding|كاوية|لحام|قصدير|هوت اير|nozzle|rosin|power supply|bms|lithium battery|21700|18650|voltmeter|dc power plug/i.test(title)) return 74;
    if (/microscope|multimeter|tester|probe|zoyi|ميكروسكوب|ملتيميتر|ساعة فحص|جهاز فحص/i.test(title)) return 75;
    if (/screwdriver|tweezer|opening tool|plier|cutter|chainsaw|منشار|مفك|طقم مفكات|ملقط|أدوات فك|كماشة|قاطع/i.test(title)) return 77;
    if (/lcd.*repair|glue remover|غراء شاشات|شاشات صيانة|adhesive cutting/i.test(title)) return 78;
    if (/module|pcb|step-up|step-down|converter module|lithium battery charging module|mc4|electronics.*tools|cube setup|ic remover/i.test(title)) return 71;

    // 17. PERSONAL CARE & HEALTH
    if (/hair trimmer|shaver|clipper|ماكينة حلاقة|تشذيب/i.test(title)) return 19;
    if (/massage|massager|مساج|تدليك/i.test(title)) return 29;
    if (/electric toothbrush|فرشاة أسنان كهربائية/i.test(title)) return 27;
    if (/scale|ميزان/i.test(title)) return 38;

    // 18. HOME & LIVING
    if (/fan|blower|duster|مروحة|منفاخ|شفاط/i.test(title)) return 40;
    if (/socket|smart plug|power strip|power extension|وصلة كهرباء|فيش|مقبس|مشترك/i.test(title)) return 57;
    if (/safe box|خزنة أمان/i.test(title)) return 55;
    if (/decor|curtain|cushion|molding|garment steamer|lint remover|bed|ديكور|ستارة|وسادة|كورنيش|أثاث|مكواة بخار|مزيل وبر/i.test(title)) return 93;
    if (/cleaning|gloves|disposable|mosquito zapper|صاعق|قفازات|منظف|نظافة/i.test(title)) return 92;

    // 19. SPORTS & FITNESS
    if (/treadmill|resistance band|fitness|push up board|gym|cardio band|رياضة|لياقة|حزام تمارين/i.test(title)) return 95;

    // 20. SCHOOL & OFFICE
    if (/school|pencil|pen|eraser|sharpener|drawing board|notebook|folder|geometry|sheet protector|glue stick|paint marker|حقيبة مدرسية|مقلمة|تلوين|ممحاة|براية|مكتبية|ملف|أدوات هندسية/i.test(title)) return 89;

    // 21. PARTY
    if (/party|balloon|candle|props|glasses.*party|cocktail|بالونات|حفلات|شمعة عيد ميلاد/i.test(title)) return 91;

    // 22. VAPE
    if (/vape|pod|e-cigarette|سحبة|فيب/i.test(title)) return 59;

    // 23. SUMMER & OUTDOOR
    if (/summer|float|سباحة|مسبح|عوامة/i.test(title)) return 96;

    // 24. BAGS
    if (/back pack|backpack|شنطة|حقيبة/i.test(title)) return 34;

    return p.category_id;
  }

  let updatedCount = 0;
  for (const p of products) {
    const targetCatId = classifyProduct(p);
    if (targetCatId !== p.category_id) {
      await db.runAsync(`UPDATE products SET category_id = $1 WHERE id = $2`, [targetCatId, p.id]);
      updatedCount++;
    }
  }

  console.log(`✅ SUCCESS: Reclassified and updated ${updatedCount} products into precise, strict categories!`);

  // Clear cache if categoryController is cached
  try {
    const catCtrl = require('./src/controllers/categoryController');
    if (catCtrl.invalidateCategoriesCache) catCtrl.invalidateCategoriesCache();
  } catch(e) {}

  process.exit(0);
}

reorganizeCatalog().catch(e => {
  console.error(e);
  process.exit(1);
});
