// Auto-Categorization & Auto-Category Creation Engine for Arz-Mart
// Matches Arabic & English keywords and semantic tokens to existing categories,
// or automatically infers and creates new categories when none exist!

const CATEGORY_RULES = [
  // 1. كفرات وحافظات الهواتف (Case, Cover)
  {
    targetId: 19, // كفرات وحافظات الهواتف
    keywords: [
      'كفر', 'جراب', 'كفرات', 'حافظة هاتف', 'حافظة جوال', 'كفر مغناطيسي', 'كفر شفاف', 'كفر جلد', 'كفر سيليكون', 'كفر حماية', 'بيت هاتف',
      'case', 'cover', 'phone case', 'magsafe case', 'silicone case', 'leather case', 'clear case', 'protective case', 'bumper case'
    ],
    exclude: ['gaming chair', 'safe box', 'pillow case']
  },

  // 2. كابلات وشواحن (Chargers & Cables & Power Banks)
  {
    targetId: 18, // كابلات وشواحن
    keywords: [
      'شاحن', 'شواحن', 'شاحن سريع', 'شاحن جداري', 'شاحن سيارة', 'شاحن لاسلكي', 'باور بانك', 'باوربانك', 'بطارية متنقلة', 'بنك طاقة',
      'كابل', 'كيبل', 'كيبل شحن', 'كابل شحن', 'وصلة شحن', 'سلك شاحن', 'تايب سي', 'يو اس بي', 'لايتنينج',
      'charger', 'fast charger', 'wall charger', 'wireless charger', 'power bank', 'powerbank', 'portable battery', 'charging cable',
      'type-c cable', 'lightning cable', 'usb-c cable', 'usb cable', 'gan charger', 'magsafe charger'
    ],
    exclude: ['solar panel', 'repair']
  },

  // 3. لصقات حماية شاشة (Screen Protectors)
  {
    targetId: 62, // لصقات حماية شاشة ضد الكسر
    keywords: [
      'لصقة حماية', 'لزقة حماية', 'لزقة شاشة', 'لصقة شاشة', 'حامي شاشة', 'حامية شاشة', 'زجاج حماية', 'ضد الكسر', 'برايفسي', 'ملاقف', 'حماية عدسات', 'حماية كاميرا',
      'screen protector', 'tempered glass', 'glass protector', 'privacy glass', 'camera protector', 'lens protector', 'hydrogel'
    ]
  },

  // 4. حوامل وقواعد الهواتف والسيارات (Holders & Stands)
  {
    targetId: 20, // حوامل وقواعد الهواتف والسيارات
    keywords: [
      'حامل هاتف', 'حامل جوال', 'ستاند هاتف', 'ستاند جوال', 'قاعدة هاتف', 'حامل سيارة', 'حامل مغناطيسي', 'ستاند مكتب', 'قاعدة تثبيت',
      'phone holder', 'car holder', 'phone stand', 'car mount', 'magnetic holder', 'desk stand', 'magnetic mount', 'dashboard mount'
    ]
  },

  // 5. ساعات وأجهزة ذكية (Smart Watches & Straps)
  {
    targetId: 26, // ساعات ذكية
    keywords: [
      'ساعة ذكية', 'ساعات ذكية', 'سمارت ووتش', 'سوار ذكي', 'سوار لياقة', 'سوار ساعة', 'حزام ساعة', 'قشاط ساعة', 'استراب',
      'smart watch', 'smartwatch', 'smart band', 'fitness band', 'watch strap', 'watch band', 'apple watch', 'ultra watch'
    ]
  },

  // 6. صوتيات وسماعات (Earphones, Headphones, Speakers, Mics)
  {
    targetId: 27, // مكبرات صوت
    keywords: [
      'سبيكر', 'مكبر صوت', 'صب', 'سبيكر بلوتوث', 'سبيكر مضيء', 'مكبر صوت لاسلكي', 'ساوند بار',
      'speaker', 'bluetooth speaker', 'soundbar', 'party speaker', 'wireless speaker'
    ]
  },
  {
    targetId: 28, // سماعات بلوتوث ولاسلكية
    keywords: [
      'سماعة بلوتوث', 'سماعات بلوتوث', 'سماعة ايربودز', 'ايربودز', 'سماعة رأس', 'سماعات رأس', 'سماعة اذن', 'سماعات اذن', 'هيدفون', 'ايرفون',
      'airpods', 'earbuds', 'wireless earbuds', 'headphones', 'headset', 'earphones', 'tws', 'noise cancelling'
    ]
  },
  {
    targetId: 39, // مايكروفونات
    keywords: [
      'مايكروفون', 'ميكروفون', 'مايك لاسلكي', 'مايك بودكاست', 'مايك ياقة',
      'microphone', 'wireless mic', 'lavalier mic', 'podcast mic', 'condenser mic'
    ]
  },

  // 7. إضاءات ورينغ لايت (Ring Light & Studio Lights)
  {
    targetId: 25, // إضاءات ورينغ لايت وليدات
    keywords: [
      'رينغ لايت', 'رينج لايت', 'اضاءة ليد', 'إضاءة ليد', 'شريط ليد', 'مصباح مكتبي', 'لمبة ذكية', 'اضاءة تصوير', 'ابجورة', 'نيون',
      'ring light', 'ringlight', 'led strip', 'desk lamp', 'rgb light', 'studio light', 'night light', 'flood light'
    ]
  },

  // 8. ترايبود ومثبتات تصوير جيمبال (Tripod & Gimbal)
  {
    targetId: 53, // ترايبود ومثبتات تصوير جيمبال
    keywords: [
      'ترايبود', 'ترايبود تصوير', 'عصا سيلفي', 'سيلفي ستيك', 'جيمبال', 'مثبت تصوير', 'مثبت جوال',
      'tripod', 'selfie stick', 'gimbal', 'stabilizer', 'phone stabilizer'
    ]
  },

  // 9. كاميرات مراقبة وأجهزة أمان (IP Cameras & Baby Monitors)
  {
    targetId: 24, // كاميرات مراقبة ذكية IP
    keywords: [
      'كاميرا مراقبة', 'كاميرات مراقبة', 'كاميرا واي فاي', 'كاميرا ذكية', 'كاميرا خارجية', 'كاميرا منزلية',
      'ip camera', 'cctv', 'security camera', 'wifi camera', 'surveillance camera', 'smart camera'
    ]
  },
  {
    targetId: 23, // كاميرات مراقبة الأطفال
    keywords: [
      'مراقبة اطفال', 'مراقبة أطفال', 'كاميرا اطفال', 'بيبي مونيتر',
      'baby monitor', 'baby camera'
    ]
  },

  // 10. تخزين وكمبيوتر (Memory, Flash, Hubs, Laptop Accessories)
  {
    targetId: 52, // فلاشات وبطاقات ذاكرة تخزين
    keywords: [
      'فلاش ميموري', 'فلاشة', 'كرت ذاكرة', 'بطاقة ذاكرة', 'ميكرو اس دي', 'هارد ديسك', 'اس اس دي',
      'flash drive', 'usb drive', 'memory card', 'sd card', 'microsd', 'ssd', 'hard drive', 'external storage'
    ]
  },
  {
    targetId: 49, // محولات ومنافذ Type-C و HDMI
    keywords: [
      'محول', 'وصلة تحويل', 'هب', 'يو اس بي هب', 'محول hdmi', 'محول تايب سي', 'او تي جي',
      'adapter', 'usb hub', 'type-c hub', 'hdmi converter', 'otg adapter', 'multiport'
    ]
  },
  {
    targetId: 36, // أجهزة عرض بروجيكتور
    keywords: [
      'بروجيكتور', 'بروجكتر', 'عارض سينمائي', 'سينما منزلية',
      'projector', 'mini projector', 'home theater'
    ]
  },

  // 11. ماكينات القهوة والخلاطات والمطبخ الذكي
  {
    targetId: 48, // ماكينات تحضير القهوة المحمولة
    keywords: [
      'ماكينة قهوة', 'ماكينة كبسولات', 'صانعة قهوة', 'مطحنة قهوة', 'رغوة حليب', 'اسبريسو', 'فرينش بريس',
      'coffee maker', 'espresso machine', 'coffee grinder', 'milk frother', 'capsule machine', 'coffee pot'
    ]
  },
  {
    targetId: 66, // خلاطات فواكه ومشروبات محمولة
    keywords: [
      'خلاط', 'خلاط فواكه', 'عصارة', 'خلاط محمول', 'مفرمة', 'هاند بلندر', 'محضرة طعام',
      'blender', 'portable blender', 'juicer', 'food processor', 'hand blender', 'chopper'
    ]
  },

  // 12. أواني ولوازم المطبخ
  {
    targetId: 97, // أكواب ومجات وفناجين شرب
    keywords: [
      'كوب', 'مج', 'فنجان', 'ثيرموس', 'ترمس', 'مطرة ماء', 'قارورة ماء', 'كاسات', 'طقم فناجين',
      'mug', 'cup', 'tumbler', 'thermos', 'water bottle', 'coffee mug', 'tea cup'
    ]
  },
  {
    targetId: 101, // صحون وجاطات وبورسلان ضيافة
    keywords: [
      'صحن', 'صحون', 'جاط', 'طقم ضيافة', 'بورسلان', 'زبدية', 'صينية تقديم', 'سيرفيس', 'طقم عشاء',
      'plate', 'plates', 'bowl', 'serving tray', 'tableware', 'dish set', 'dinnerware'
    ]
  },
  {
    targetId: 102, // منظمات وحوافظ طعام وتخزين
    keywords: [
      'حافظة طعام', 'لانش بوكس', 'منظم مطبخ', 'علب تخزين', 'مطربان', 'مرطبان', 'علبة بهارات', 'أكياس تخزين',
      'food container', 'lunch box', 'storage container', 'kitchen organizer', 'spice jar', 'food storage'
    ]
  },

  // 13. عناية شخصية وصحة (Shaver, Hair, Scale, Massager)
  {
    targetId: 85, // عناية شخصية وصحة
    keywords: [
      'ماكينة حلاقة', 'مكينة حلاقة', 'مشذب', 'مقص شعر', 'استشوار', 'سشوار', 'مملس شعر', 'فير شعر', 'فرشاة حرارية',
      'جهاز مساج', 'مساج', 'تدليك', 'فرشاة اسنان كهربائية', 'ميزان', 'ميزان ذكي', 'ميزان ديجيتال',
      'shaver', 'hair trimmer', 'hair clipper', 'hair dryer', 'hair straightener', 'curler', 'massager', 'massage gun', 'electric toothbrush', 'scale'
    ]
  },
  {
    targetId: 38, // موازين ذكية
    keywords: ['ميزان', 'ميزان ذكي', 'ميزان وزن', 'ميزان مطبخ', 'scale', 'body scale', 'smart scale', 'weight scale']
  },

  // 14. منتجات التجميل والعناية (Skincare, Perfume, Makeup)
  {
    targetId: 90, // منتجات التجميل والعناية
    keywords: [
      'عطر', 'عطور', 'برفيوم', 'مسك', 'بخور', 'سيروم', 'كريم', 'مرطب', 'غسول', 'واقي شمس', 'شامبو', 'بلسم', 'ماسك',
      'مكياج', 'احمر شفاه', 'روج', 'كونسيلر', 'ماسكارا', 'ايلاينر', 'بودرة', 'مورد خدود', 'تنت', 'زيت شعر',
      'perfume', 'fragrance', 'eau de parfum', 'serum', 'cream', 'moisturizer', 'cleanser', 'sunscreen', 'shampoo', 'conditioner',
      'hair mask', 'makeup', 'lipstick', 'mascara', 'eyeliner', 'foundation', 'concealer', 'blush', 'hair oil'
    ]
  },

  // 15. مستلزمات سيارات (Car Accessories)
  {
    targetId: 86, // مستلزمات سيارات
    keywords: [
      'سيارة', 'للسيارة', 'شاحن سيارة', 'حامل سيارة', 'معطر سيارة', 'مضخة هواء', 'منفاخ اطارات', 'منفاخ كوشوك', 'منظف سيارة', 'مظلة سيارة', 'مفرمة سيارة', 'بلوتوث سيارة',
      'car', 'car accessory', 'car charger', 'car holder', 'car mount', 'car air freshener', 'tire inflator', 'car vacuum', 'fm transmitter'
    ]
  },

  // 16. ألعاب وجيمنج (Gaming, Toys)
  {
    targetId: 58, // كراسي ألعاب مريحة
    keywords: ['كرسي العاب', 'كرسي جيمنج', 'كرسي قيمنق', 'gaming chair']
  },
  {
    targetId: 44, // أجهزة ألعاب ريترو
    keywords: ['كونسول', 'اتاري', 'ريترو', 'بلايستيشن', 'يد تحكم', 'جيم باد', 'العاب كلاسيكية', 'game console', 'retro game', 'gamepad', 'controller', 'joystick']
  },
  {
    targetId: 35, // ألعاب إلكترونية ومبتكرة للأطفال
    keywords: ['لعبة اطفال', 'العاب اطفال', 'سيارة ريموت', 'درون', 'طائرة تحكم', 'روبوت', 'لعبة ذكاء', 'toys', 'rc car', 'drone', 'puzzle']
  },

  // 17. أدوات الصيانة (Workshop / Repair Tools)
  {
    targetId: 84, // أدوات ومعدات الصيانة
    keywords: [
      'عدة صيانة', 'مفك', 'مفكات', 'طقم مفكات', 'كاوي لحام', 'هوت اير', 'فاحص', 'افوميتر', 'ملقط', 'مجهر', 'ميكروسكوب',
      'repair tool', 'toolkit', 'screwdriver', 'soldering', 'heat gun', 'multimeter', 'tweezers', 'microscope', 'bga'
    ]
  },
  {
    targetId: 76, // مواد لاصقة وأشرطة عزل
    keywords: ['لاصق b7000', 'لاصق t7000', 'شريط عزل', 'غراء شاشة', 'تب عازل', 'adhesive', 'heat tape', 'b7000', 't7000']
  },

  // 18. ديكور منزلي وأثاث
  {
    targetId: 93, // ديكور منزلي وأثاث
    keywords: [
      'ديكور', 'مزهرية', 'فازة', 'ساعة حائط', 'لوحة جدارية', 'منظم رفوف', 'مفرش سرير', 'غطاء سرير', 'مخدة', 'وسادة', 'شموع معطرة',
      'decor', 'home decor', 'vase', 'wall clock', 'bedsheet', 'pillow', 'cushion', 'scented candle'
    ]
  },

  // 19. حقائب وحوافظ
  {
    targetId: 34, // حقائب وحوافظ أجهزة ذكية
    keywords: [
      'حقيبة', 'شنطة', 'حقيبة ظهر', 'شنطة ظهر', 'حقيبة لابتوب', 'شنطة لابتوب', 'محفظة', 'حقيبة كتف',
      'bag', 'backpack', 'laptop bag', 'shoulder bag', 'crossbody', 'wallet', 'pouch'
    ]
  },

  // 20. أجهزة تتبع Airtag
  {
    targetId: 50, // أجهزة تتبع وحماية ذكية
    keywords: ['ايرتاج', 'اير تاق', 'تتبع', 'جهاز تتبع', 'ميدالية ايرتاج', 'airtag', 'smart tag', 'gps tracker', 'tracker']
  }
];

