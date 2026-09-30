const db = require('./src/config/db');

async function audit() {
  try {
    const cats = await db.allAsync(`
      SELECT c.id, c.name_ar, c.name_en, c.parent_id, c.sort_order, c.image_url, COUNT(p.id) as prod_count 
      FROM categories c 
      LEFT JOIN products p ON p.category_id = c.id 
      GROUP BY c.id, c.name_ar, c.name_en, c.parent_id, c.sort_order, c.image_url
      ORDER BY c.parent_id NULLS FIRST, c.sort_order ASC, c.id ASC
    `);
    
    console.log('=== TOTAL CATEGORIES: ' + cats.length + ' ===');
    const parents = cats.filter(c => !c.parent_id);
    const children = cats.filter(c => c.parent_id);

    console.log('\n--- ROOT / MAIN CATEGORIES (' + parents.length + ') ---');
    parents.forEach(p => {
      const subcats = children.filter(ch => ch.parent_id === p.id);
      const subProdCount = subcats.reduce((acc, curr) => acc + parseInt(curr.prod_count), 0);
      const totalInBranch = parseInt(p.prod_count) + subProdCount;
      console.log(`[Root ID ${p.id}] (sort: ${p.sort_order}) ${p.name_ar} / ${p.name_en} -> Direct: ${p.prod_count}, Subcats (${subcats.length}): ${subProdCount} (Total Branch: ${totalInBranch})`);
      subcats.forEach(ch => {
        console.log(`    ↳ [Sub ID ${ch.id}] (sort: ${ch.sort_order}) ${ch.name_ar} / ${ch.name_en} -> ${ch.prod_count} prods`);
      });
    });

    console.log('\n=== DIRECT PRODUCTS IN ROOT CATEGORIES ===');
    for (const p of parents) {
      if (parseInt(p.prod_count) > 0) {
        console.log(`\nRoot [${p.id}] "${p.name_ar}" has ${p.prod_count} direct products.`);
        const samples = await db.allAsync(`SELECT id, name_ar, name_en, merchant_id, price_usd, cost_price_usd FROM products WHERE category_id = ? LIMIT 20`, [p.id]);
        samples.forEach(s => {
          console.log(`   - [ID ${s.id}] ${s.name_ar} (${s.name_en}) - $${s.price_usd}`);
        });
      }
    }

    // Let's analyze the 635 products in Root ID 87
    const prods87 = await db.allAsync(`SELECT id, name_ar, name_en, merchant_id, price_usd FROM products WHERE category_id = 87`);
    console.log(`\n=== Breakdown of 635 products in Category 87 ===`);
    const keywords = {
      'Charger / Cable / Adapter': /شاحن|كابل|كيبل|توصيل|محول|cable|charger|adapter|usb|type-c|lightning/i,
      'Power Bank / Battery': /باور بانك|بنك طاقة|بطارية|power bank|battery/i,
      'Audio / Earphones / Speakers': /سماعة|سماعات|مكبر صوت|speaker|earbuds|headphone|earphone|audio|sound/i,
      'Holders / Stands': /حامل|ستاند|holder|stand|mount/i,
      'Car Accessories': /سيارة|سيارات|ولاعة|شاحن سيارة|car/i,
      'Watches / Smart': /ساعة|سوار|watch|smart band/i,
      'Kitchen / Cookware': /مطبخ|مقلاة|طنجرة|سكين|كوب|مج|صحن|خلاط|kitchen|cook|pan|knife|cup|mug|blender|pot/i,
      'Beauty / Personal Care': /شعر|بشرة|حلاقة|كريم|عطر|صابون|مسّاج|مساج|hair|shave|trimmer|skincare|perfume|beauty/i,
      'Tools / Repair / Workshop': /لحام|كاوية|مفك|ملقط|أدوات صيانة|ميكروسكوب|soldering|solder|screwdriver|repair|tool|multimeter|microscope/i,
      'Smart Home / Diffusers / Fans': /فواحة|مروحة|إضاءة|لمبة|مقبس|مشترك|diffuser|fan|lamp|light|socket|plug/i,
      'Electronics / Modules': /module|converter|pcb|relay|sensor|محول فولت|شريحة/i,
    };

    const counts = {};
    Object.keys(keywords).forEach(k => counts[k] = 0);
    counts['Other'] = 0;

    prods87.forEach(p => {
      const text = `${p.name_ar} ${p.name_en}`;
      let matched = false;
      for (const [k, reg] of Object.entries(keywords)) {
        if (reg.test(text)) {
          counts[k]++;
          matched = true;
          break;
        }
      }
      if (!matched) counts['Other']++;
    });

    console.log('Category 87 breakdown by content:');
    console.table(counts);

    process.exit(0);
  } catch (err) {
    console.error('Audit error:', err);
    process.exit(1);
  }
}

audit();
