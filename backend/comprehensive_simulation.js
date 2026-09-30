const db = require('./src/config/db');

async function comprehensiveSimulation() {
  const products = await db.allAsync(`
    SELECT p.id, p.name_ar, p.name_en, p.description_ar, p.description_en, p.category_id, p.merchant_id, p.price_usd
    FROM products p
    ORDER BY p.id ASC
  `);

  console.log(`Auditing and categorizing ${products.length} products...`);

  const categoryNames = {
    17: 'سماعات أذن سلكية (Wired Earphones)',
    18: 'بطاريات متنقلة وشواحن سفري (Power Banks)',
    19: 'ماكينات حلاقة وعناية (Hair Trimmers)',
    20: 'حوامل وقواعد الهواتف واللابتوب (Holders & Stands)',
    21: 'منتجات ريزر للألعاب (Razer Gaming Gear)',
    22: 'سماعات ايربودز وبلوتوث (AirPods & TWS)',
    23: 'كاميرات مراقبة الأطفال (Baby Monitors)',
    24: 'كاميرات مراقبة ذكية IP (IP Cameras)',
    25: 'إضاءات ورينغ لايت وليدات تصوير وطاقة شمسية (Lights & Ringlights)',
    26: 'مكبرات صوت وسبيكرات بلوتوث (Bluetooth Speakers)',
    27: 'فراشي أسنان كهربائية ذكية (Smart Toothbrushes)',
    28: 'شواحن وكابلات توصيل سريعة (Fast Chargers & Cables)',
    29: 'أجهزة تدليك ومساج (Massage Machines)',
    31: 'ساعات ذكية وسوارات رياضية (Smart Watches & Bands)',
    32: 'سماعات واكسسوارات هايبر إكس (HyperX Gear)',
    33: 'أجهزة تشغيل بطاريات السيارات (Jump Starters)',
    34: 'حقائب وحوافظ أجهزة ذكية (Device Bags & Sleeves)',
    35: 'ألعاب إلكترونية ومبتكرة (Toys & Games)',
    36: 'أجهزة عرض بروجيكتور سينمائية (Projectors)',
    37: 'أقلام ذكية وشاشات لمس (Stylus Pens)',
    38: 'موازين ذكية ديجيتال (Smart Scales)',
    39: 'مايكروفونات احترافية وبودكاست (Microphones)',
    40: 'مراوح ومنافخ تنظيف إلكترونية (Fans & Blowers)',
    41: 'وصلات وشواحن ومحولات سيارة (Car Chargers, FM & Inverters)',
    43: 'شاشات كمبيوتر وألعاب (Monitors)',
    44: 'أجهزة ألعاب كلاسيكية ريترو (Retro Game Consoles)',
    45: 'كفرات وأغطية حماية (Covers & Cases)',
    46: 'لوحات مفاتيح وماوسات ألعاب (Keyboards & Mice)',
    47: 'إكسسوارات جيمنج ومسكات تحكم (Gaming Accessories)',
    48: 'ماكينات تحضير القهوة والشاي (Coffee Makers)',
    49: 'محولات ومنافذ Type-C و HDMI وقارئات (Hubs & Adapters)',
    50: 'أجهزة تتبع وحماية ذكية (Airtags & Trackers)',
    51: 'كاميرات تصوير رقمية وأكشن وداش كام (Action, Digital & Dash Cams)',
    52: 'فلاشات وبطاقات ووسائط تخزين SSD و HDD (Storage & Memory)',
    53: 'ترايبود ومثبتات تصوير جيمبال (Gimbals & Tripods)',
    54: 'أجهزة تي في بوكس وستيك ذكية (TV Boxes & Sticks)',
    55: 'خزائن أمان إلكترونية (Safe Boxes)',
    56: 'مبردات هواتف وأجهزة ألعاب (Phone Coolers)',
    57: 'مشتركات وأفياش كهرباء ذكية (Smart Sockets & Strips)',
    58: 'كراسي ألعاب مريحة (Gaming Chairs)',
    59: 'سحبات وأجهزة فيب وملحقاتها (Vape & E-Cigarettes)',
    60: 'سماعات رأس محيطية (Over-Ear Headphones)',
    61: 'كابلات ووصلات صوت AUX (Audio AUX Cables)',
    62: 'لصقات حماية شاشة ضد الكسر وعدسات (Screen & Lens Protectors)',
    63: 'أجهزة شبكات ومقويات واي فاي ومودم (Routers & Networking)',
    64: 'أجهزة تابلت ولوحية (Tablets & Pads)',
    65: 'فواحات ومعطرات جو وبودي سبلاش وسيارات (Diffusers, Mists & Air Fresheners)',
    66: 'خلاطات وعصارات فواكه محمولة (Blenders & Juicers)',
    71: 'أدوات صيانة وقطع إلكترونية وموديول (Electronics & Modules)',
    74: 'أدوات وكاويات ومحطات لحام وقصدير (Soldering Tools & Solder)',
    75: 'ميكروسكوبات وأجهزة فحص وملتيميتر (Microscopes & Multimeters)',
    76: 'مواد لاصقة وأشرطة عزل حراري (Adhesives & Heat Tapes)',
    77: 'مفكات وملاقط وأدوات فك يدوية (Screwdrivers & Hand Tools)',
    78: 'أجهزة ومعدات صيانة الشاشات (Screen Repair Tools)',
    89: 'مستلزمات مدرسية ومكتبية (School & Office Supplies)',
    91: 'مستلزمات الحفلات والمناسبات (Party Supplies)',
    92: 'مستلزمات العناية والنظافة المنزلية (Household Cleaning & Care)',
    93: 'ديكور منزلي وأثاث وإضاءة (Home Decor & Living)',
    95: 'رياضة ولياقة بدنية (Sports & Fitness)',
    96: 'مستلزمات الصيف والرحلات (Summer & Outdoor)',
    97: 'أكواب ومجات وترامس وفناجين (Mugs & Drinkware)',
    98: 'طناجر ومقالي وصواني طهي وشواء (Cookware, Pots, Pans & Baking)',
    99: 'أجهزة ومعدات المطبخ الكهربائية (Kitchen Appliances)',
    100: 'سكاكين وأدوات تقطيع وملاعق (Knives, Cutlery & Kitchen Tools)',
    101: 'صحون وجاطات وبورسلان ضيافة (Plates, Bowls & Tableware)',
    102: 'منظمات وحوافظ طعام وتخزين (Food Storage & Organizers)',
    114: 'عطور فرنسية وعالمية فاخرة (French & International Perfumes)',
    115: 'عطور شرقية وعربية وبخور (Arabic & Oriental Perfumes)',
    116: 'عناية بالبشرة وسيرومات كورية وفرنسية (Skincare & Serums)',
    117: 'مكياج الوجه والعيون والشفاه (Makeup)',
    118: 'أقنعة وماسكات الوجه (Face Masks)',
    119: 'شامبو وعناية بالشعر (Hair Care & Shampoo)',
    120: 'لوشن ومرطبات وغسول الجسم (Body Lotions & Washes)',
    121: 'مزيلات عرق ورول أون (Deodorants & Roll-on)',
    122: 'عناية بالفم والأسنان (Oral & Dental Care)'
  };

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

    // 3. BEAUTY & SKINCARE
    if (/سيروم|كريم وجه|غسول وجه|تونر|واقي شمس|ترطيب|بشرة|sunscreen|serum|toner|cleanser|moisturizer|retinol|hyaluronic|anua|cosrx|beauty of joseon|the ordinary|skin1004|bioderma|cerave|la roche|sun cream|anti-aging|snail mucin|centella|salicylic/i.test(title)) {
      return 116;
    }
    if (/ماسك|قناع|sheet mask|face mask|peeling mask|collagen mask/i.test(title)) {
      return 118;
    }
    if (/مكياج|أحمر شفاه|روج|مسكرة|كحل|ايلاينر|بودرة|فاونديشن|كونسيلر|ظل عيون|تنت|blush|makeup|lipstick|lip gloss|mascara|eyeliner|foundation|concealer|palette|eyebrow/i.test(title)) {
      return 117;
    }
    if (/شامبو|بلسم|زيت شعر|ماسك شعر|سيروم شعر|كيراتين|تساقط شعر|صبغة شعر|shampoo|conditioner|hair oil|hair mask|hair care|hair serum|hair dye/i.test(title)) {
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
    if (/dash cam|dashcam|كاميرا سيارة|كاميرا مراقبة سيارة/i.test(title)) return 41; // Car dash cams
    if (/ip camera|كاميرا مراقبة|كاميرات مراقبة|security camera/i.test(title)) return 24; // IP Cameras
    if (/baby monitor|مراقبة الأطفال/i.test(title)) return 23; // Baby Monitor
    if (/instax|fuji film|gopro|go pro|sport cam|action cam|digital camera|كاميرا رقمية|كاميرا فورية|كاميرا اكشن|webcam|web cam/i.test(title)) return 51; // Action & Digital Cameras
    if (/dji|osmo|gimbal|tripod|ترايبود|جيمبال|مثبت تصوير|selfie stick|snapgrip|shutter.*grip/i.test(title)) return 53; // Gimbals & Tripods
    if (/ring light|ringlight|camera light|رينغ لايت|إضاءة تصوير|لمبة تصوير|softbox|solar lamp|solar light|bulbo solar|إضاءة شمسية|كشاف/i.test(title)) return 25; // Lights

    // 6. STORAGE & MEMORY
    if (/sandisk|kingstone|lexar|ssd|portable ssd|nvme|hdd|hard drive|hard disk|micro sd|sdxc|memory card|flash drive|بطاقة ذاكرة|فلاش ميموري|فلاشة|ميموري كارد/i.test(title)) return 52; // Storage & Memory

    // 7. NETWORKING
    if (/tp-link|mercusys|cudy|router|mesh wifi|wifi extender|wifi adapter|modem|4g lte|5g.*modem|mobile wifi|راوتر|مقوي واي فاي|أجهزة شبكات|مقوي شبكة/i.test(title)) return 63; // Networking

    // 8. TV BOXES & STREAMING
    if (/tv stick|tv box|streaming stick|dongle.*screen|تي في بوكس|سمارت ستيك|watch tv/i.test(title)) return 54; // TV Box

    // 9. POWER & CHARGING
    if (/power bank|powerbank|باور بانك|بنك طاقة|بطارية متنقلة|magsafe battery/i.test(title)) return 18; // Power Bank
    if (/jump starter|جامب ستارتر|مشغل بطارية سيارة/i.test(title)) return 33; // Jump Starter
    if (/car charger|شاحن سيارة|ولاعة سيارة|fm transmitter|inverter car|محول سيارة/i.test(title)) return 41; // Car Chargers & FM
    if (/شاحن|رأس شاحن|شاحن جداري|شاحن سريع|شاحن لاسلكي|كابل|كيبل|سلك شحن|wall charger|fast charger|charging cable|usb cable|type-c cable|lightning cable|gan charger|pd charger|magnetic wireless charge/i.test(title)) return 28; // Charge & Cable

    // 10. PHONE CASES, PROTECTORS, HOLDERS, COOLERS, ADAPTERS
    if (/كفر|جراب|case|cover/i.test(title) && !/airpod|earbud|airtag|pencil/i.test(title)) return 45; // Cover
    if (/screen protector|glass protector|tempered glass|lens camera|rebull glass|og glass|back film|حامي شاشة|لصقة حماية|حماية شاشة/i.test(title)) return 62; // Screen Protector
    if (/حامل|ستاند|قاعدة|holder|stand|mount|desk stand|laptop stand|jmary.*stand|geatix/i.test(title)) return 20; // Holder & Stand
    if (/phone cooler|cooler pad|cooling radiator|مبرد هاتف|مروحة تبريد/i.test(title)) return 56; // Phone Cooler
    if (/airtag|ايتاج|أجهزة تتبع/i.test(title)) return 50; // Airtag
    if (/adapter|converter|card reader|hdmi.*transmitter|محول|وصلة type-c|قارئ بطاقات/i.test(title) && !/soldering|module|pcb/i.test(title)) return 49; // Converters & Hubs

    // 11. AUDIO
    if (/airpods|earbuds|tws|سماعات بلوتوث|سماعة بلوتوث|سماعات لاسلكية/i.test(title)) return 22; // Airpods
    if (/headphones|headset|over-ear|سماعة رأس|سماعات محيطية/i.test(title)) return 60; // Headphones
    if (/wired earphone|in-ear earphone|سماعة سلكية|سماعات أذن سلكية/i.test(title)) return 17; // Wired Earphones
    if (/speaker|soundbar|سبيكر|مكبر صوت/i.test(title)) return 26; // Speaker
    if (/microphone|mic|مايك|ميكروفون/i.test(title)) return 39; // Microphone
    if (/aux cable|وصلة aux|كابل aux/i.test(title)) return 61; // AUX

    // 12. SMART WATCHES & TABLETS
    if (/smart watch|smartwatch|smart band|ساعة ذكية|سوار ذكي|galaxy watch|apple watch|xiaomi.*band/i.test(title)) return 31; // Smart Watch
    if (/tablet|ipad|تابلت|لوحي/i.test(title)) return 64; // Tablet
    if (/stylus|touch pen|قلم لمس|قلم ايباد|green lion.*pencil/i.test(title)) return 37; // Pen

    // 13. COMPUTING
    if (/monitor|شاشة كمبيوتر|شاشة ألعاب/i.test(title)) return 43; // Monitor
    if (/thermal printer|mobile printer|طابعة فواتير|طابعة حرارية|xprinter/i.test(title)) return 89; // Office & Printer

    // 14. GAMING
    if (/keyboard|mouse|كيبورد|ماوس|لوحة مفاتيح|فأرة/i.test(title)) return 46; // Keyboards & Mice
    if (/controller|gamepad|joystick|finger sleeves|يد تحكم|مسكة ألعاب/i.test(title)) return 47; // Gaming Accessories
    if (/retro game|arcade|جهاز ألعاب كلاسيكي|ريترو/i.test(title)) return 44; // Retro
    if (/gaming chair|gaming seat|كرسي ألعاب|كرسي جيمنج/i.test(title)) return 58; // Gaming Chair
    if (/toys|labubu|doll|puzzle|slime|لعبة أطفال|العاب أطفال/i.test(title)) return 35; // Toys

    // 15. KITCHEN & DINING
    if (/طنجرة|مقلاة|صينية فرن|قلاية|طقم طناجر|قالب كيك|شواية|منقل فحم|bbq|cookware|frying pan|pot|oven tray|baking pan|grill|pan|muller koch/i.test(title)) return 98; // Cookware
    if (/coffee maker|ماكينة قهوة|إبريق قهوة/i.test(title)) return 48; // Coffee
    if (/blender|juicer|خلاط|عصارة/i.test(title)) return 66; // Blender
    if (/طباخ|فرن|قلاية هوائية|air fryer|cooker|toaster|عجانة/i.test(title)) return 99; // Kitchen Appliances
    if (/سكين|سكاكين|ملعقة|شوكة|مغرفة|مقص مطبخ|لوح تقطيع|knife|knives|cutlery|spoon|fork|cutting board/i.test(title)) return 100; // Knives & Cutlery
    if (/كوب|مج|ترمس|فنجان|مطارة|قنينة|mug|cup|thermos|water bottle|tumbler|bottle|pitcher/i.test(title)) return 97; // Cups & Mugs
    if (/صحن|جاط|زبادي|سلطانية|بورسلان|أطباق ضيافة|plate|bowl|platter/i.test(title)) return 101; // Plates & Bowls
    if (/حافظة طعام|منظم بهارات|مطربان|لانش بوكس|علب تخزين|بخاخ زيت|ثقالة ورق عنب|ورق لف|food container|lunch box|spice rack|storage box|oil sprayer/i.test(title)) return 102; // Storage

    // 16. WORKSHOP & REPAIR
    if (/soldering|solder|welding|كاوية|لحام|قصدير|هوت اير/i.test(title)) return 74; // Soldering
    if (/microscope|multimeter|tester|probe|ميكروسكوب|ملتيميتر|ساعة فحص/i.test(title)) return 75; // Testing & Microscopes
    if (/screwdriver|tweezer|opening tool|مفك|طقم مفكات|ملقط|أدوات فك/i.test(title)) return 77; // Hand tools
    if (/module|pcb|step-up|step-down|converter module|lithium battery charging module|18650|mc4/i.test(title)) return 71; // Modules & Components

    // 17. PERSONAL CARE & HEALTH
    if (/hair trimmer|shaver|clipper|ماكينة حلاقة|تشذيب/i.test(title)) return 19; // Hair Trimmer
    if (/massage|massager|مساج|تدليك/i.test(title)) return 29; // Massager
    if (/electric toothbrush|فرشاة أسنان كهربائية/i.test(title)) return 27; // Toothbrush
    if (/smart scale|body scale|ميزان ذكي|ميزان/i.test(title)) return 38; // Scale

    // 18. HOME & LIVING
    if (/fan|blower|مروحة|منفاخ/i.test(title)) return 40; // Fan & Blower
    if (/socket|smart plug|power strip|فيش|مقبس|مشترك/i.test(title)) return 57; // Socket
    if (/safe box|خزنة أمان/i.test(title)) return 55; // Safe Box
    if (/decor|curtain|cushion|molding|ديكور|ستارة|وسادة|كورنيش|أثاث/i.test(title)) return 93; // Home Decor
    if (/cleaning|gloves|disposable|قفازات|منظف|نظافة/i.test(title)) return 92; // Cleaning

    // 19. SPORTS & FITNESS
    if (/treadmill|resistance band|fitness|push up board|gym|رياضة|لياقة|حزام تمارين/i.test(title)) return 95; // Sports

    // 20. SCHOOL & OFFICE
    if (/school|pencil|pen|eraser|sharpener|drawing board|notebook|حقيبة مدرسية|مقلمة|تلوين|ممحاة|براية|مكتبية/i.test(title)) return 89; // School

    // 21. PARTY
    if (/party|balloon|candle|props|بالونات|حفلات|شمعة عيد ميلاد/i.test(title)) return 91; // Party

    // 22. VAPE
    if (/vape|pod|e-cigarette|سحبة|فيب/i.test(title)) return 59; // Vape

    // 23. SUMMER & OUTDOOR
    if (/summer|float|سباحة|مسبح|عوامة/i.test(title)) return 96; // Summer

    // If still unassigned and currently in 87 or 79 or 90, keep or place logically
    return p.category_id;
  }

  const finalCounts = {};
  let reclassified = 0;

  for (const p of products) {
    const target = classifyProduct(p);
    finalCounts[target] = (finalCounts[target] || 0) + 1;
    if (target !== p.category_id) {
      reclassified++;
    }
  }

  console.log(`\nReclassification Summary: ${reclassified} products will be moved to exact specialized categories.`);
  console.log('\nFinal product counts per category:');
  Object.keys(finalCounts).sort((a,b) => parseInt(a) - parseInt(b)).forEach(id => {
    console.log(`- Category [${id}] ${categoryNames[id] || 'Category ' + id}: ${finalCounts[id]} products`);
  });

  process.exit(0);
}

comprehensiveSimulation();