// Rich Semantic Taxonomy used to infer and create new categories dynamically
const DOMAIN_TAXONOMY = [
  {
    name_ar: 'أحذية ومستلزمات رياضية',
    name_en: 'Shoes & Footwear',
    keywords: ['حذاء', 'شوز', 'كندرة', 'بوت', 'صندل', 'نعال', 'سنيكرز', 'جزمة', 'shoes', 'sneakers', 'boots', 'sandals', 'footwear', 'slippers', 'loafers']
  },
  {
    name_ar: 'ملابس وأزياء',
    name_en: 'Clothing & Apparel',
    keywords: ['قميص', 'بنطال', 'بنطلون', 'فستان', 'تنورة', 'جاكيت', 'معطف', 'هودي', 'تيشيرت', 'بلوزة', 'عباية', 'شال', 'ملابس', 'shirt', 'pants', 'dress', 'jacket', 'hoodie', 't-shirt', 'coat', 'clothing', 'apparel', 'sweater', 'jeans']
  },
  {
    name_ar: 'نظارات شمسية وبصرية',
    name_en: 'Eyewear & Sunglasses',
    keywords: ['نظارة', 'نظارات', 'نظارات شمسية', 'نظارة طبية', 'عدسات لاصقة', 'sunglasses', 'glasses', 'eyewear', 'lenses', 'spectacles']
  },
  {
    name_ar: 'مجوهرات وإكسسوارات شخصية',
    name_en: 'Jewelry & Accessories',
    keywords: ['خاتم', 'سوار', 'اسوارة', 'سلسال', 'قلادة', 'حلق', 'اقراط', 'بروش', 'مجوهرات', 'فضة', 'ذهب', 'ring', 'necklace', 'bracelet', 'earrings', 'jewelry', 'pendant', 'silver', 'gold', 'cufflinks']
  },
  {
    name_ar: 'عطور ومسك وبخور',
    name_en: 'Perfumes & Fragrances',
    keywords: ['عطر', 'برفيوم', 'مسك', 'بخور', 'معمول', 'عود', 'معطر', 'perfume', 'fragrance', 'cologne', 'oud', 'bakhoor', 'scent', 'body mist']
  },
  {
    name_ar: 'مكياج ومستحضرات تجميل',
    name_en: 'Makeup & Cosmetics',
    keywords: ['مكياج', 'احمر شفاه', 'روج', 'كونسيلر', 'ماسكارا', 'ايلاينر', 'بودرة', 'تنت', 'كحل', 'ظلال عيون', 'makeup', 'lipstick', 'mascara', 'eyeliner', 'foundation', 'concealer', 'blush', 'eyeshadow', 'palette']
  },
  {
    name_ar: 'عناية بالبشرة والجسم',
    name_en: 'Skincare & Body Care',
    keywords: ['سيروم', 'كريم مرطب', 'غسول وجه', 'واقي شمس', 'لوشن', 'مقشر', 'تونر', 'skincare', 'serum', 'moisturizer', 'cleanser', 'sunscreen', 'lotion', 'body wash', 'toner', 'scrub']
  },
  {
    name_ar: 'عناية بالشعر وتصفيفه',
    name_en: 'Hair Care & Styling',
    keywords: ['شامبو', 'بلسم', 'زيت شعر', 'سيروم شعر', 'ماسك شعر', 'حمام زيت', 'جل شعر', 'مثبت شعر', 'shampoo', 'conditioner', 'hair oil', 'hair mask', 'hair serum', 'hair gel', 'pomade']
  },
  {
    name_ar: 'أواني ولوازم المطبخ والطهي',
    name_en: 'Kitchenware & Cookware',
    keywords: ['طنجرة', 'مقلاة', 'قلاية', 'قدر ضغط', 'سكين مطبخ', 'سكاكين', 'لوح تقطيع', 'صينية فرن', 'طقم اواني', 'طاسة', 'cookware', 'pot', 'pan', 'frying pan', 'kitchen knife', 'cutting board', 'baking tray', 'utensil']
  },
  {
    name_ar: 'ديكورات ومفروشات منزلية',
    name_en: 'Home Decor & Furnishings',
    keywords: ['ديكور', 'مزهرية', 'فازة', 'ساعة حائط', 'لوحة جدارية', 'مفرش سرير', 'مخدة', 'ستارة', 'سجادة', 'ابجورة', 'decor', 'home decor', 'vase', 'wall art', 'bedsheet', 'curtain', 'carpet', 'rug', 'pillow', 'candle']
  },
  {
    name_ar: 'أجهزة ولوازم التنظيف المنزلي',
    name_en: 'Cleaning & Home Care',
    keywords: ['مكنسة', 'ممسحة', 'منظف', 'معقم', 'غسالة صحون', 'معطر جو', 'بخاخ تنظيف', 'vacuum', 'mop', 'cleaner', 'air freshener', 'disinfectant', 'sweeper', 'cleaning cloth']
  },
  {
    name_ar: 'أجهزة شبكات ومنزل ذكي',
    name_en: 'Smart Home & Networking',
    keywords: ['راوتر', 'واي فاي', 'مقوي شبكة', 'مفتاح ذكي', 'فيش ذكي', 'حساس حركة', 'انتركم', 'جرس ذكي', 'router', 'wifi extender', 'smart plug', 'smart switch', 'motion sensor', 'smart doorbell', 'intercom', 'mesh wifi']
  },
  {
    name_ar: 'مستلزمات وألعاب الأطفال',
    name_en: 'Baby & Kids Products',
    keywords: ['اطفال', 'طفل', 'رضيع', 'لهاية', 'رضاعة', 'عربة اطفال', 'حفاضات', 'سرير اطفال', 'baby', 'kids', 'infant', 'pacifier', 'baby bottle', 'stroller', 'diaper', 'crib', 'toddler']
  },
  {
    name_ar: 'مستلزمات الحيوانات الأليفة',
    name_en: 'Pet Supplies',
    keywords: ['قطط', 'كلاب', 'طعام قطط', 'طعام كلاب', 'طوق', 'قفص', 'رمل قطط', 'لعبة قطط', 'pet', 'cat food', 'dog food', 'leash', 'collar', 'litter box', 'aquarium', 'pet carrier']
  },
  {
    name_ar: 'معدات ولياقة بدنية ورياضة',
    name_en: 'Sports & Fitness Equipment',
    keywords: ['دامبلز', 'اثقال', 'بساط يوجا', 'حبل قفز', 'دراجة رياضية', 'كرة قدم', 'مضرب', 'حزام رياضي', 'gym', 'fitness', 'dumbbell', 'yoga mat', 'jump rope', 'exercise bike', 'treadmill', 'racket', 'resistance band']
  },
  {
    name_ar: 'مستلزمات رحلات وتخييم',
    name_en: 'Camping & Outdoor Gear',
    keywords: ['خيمة', 'تخييم', 'رحلات', 'كيس نوم', 'مصباح تخييم', 'كرسي رحلات', 'منقل شواء', 'شواية', 'camping', 'tent', 'sleeping bag', 'bbq', 'grill', 'outdoor lantern', 'cooler box', 'hiking']
  },
  {
    name_ar: 'قرطاسية وأدوات مكتبية',
    name_en: 'Stationery & Office Supplies',
    keywords: ['دفتر', 'قلم حبر', 'طقم اقلام', 'ملف', 'براية', 'دباسة', 'خرامة', 'الة حاسبة', 'ورق طباعة', 'notebook', 'pen set', 'stationery', 'binder', 'stapler', 'calculator', 'printer paper', 'desk organizer']
  },
  {
    name_ar: 'أدوات ومعدات صيانة يدوية',
    name_en: 'Tools & Hardware',
    keywords: ['شاكوش', 'مطرقة', 'زرادية', 'كماشة', 'منشار', 'دريل', 'مثقاب', 'براغي', 'صواميل', 'متر قياس', 'hammer', 'pliers', 'drill', 'saw', 'screws', 'nuts', 'measuring tape', 'wrench', 'toolbox']
  },
  {
    name_ar: 'إكسسوارات ومستلزمات السيارات',
    name_en: 'Car Accessories',
    keywords: ['سيارة', 'للسيارة', 'معطر سيارة', 'مضخة هواء', 'منفاخ كوشوك', 'مظلة سيارة', 'شاحن سيارة', 'حامل سيارة', 'car accessory', 'car charger', 'car mount', 'tire inflator', 'car vacuum', 'dashcam']
  },
  {
    name_ar: 'أجهزة صوت وموسيقى احترافية',
    name_en: 'Audio & Music Equipment',
    keywords: ['جيتار', 'بيانو', 'ميكسر', 'مضخم صوت', 'اورغ', 'عود موسيقي', 'guitar', 'piano', 'amplifier', 'audio mixer', 'synthesizer', 'instrument']
  },
  {
    name_ar: 'أجهزة طبية وصحة منزلية',
    name_en: 'Health & Medical Devices',
    keywords: ['ضغط الدم', 'مقياس حرارة', 'جهاز تنفس', 'اوكسيميتر', 'عكاز', 'جهاز سكري', 'blood pressure', 'thermometer', 'oximeter', 'medical', 'nebulizer', 'glucose meter']
  },
  {
    name_ar: 'إلكترونيات وأجهزة ذكية منوعة',
    name_en: 'Electronics & Smart Gadgets',
    keywords: ['الكترونيات', 'جهاز ذكي', 'ريموت', 'محول', 'بطارية', 'electronics', 'gadget', 'remote control', 'battery', 'device']
  }
];

