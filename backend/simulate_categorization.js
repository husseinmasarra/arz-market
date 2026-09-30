const db = require('./src/config/db');

// Categorization Rules for all 3194 products
async function testCategorizationEngine() {
  const products = await db.allAsync(`
    SELECT p.id, p.name_ar, p.name_en, p.description_ar, p.description_en, p.category_id, p.merchant_id, p.price_usd
    FROM products p
    ORDER BY p.id ASC
  `);

  console.log(`Analyzing ${products.length} products...`);

  // Target categories map (category key -> target ID or definition)
  // We'll map keywords strictly in order of precedence:
  // 1. Perfumes & Fragrances
  // 2. Beauty & Skincare & Makeup & Hair & Body
  // 3. Mobile / Tech Accessories (Chargers, Cables, Power Banks, Cases, Protectors, Holders, Cooling, Adapters)
  // 4. Audio & Media (Airpods, Headphones, Wired Earphones, Speakers, Mics, Gimbals, Lights, Cameras)
  // 5. Gaming & Esports (Razer, HyperX, Keyboards, Mice, Retro consoles, Gaming accessories, Toys)
  // 6. Smart Watches & Wearables (Smart watches, Tablets, Pens)
  // 7. Computing & Tech (Monitors, Routers/Network, TV Boxes, Projectors, Flash/SSDs/Memory, Printers)
  // 8. Kitchen Supplies (Pots/Pans, Cookers/Appliances, Knives/Cutlery, Cups/Mugs/Drinkware, Plates/Bowls, Organizers)
  // 9. Repair & Workshop Tools (Soldering, Microscopes, Screwdrivers, LCD tools, Modules/Electronics)
  // 10. Car Accessories (FM/Car Chargers, Jump Starters, Car cleaning/holders)
  // 11. Personal Care (Hair trimmers, Massagers, Toothbrushes, Scales)
  // 12. Home & Living (Diffusers, Fans/Blowers, Sockets, Coffee makers, Blenders, Solar lights, Decor)
  // 13. Sports & Fitness
  // 14. School & Office
  // 15. Party & Celebrations
  // 16. Vape

  const assignments = {};
  let changed = 0;
  let unchanged = 0;

  for (const p of products) {
    const text = `${p.name_ar || ''} ${p.name_en || ''} ${p.description_ar || ''} ${p.description_en || ''}`.toLowerCase();
    const title = `${p.name_ar || ''} ${p.name_en || ''}`.toLowerCase();

    let targetCatId = p.category_id;
    let targetCatName = '';

    // --- RULE 1: PERFUMES & FRAGRANCES ---
    if (p.category_id === 114 || p.category_id === 115 || /عطر|بخور|عود|مسك|eau de parfum|eau de toilette|edp|edt|cologne|fragrance|perfume/i.test(title)) {
      if (/بخور|عود|مسك|شرقي|لطافة|أفنان|أرض الزعفران|lattafa|afnan|ard al zaafaran|oriental/i.test(text)) {
        targetCatId = 115; // Arabic & Oriental Perfumes
        targetCatName = 'عطور شرقية وعربية وبخور';
      } else if (/بودي سبلاش|معطر جسم|معطر جو|body splash|body mist|black odor|air freshener/i.test(text)) {
        targetCatId = 65; // Diffusers & Home/Body Fragrances
        targetCatName = 'فواحات ومعطرات';
      } else {
        targetCatId = 114; // French & International Fragrances
        targetCatName = 'عطور فرنسية وعالمية فاخرة';
      }
    }

    // --- RULE 2: BEAUTY & SKINCARE & BODY & HAIR ---
    else if (/سيروم|كريم وجه|غسول وجه|تونر|واقي شمس|ترطيب|بشرة|sunscreen|serum|toner|cleanser|moisturizer|retinol|hyaluronic|anua|cosrx|beauty of joseon|the ordinary|skin1004|bioderma|cerave|la roche/i.test(title)) {
      targetCatId = 116; // Skincare
      targetCatName = 'عناية بالبشرة وسيرومات كورية وفرنسية';
    }
    else if (/ماسك|قناع|sheet mask|face mask/i.test(title)) {
      targetCatId = 118; // Face Masks
      targetCatName = 'أقنعة وماسكات الوجه';
    }
    else if (/مكياج|أحمر شفاه|روج|مسكرة|كحل|ايلاينر|بودرة|فاونديشن|كونسيلر|ظل عيون|makeup|lipstick|lip gloss|mascara|eyeliner|foundation|concealer|blush/i.test(title)) {
      targetCatId = 117; // Makeup
      targetCatName = 'مكياج الوجه والعيون والشفاه';
    }
    else if (/شامبو|بلسم|زيت شعر|ماسك شعر|سيروم شعر|كيراتين|تساقط شعر|shampoo|conditioner|hair oil|hair mask|hair care/i.test(title)) {
      targetCatId = 119; // Hair Care & Shampoo
      targetCatName = 'شامبو وعناية بالشعر';
    }
    else if (/لوشن|غسول جسم|شاور جل|صابون|مرطب جسم|body lotion|body wash|shower gel|soap|dove|nivea|vaseline/i.test(title)) {
      targetCatId = 120; // Body Lotions, Washes & Soaps
      targetCatName = 'لوشن ومرطبات وغسول الجسم';
    }
    else if (/مزيل عرق|رول اون|ديودورنت|ستيك عرق|deodorant|roll-on|roll on|antiperspirant/i.test(title)) {
      targetCatId = 121; // Deodorants
      targetCatName = 'مزيلات عرق ورول أون';
    }
    else if (/معجون أسنان|فرشاة أسنان|خيط أسنان|غسول فم|toothpaste|mouthwash|dental floss/i.test(title) && !/كهربائية|electric|sonic/i.test(title)) {
      targetCatId = 122; // Oral Care
      targetCatName = 'عناية بالفم والأسنان';
    }

    // --- RULE 3: RAZER & HYPERX GAMING ---
    else if (/razer/i.test(title)) {
      targetCatId = 21; // Razer Gear
      targetCatName = 'منتجات ريزر للألعاب';
    }
    else if (/hyperx/i.test(title)) {
      targetCatId = 32; // HyperX Gear
      targetCatName = 'سماعات واكسسوارات هايبر إكس';
    }

    // --- RULE 4: MOBILE & TECH ACCESSORIES ---
    else if (/باور بانك|بنك طاقة|بطارية متنقلة|power bank|powerbank|magsafe battery/i.test(title)) {
      targetCatId = 18; // Power Bank
      targetCatName = 'بطاريات متنقلة وشواحن سفري';
    }
    else if (/شاحن جداري|رأس شاحن|شاحن سريع|شاحن لاسلكي|كابل|كيبل|سلك شحن|wall charger|fast charger|charging cable|usb cable|type-c cable|lightning cable|gan charger|pd charger/i.test(title) && !/car|سيارة/i.test(title)) {
      targetCatId = 28; // Charge & Cable
      targetCatName = 'شواحن وكابلات توصيل سريعة';
    }
    else if (/شاحن سيارة|ولاعة سيارة|fm transmitter|car charger|car mount|حامل سيارة/i.test(title)) {
      targetCatId = 41; // Car FM & Chargers
      targetCatName = 'وصلات وشواحن سيارة بلوتوث FM';
    }
    else if (/حامل هاتف|ستاند هاتف|قاعدة هاتف|حامل لابتوب|ستاند لابتوب|حامل ايباد|phone stand|laptop stand|tablet stand|desk holder|magnetic stand|jmary.*stand/i.test(title)) {
      targetCatId = 20; // Holder & Stand
      targetCatName = 'حوامل وقواعد الهواتف والسيارات';
    }
    else if (/كفر|غطاء حماية|جراب|case|cover|silicone case/i.test(title) && !/airpod|earbud|airtag/i.test(title)) {
      targetCatId = 45; // Cover
      targetCatName = 'كفرات وأغطية حماية';
    }
    else if (/لصقة حماية|حامي شاشة|سكرين بروتكتر|screen protector|glass protector|tempered glass/i.test(title)) {
      targetCatId = 62; // Screen Protector
      targetCatName = 'لصقات حماية شاشة ضد الكسر';
    }
    else if (/محول|وصلة type-c|منفذ hdmi|hub|adapter|otg|converter|card reader|قارئ بطاقات/i.test(title) && !/soldering|power supply/i.test(title)) {
      targetCatId = 49; // Converter & Hubs
      targetCatName = 'محولات ومنافذ Type-C و HDMI';
    }
    else if (/مبرد هاتف|مروحة تبريد هاتف|phone cooler|cooling radiator|phone fan/i.test(title)) {
      targetCatId = 56; // Cooling Radiator
      targetCatName = 'مبردات هواتف وأجهزة ألعاب';
    }
    else if (/airtag|ايتاج|أجهزة تتبع/i.test(title)) {
      targetCatId = 50; // Airtag
      targetCatName = 'أجهزة تتبع وحماية ذكية';
    }

    // --- RULE 5: AUDIO & MEDIA ---
    else if (/ايربودز|سماعة بلوتوث|سماعات لاسلكية|airpods|earbuds|tws|wireless earbuds/i.test(title)) {
      targetCatId = 22; // Airpods
      targetCatName = 'سماعات ايربودز وبلوتوث';
    }
    else if (/سماعة رأس|سماعات محيطية|headphones|headset|over-ear|on-ear/i.test(title)) {
      targetCatId = 60; // Headphones
      targetCatName = 'سماعات رأس محيطية';
    }
    else if (/سماعة سلكية|سماعات أذن سلكية|wired earphone|in-ear earphone|3.5mm earphone/i.test(title)) {
      targetCatId = 17; // Wired Earphones
      targetCatName = 'سماعات أذن سلكية';
    }
    else if (/سبيكر|مكبر صوت|بلوتوث سبيكر|speaker|soundbar|bluetooth speaker|jbl partybox/i.test(title)) {
      targetCatId = 26; // Speaker
      targetCatName = 'مكبرات صوت وسبيكرات بلوتوث';
    }
    else if (/مايك|مايكروفون|ميكروفون|microphone|mic/i.test(title)) {
      targetCatId = 39; // Microphone
      targetCatName = 'مايكروفونات احترافية وبودكاست';
    }
    else if (/ترايبود|ستاند تصوير|جيمبال|مثبت تصوير|tripod|gimbal|selfie stick/i.test(title)) {
      targetCatId = 53; // Tripod & Gimbal
      targetCatName = 'ترايبود ومثبتات تصوير جيمبال';
    }
    else if (/رينغ لايت|إضاءة تصوير|لمبة تصوير|ring light|ringlight|camera light|softbox/i.test(title)) {
      targetCatId = 25; // Light
      targetCatName = 'إضاءات ورينغ لايت وليدات';
    }
    else if (/كاميرا فورية|كاميرا اكشن|كاميرا رقمية|كاميرا تصوير|action camera|fuji film|instax|digital camera/i.test(title) && !/ip camera|مراقبة/i.test(title)) {
      targetCatId = 51; // Digital Camera
      targetCatName = 'كاميرات تصوير رقمية وأكشن';
    }

    // --- RULE 6: SMART WATCHES & TABLETS ---
    else if (/ساعة ذكية|سوار ذكي|سمارت ووتش|smart watch|smartwatch|smart band|galaxy watch|apple watch/i.test(title)) {
      targetCatId = 31; // Smart Watch
      targetCatName = 'ساعات ذكية وسوارات رياضية';
    }
    else if (/تابلت|ايباد|لوحي|tablet|ipad/i.test(title)) {
      targetCatId = 64; // Tablet
      targetCatName = 'أجهزة تابلت ولوحية';
    }
    else if (/قلم لمس|قلم ايباد|stylus pen|touch pen|drawing pen/i.test(title)) {
      targetCatId = 37; // Pen
      targetCatName = 'أقلام ذكية وشاشات لمس';
    }

    // --- RULE 7: COMPUTING & SMART TECH ---
    else if (/شاشة كمبيوتر|شاشة ألعاب|gaming monitor|pc monitor/i.test(title)) {
      targetCatId = 43; // Monitor
      targetCatName = 'شاشات كمبيوتر وألعاب';
    }
    else if (/راوتر|مقوي واي فاي|شبكة|أجهزة شبكات|router|wifi extender|access point|mesh wifi|mercusys/i.test(title)) {
      targetCatId = 63; // Network
      targetCatName = 'أجهزة شبكات ومقويات واي فاي';
    }
    else if (/تي في بوكس|tv box|smart tv stick|xiaomi mi box|apple tv/i.test(title)) {
      targetCatId = 54; // TV Box
      targetCatName = 'أجهزة تي في بوكس ذكية';
    }
    else if (/بروجيكتور|جهاز عرض|projector/i.test(title)) {
      targetCatId = 36; // Projector
      targetCatName = 'أجهزة عرض بروجيكتور سينمائية';
    }
    else if (/فلاشة|ميموري كارد|ذاكرة تخزين|ssd|hard drive|sandisk.*ssd|flash drive|memory card|sd card/i.test(title)) {
      targetCatId = 52; // Flash & Memory
      targetCatName = 'فلاشات وبطاقات ذاكرة تخزين';
    }
    else if (/كاميرا مراقبة|ip camera|security camera/i.test(title)) {
      targetCatId = 24; // IP Camera
      targetCatName = 'كاميرات مراقبة ذكية IP';
    }

    // --- RULE 8: GAMING & ACCESSORIES ---
    else if (/كيبورد|ماوس|لوحة مفاتيح|فأرة|keyboard|mouse|gaming keyboard|gaming mouse/i.test(title)) {
      targetCatId = 46; // Keyboard & Mouse
      targetCatName = 'لوحات مفاتيح وماوسات ألعاب';
    }
    else if (/يد تحكم|مسكة ألعاب|gamepad|controller|joystick|finger sleeves|gaming grip/i.test(title)) {
      targetCatId = 47; // Gaming Accessories
      targetCatName = 'إكسسوارات جيمنج ومسكات تحكم';
    }
    else if (/ريترو|اتاري|جهاز ألعاب كلاسيكي|retro game|arcade|game console/i.test(title)) {
      targetCatId = 44; // Retro Console
      targetCatName = 'أجهزة ألعاب كلاسيكية ريترو';
    }
    else if (/كرسي ألعاب|كرسي جيمنج|gaming chair/i.test(title)) {
      targetCatId = 58; // Gaming Chair
      targetCatName = 'كراسي ألعاب مريحة';
    }
    else if (/لعبة أطفال|العاب|toys|labubu|doll|puzzle|slime/i.test(title)) {
      targetCatId = 35; // Toys
      targetCatName = 'ألعاب إلكترونية ومبتكرة';
    }

    // --- RULE 9: KITCHEN SUPPLIES ---
    else if (/طنجرة|مقلاة|صينية فرن|قلاية|طقم طناجر|قالب كيك|شواية|cookware|frying pan|pot|oven tray|baking pan|grill pan/i.test(title)) {
      targetCatId = 98; // Cookware, Pots & Pans
      targetCatName = 'طناجر ومقالي وصواني طهي';
    }
    else if (/طباخ ليزر|فرن كهربائي|ماكينة قهوة|خلاط|عجانة|قلاية هوائية|air fryer|electric cooker|blender|coffee maker|toaster/i.test(title)) {
      if (/قهوة|coffee/i.test(title)) {
        targetCatId = 48; // Coffee Maker
        targetCatName = 'ماكينات تحضير القهوة المحمولة';
      } else if (/خلاط|عصارة|blender|juicer/i.test(title)) {
        targetCatId = 66; // Blender
        targetCatName = 'خلاطات فواكه ومشروبات محمولة';
      } else {
        targetCatId = 99; // Kitchen Appliances
        targetCatName = 'أجهزة ومعدات المطبخ الكهربائية';
      }
    }
    else if (/سكين|سكاكين|ملعقة|شوكة|مغرفة|مقص مطبخ|لوح تقطيع|knife|knives|cutlery|spoon|fork|cutting board/i.test(title)) {
      targetCatId = 100; // Knives & Cutlery
      targetCatName = 'سكاكين وأدوات تقطيع وملاعق';
    }
    else if (/كوب|مج|ترمس|فنجان|مطارة|قنينة ماء|مغ|mug|cup|thermos|water bottle|tumbler/i.test(title)) {
      targetCatId = 97; // Cups & Mugs
      targetCatName = 'أكواب ومجات وفناجين شرب';
    }
    else if (/صحن|جاط|زبادي|سلطانية|بورسلان|أطباق ضيافة|plate|bowl|platter|serving dish/i.test(title)) {
      targetCatId = 101; // Plates & Bowls
      targetCatName = 'صحون وجاطات وبورسلان ضيافة';
    }
    else if (/حافظة طعام|منظم بهارات|مطربان|لانش بوكس|علب تخزين|food container|lunch box|spice rack|storage box/i.test(title)) {
      targetCatId = 102; // Food Storage & Organizers
      targetCatName = 'منظمات وحوافظ طعام وتخزين';
    }

    // --- RULE 10: WORKSHOP & REPAIR TOOLS ---
    else if (/لحام|كاوية|قصدير|هوت اير|محطة لحام|شفاط قصدير|soldering|solder|welding|desoldering|yaxun/i.test(title)) {
      targetCatId = 74; // Soldering Tools
      targetCatName = 'أدوات وكاويات ومحطات لحام';
    }
    else if (/ميكروسكوب|ملتيميتر|ساعة فحص|جهاز قياس|مسبار|microscope|multimeter|tester|probe/i.test(title)) {
      targetCatId = 75; // Microscopes & Testing
      targetCatName = 'ميكروسكوبات وأجهزة فحص رقمية';
    }
    else if (/مفك|طقم مفكات|ملقط|أدوات فك|screwdriver|tweezer|opening tool|pry tool/i.test(title)) {
      targetCatId = 77; // Screwdrivers & Hand Tools
      targetCatName = 'مفكات وملاقط وأدوات فك يدوية';
    }
    else if (/شريحة شحن|موديول|module|pcb|step-up|step-down|converter module|lithium battery charging module/i.test(title)) {
      targetCatId = 71; // Electronics & Repair Tools
      targetCatName = 'أدوات صيانة وإلكترونيات منوعة';
    }

    // --- RULE 11: PERSONAL CARE & HEALTH ---
    else if (/ماكينة حلاقة|حلاقة شعر|تشذيب|hair trimmer|shaver|clipper|vgr|geemy/i.test(title)) {
      targetCatId = 19; // Hair Trimmer
      targetCatName = 'ماكينات حلاقة وعناية';
    }
    else if (/مساج|تدليك|جهاز مساج|تدليك الرقبة|massage|massager/i.test(title)) {
      targetCatId = 29; // Massage Machine
      targetCatName = 'أجهزة تدليك ومساج';
    }
    else if (/فرشاة أسنان كهربائية|electric toothbrush|sonic toothbrush/i.test(title)) {
      targetCatId = 27; // Electric Toothbrush
      targetCatName = 'فراشي أسنان كهربائية ذكية';
    }
    else if (/ميزان|ميزان ذكي|body scale|smart scale/i.test(title)) {
      targetCatId = 38; // Smart Scale
      targetCatName = 'موازين ذكية ديجيتال';
    }

    // --- RULE 12: SMART HOME & LIVING ---
    else if (/فواحة|مرطب جو|diffuser|humidifier/i.test(title)) {
      targetCatId = 65; // Diffusers
      targetCatName = 'فواحات ومرطبات جو عطرية';
    }
    else if (/مروحة|منفاخ|fan|blower|desk fan/i.test(title)) {
      targetCatId = 40; // Blower & Fan
      targetCatName = 'مراوح ومنافخ تنظيف إلكترونية';
    }
    else if (/مشترك كهرباء|فيش ذكي|مقبس|smart plug|power strip|socket/i.test(title)) {
      targetCatId = 57; // Sockets
      targetCatName = 'مشتركات وأفياش كهرباء ذكية';
    }
    else if (/إنارة شمسية|لمبة طاقة شمسية|كشاف شمسي|solar lamp|solar light|bulbo solar/i.test(title)) {
      targetCatId = 25; // Light
      targetCatName = 'إضاءات ورينغ لايت وليدات';
    }
    else if (/خزنة|خزنة أمان|safe box/i.test(title)) {
      targetCatId = 55; // Safe Box
      targetCatName = 'خزائن أمان إلكترونية';
    }

    // --- RULE 13: SPORTS & FITNESS ---
    else if (/تريدميل|جهاز مشي|حزام تمارين|رباط مقاومة|معدات رياضة|لوح ضغط|treadmill|resistance band|fitness tracker|push up board|gym towel/i.test(title)) {
      targetCatId = 95; // Sports & Fitness
      targetCatName = 'رياضة ولياقة بدنية';
    }

    // --- RULE 14: SCHOOL & OFFICE ---
    else if (/حقيبة مدرسية|ترولي|مقلمة|أقلام تلوين|ممحاة|براية|ملف عرض|school bag|pencil case|colored pencils|eraser|sharpener|clear book/i.test(title)) {
      targetCatId = 89; // School & Office Supplies
      targetCatName = 'مستلزمات مدرسية ومكتبية';
    }

    // --- RULE 15: PARTY & CELEBRATIONS ---
    else if (/بالونات|شمعة عيد ميلاد|زينة حفلات|قناع حفلات|party balloon|birthday candle|photo booth props/i.test(title)) {
      targetCatId = 91; // Party & Celebration Supplies
      targetCatName = 'مستلزمات الحفلات والمناسبات';
    }

    // --- RULE 16: VAPE ---
    else if (/سحبة|فيب|شيشة الكترونية|vape|pod|e-cigarette/i.test(title)) {
      targetCatId = 59; // Vape
      targetCatName = 'سحبات وأجهزة فيب وملحقاتها';
    }

    // Default fallback if still category 87
    if (targetCatId === 87) {
      if (/ديكور|أثاث|ستارة|غطاء|decor|curtain|cushion/i.test(title)) {
        targetCatId = 93; // Home Decor
        targetCatName = 'ديكور منزلي وأثاث';
      } else if (/تنظيف|مستلزمات عناية|cleaning/i.test(title)) {
        targetCatId = 92; // Care & Cleaning
        targetCatName = 'مستلزمات العناية والنظافة';
      } else if (/مطبخ|أكل|طعام/i.test(title)) {
        targetCatId = 102; // Kitchen Organizers
        targetCatName = 'منظمات وحوافظ طعام وتخزين';
      }
    }

    if (targetCatId !== p.category_id) {
      changed++;
    } else {
      unchanged++;
    }

    assignments[targetCatId] = (assignments[targetCatId] || 0) + 1;
  }

  console.log(`\nSimulation Result: ${changed} products reassigned, ${unchanged} products remained in current category.`);
  console.log('\nNew Category Distribution:');
  console.table(assignments);

  process.exit(0);
}

testCategorizationEngine();