/**
 * Intelligent Category Matcher
 * Analyzes title (Ar & En), description (Ar & En), and tags to find the best category ID.
 * Returns: { category_id, category_name_ar, category_name_en, confidence } or null if inconclusive.
 */
function classifyProduct({ name_ar = '', name_en = '', description_ar = '', description_en = '' }, categoriesList = []) {
  const combinedText = ` ${name_ar} ${name_en} ${description_ar} ${description_en} `.toLowerCase();

  let bestMatch = null;
  let highestScore = 0;

  for (const rule of CATEGORY_RULES) {
    // Check exclusions first
    if (rule.exclude && rule.exclude.some(exc => combinedText.includes(exc.toLowerCase()))) {
      continue;
    }

    let score = 0;
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      // Title match gets higher weight
      const titleText = ` ${name_ar} ${name_en} `.toLowerCase();
      if (titleText.includes(kwLower)) {
        score += (kw.includes(' ') ? 15 : 10);
      } else if (combinedText.includes(kwLower)) {
        score += (kw.includes(' ') ? 8 : 5);
      }
    }

    if (score > highestScore && score >= 8) {
      highestScore = score;
      bestMatch = rule;
    }
  }

  // If matched via specific rule, verify category exists in DB list
  if (bestMatch) {
    const matchedCategory = categoriesList.find(c => c.id === bestMatch.targetId);
    if (matchedCategory && matchedCategory.id !== 103 && matchedCategory.code !== 'ADMIN_STAGING_DRAFT') {
      return {
        category_id: matchedCategory.id,
        category_name_ar: matchedCategory.name_ar,
        category_name_en: matchedCategory.name_en,
        confidence: Math.min(100, Math.round((highestScore / 25) * 100))
      };
    }
  }

  // Fallback 2: Direct token matching against existing category names in the store
  if (categoriesList && categoriesList.length > 0) {
    for (const cat of categoriesList) {
      if (cat.id === 103 || cat.code === 'ADMIN_STAGING_DRAFT') continue;

      const catArTokens = (cat.name_ar || '').split(/\s+/).filter(t => t.length > 3 && !['قسم', 'جميع', 'أجهزة', 'منتجات'].includes(t));
      const catEnTokens = (cat.name_en || '').toLowerCase().split(/\s+/).filter(t => t.length > 3 && !['and', 'the', 'for'].includes(t));

      let directScore = 0;
      for (const token of catArTokens) {
        if (combinedText.includes(token.toLowerCase())) directScore += 8;
      }
      for (const token of catEnTokens) {
        if (combinedText.includes(token)) directScore += 8;
      }

      if (directScore >= 16 && directScore > highestScore) {
        highestScore = directScore;
        return {
          category_id: cat.id,
          category_name_ar: cat.name_ar,
          category_name_en: cat.name_en,
          confidence: Math.min(90, directScore * 5)
        };
      }
    }
  }

  return null;
}

/**
 * Infer a new category name (Bilingual Arabic & English) when no existing category matches.
 */
function inferCategoryFromProduct({ name_ar = '', name_en = '', description_ar = '', description_en = '' }) {
  const combinedText = ` ${name_ar} ${name_en} ${description_ar} ${description_en} `.toLowerCase();

  // 1. Try matching against Domain Taxonomy
  let bestDomain = null;
  let bestDomainScore = 0;

  for (const domain of DOMAIN_TAXONOMY) {
    let score = 0;
    for (const kw of domain.keywords) {
      const kwLower = kw.toLowerCase();
      const titleText = ` ${name_ar} ${name_en} `.toLowerCase();
      if (titleText.includes(kwLower)) {
        score += (kw.includes(' ') ? 15 : 10);
      } else if (combinedText.includes(kwLower)) {
        score += (kw.includes(' ') ? 8 : 5);
      }
    }
    if (score > bestDomainScore && score >= 8) {
      bestDomainScore = score;
      bestDomain = domain;
    }
  }

  if (bestDomain) {
    return {
      name_ar: bestDomain.name_ar,
      name_en: bestDomain.name_en
    };
  }

  // 2. Dynamic Smart Extraction from Product Names
  let cleanAr = (name_ar || '').replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
  let cleanEn = (name_en || '').replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Remove common noise / stop words
  const stopWordsAr = ['أصلي', 'اصلي', 'جديد', 'عالي', 'الجودة', 'سعر', 'الجملة', 'مع', 'ضمان', 'ماركة', 'نوع', 'درجة', 'أولى', 'ممتاز'];
  const stopWordsEn = ['original', 'pro', 'max', 'ultra', 'mini', 'plus', 'high', 'quality', 'new', 'fast', 'smart', 'portable', 'universal', 'genuine', 'premium'];

  const arTokens = cleanAr.split(' ').filter(t => t.length > 2 && !stopWordsAr.includes(t));
  const enTokens = cleanEn.split(' ').filter(t => t.length > 2 && !stopWordsEn.includes(t.toLowerCase()));

  let inferredAr = arTokens.slice(0, 3).join(' ');
  let inferredEn = enTokens.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  if (!inferredAr && !inferredEn) {
    return {
      name_ar: 'منتجات وإلكترونيات منوعة',
      name_en: 'General Products & Gadgets'
    };
  }

  if (!inferredAr) inferredAr = inferredEn;
  if (!inferredEn) inferredEn = inferredAr;

  return {
    name_ar: inferredAr,
    name_en: inferredEn
  };
}

/**
 * Ensure Product Has A Valid Category
 * 1. Matches against existing categories.
 * 2. If none match, automatically creates the new category in database and returns it!
 */
async function ensureProductCategory(product, db, invalidateCache = null) {
  if (!db) return null;

  try {
    // 1. Fetch active categories
    const categoriesList = await db.allAsync('SELECT * FROM categories WHERE active = 1 AND id != 103 AND (code != \'ADMIN_STAGING_DRAFT\' OR code IS NULL)');

    // 2. Try classifying against existing categories
    const match = classifyProduct(product, categoriesList);
    if (match && match.category_id) {
      return {
        category_id: match.category_id,
        category_name_ar: match.category_name_ar,
        category_name_en: match.category_name_en,
        is_new: false,
        confidence: match.confidence
      };
    }

    // 3. Infer new category bilingual name
    const inferred = inferCategoryFromProduct(product);
    if (!inferred || !inferred.name_ar || !inferred.name_en) {
      return null;
    }

    // 4. Check if category with this name already exists in database
    const existingCat = await db.getAsync(
      'SELECT * FROM categories WHERE LOWER(name_en) = LOWER(?) OR name_ar = ? LIMIT 1',
      [inferred.name_en.trim(), inferred.name_ar.trim()]
    );

    if (existingCat) {
      return {
        category_id: existingCat.id,
        category_name_ar: existingCat.name_ar,
        category_name_en: existingCat.name_en,
        is_new: false,
        confidence: 85
      };
    }

    // 5. Automatically create new category in database!
    const sampleImg = product.image_url || (Array.isArray(product.images) ? product.images[0] : '');
    const insertRes = await db.runAsync(
      'INSERT INTO categories (name_ar, name_en, active, sort_order, image_url) VALUES (?, ?, 1, 999, ?)',
      [inferred.name_ar.trim(), inferred.name_en.trim(), sampleImg || '']
    );

    const newCatId = insertRes.lastID;

    if (typeof invalidateCache === 'function') {
      try { invalidateCache(); } catch (e) {}
    }

    console.log(`[AutoCategorizer] Created new category ID ${newCatId}: '${inferred.name_ar}' / '${inferred.name_en}' for product: '${product.name_ar || product.name_en}'`);

    return {
      category_id: newCatId,
      category_name_ar: inferred.name_ar.trim(),
      category_name_en: inferred.name_en.trim(),
      is_new: true,
      confidence: 90
    };
  } catch (err) {
    console.error('ensureProductCategory error:', err);
    return null;
  }
}

module.exports = {
  classifyProduct,
  inferCategoryFromProduct,
  ensureProductCategory,
  CATEGORY_RULES,
  DOMAIN_TAXONOMY
};
