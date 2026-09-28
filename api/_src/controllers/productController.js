const db = require('../config/db');
const { fileToBase64 } = require('../utils/fileHelper');
const { classifyProduct, ensureProductCategory } = require('../utils/autoCategorizer');
const { invalidateCategoriesCache } = require('./categoryController');

// In-memory cache for product listings (TTL = 30 seconds)
const productsCache = new Map();
const PRODUCT_CACHE_TTL = 30 * 1000;

function invalidateProductsCache() {
  productsCache.clear();
}
exports.invalidateProductsCache = invalidateProductsCache;

function formatSizesForClient(sizesJson) {
  if (!sizesJson) return [];
  let list = [];
  try {
    list = typeof sizesJson === 'string' ? JSON.parse(sizesJson) : sizesJson;
  } catch (e) {
    list = [];
  }
  if (!Array.isArray(list)) return [];

  return list.map(item => {
    if (typeof item === 'object' && item !== null) {
      const name = item.name || '';
      const price = item.price !== undefined && item.price !== null && !isNaN(item.price)
        ? Number(item.price)
        : null;
      if (price !== null) {
        return `${name} ($${price.toFixed(2)})`;
      }
      return name;
    }
    return String(item);
  }).filter(Boolean);
}

function sanitizeImageUrl(url, productId, index = 0) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:image/')) {
    return `/api/products/${productId}/image${index > 0 ? `?index=${index}` : ''}`;
  }
  return url;
}

function parseImagesForClient(imagesJson, fallbackImageUrl, productId) {
  let list = [];
  if (imagesJson) {
    try {
      list = typeof imagesJson === 'string' ? JSON.parse(imagesJson) : imagesJson;
    } catch (e) {
      list = [];
    }
  }
  if (!Array.isArray(list)) list = [];
  if (list.length === 0 && fallbackImageUrl) {
    list = [fallbackImageUrl];
  }
  if (productId) {
    list = list.map((img, idx) => sanitizeImageUrl(img, productId, idx));
  }
  return list;
}

exports.getProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const index = parseInt(req.query.index) || 0;
    const row = await db.getAsync('SELECT image_url, images FROM products WHERE id = ?', [id]);
    if (!row) {
      return res.status(404).send('Not found');
    }
    let target = row.image_url;
    if (index > 0 && row.images) {
      try {
        const imgs = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
        if (Array.isArray(imgs) && imgs[index]) {
          target = imgs[index];
        }
      } catch (e) {}
    } else if ((!target || !target.startsWith('data:image/')) && row.images) {
      try {
        const imgs = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
        if (Array.isArray(imgs) && imgs[0] && imgs[0].startsWith('data:image/')) {
          target = imgs[0];
        }
      } catch (e) {}
    }

    if (!target) {
      return res.status(404).send('No image');
    }

    if (target.startsWith('data:image/')) {
      const matches = target.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (matches) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
        return res.end(buffer);
      }
    }

    return res.redirect(target);
  } catch (err) {
    console.error('getProductImage error:', err);
    res.status(500).send('Error');
  }
};

exports.getProducts = async (req, res) => {
  try {
    const cacheKey = JSON.stringify(req.query);
    const now = Date.now();
    const cached = productsCache.get(cacheKey);
    if (cached && (now - cached.time < PRODUCT_CACHE_TTL)) {
      res.setHeader('Cache-Control', 'public, max-age=30');
      return res.json(cached.data);
    }

  const { category_id, search, min_price, max_price, min_rating, all, include_inactive, new_arrivals, out_of_stock, merchant_name, limit, offset } = req.query;
  const showAll = all === 'true' || include_inactive === 'true';

  let hideOutOfStockOnStore = false;
  if (!showAll) {
    try {
      const sRow = await db.getAsync('SELECT show_out_of_stock_on_home FROM settings LIMIT 1');
      if (sRow && sRow.show_out_of_stock_on_home === 0) {
        hideOutOfStockOnStore = true;
      }
    } catch (e) {}
  }

  let query = `
    SELECT p.id, p.sku, p.name_ar, p.name_en, p.description_ar, p.description_en, p.price_usd, p.cost_price_usd, p.old_price_usd, 
           p.stock, p.category_id, p.merchant_id, p.is_new_arrival, p.rating_count, 
           p.rating_sum, p.colors, p.sizes, p.created_at, p.sync_batch_time,
           (CASE WHEN p.image_url LIKE 'data:image%' THEN CONCAT('/api/products/', p.id, '/image') ELSE p.image_url END) as image_url,
           (CASE WHEN p.images LIKE '%data:image%' THEN '[]' ELSE p.images END) as images,
           c.name_ar as category_name_ar, c.name_en as category_name_en, m.name as merchant_name 
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN merchants m ON p.merchant_id = m.id
    WHERE 1=1
    ${!showAll ? 'AND (c.active = 1 OR c.active IS NULL OR p.category_id IS NULL)' : ''}
    ${hideOutOfStockOnStore ? 'AND p.stock > 0' : ''}
  `;
  const params = [];

  if (new_arrivals === 'true') {
    query += ' AND p.is_new_arrival = 1';
  }

  if (out_of_stock === 'true') {
    query += ' AND p.stock <= 0';
  }

  if (merchant_name) {
    query += ' AND m.name = ?';
    params.push(merchant_name);
  }

  if (category_id) {
    if (String(category_id) === '94') {
      query += ' AND (p.old_price_usd > p.price_usd OR p.is_new_arrival = 1)';
    } else {
      try {
        const subcats = await db.allAsync('SELECT id FROM categories WHERE (parent_id = ? OR id = ?) AND (active = 1 OR active IS NULL)', [category_id, category_id]);
        const catIds = subcats.map(s => s.id);
        if (catIds.length > 0) {
          query += ` AND p.category_id IN (${catIds.map(() => '?').join(',')})`;
          catIds.forEach(id => params.push(id));
        } else {
          query += ' AND p.category_id = ?';
          params.push(category_id);
        }
      } catch (err) {
        console.error('Subcategories fetch error:', err);
        query += ' AND p.category_id = ?';
        params.push(category_id);
      }
    }
  }

  if (search && search.trim()) {
    const rawTerms = search.trim().split(/\s+/).filter(Boolean);
    for (const rawTerm of rawTerms.slice(0, 6)) {
      const termLower = rawTerm.toLowerCase();
      // Normalize Arabic variants (alef, teh marbuta, alef maqsura, tashkeel)
      const termAr = termLower
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F\u0670]/g, '');

      if (termAr !== termLower) {
        query += ` AND (
          LOWER(p.name_en) LIKE ? OR 
          LOWER(p.name_ar) LIKE ? OR 
          LOWER(COALESCE(p.sku, '')) LIKE ? OR
          LOWER(p.description_en) LIKE ? OR 
          LOWER(p.description_ar) LIKE ? OR 
          LOWER(COALESCE(c.name_en, '')) LIKE ? OR 
          LOWER(COALESCE(c.name_ar, '')) LIKE ? OR 
          LOWER(COALESCE(m.name, '')) LIKE ? OR
          LOWER(p.name_ar) LIKE ? OR 
          LOWER(p.description_ar) LIKE ?
        )`;
        const p1 = `%${termLower}%`;
        const p2 = `%${termAr}%`;
        params.push(p1, p1, p1, p1, p1, p1, p1, p1, p2, p2);
      } else {
        query += ` AND (
          LOWER(p.name_en) LIKE ? OR 
          LOWER(p.name_ar) LIKE ? OR 
          LOWER(COALESCE(p.sku, '')) LIKE ? OR
          LOWER(p.description_en) LIKE ? OR 
          LOWER(p.description_ar) LIKE ? OR 
          LOWER(COALESCE(c.name_en, '')) LIKE ? OR 
          LOWER(COALESCE(c.name_ar, '')) LIKE ? OR 
          LOWER(COALESCE(m.name, '')) LIKE ?
        )`;
        const p1 = `%${termLower}%`;
        params.push(p1, p1, p1, p1, p1, p1, p1, p1);
      }
    }
  }

  if (min_price) {
    query += ' AND p.price_usd >= ?';
    params.push(parseFloat(min_price));
  }

  if (max_price) {
    query += ' AND p.price_usd <= ?';
    params.push(parseFloat(max_price));
  }

  query += ' ORDER BY (CASE WHEN p.stock > 0 THEN 0 ELSE 1 END) ASC, p.id DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
    if (offset) {
      query += ' OFFSET ?';
      params.push(parseInt(offset));
    }
  }

  const products = await db.allAsync(query, params);
    
    let filteredProducts = products.map(p => {
      const rating = p.rating_count > 0 ? (p.rating_sum / p.rating_count) : 0;
      let parsedColors = [];
      try { parsedColors = JSON.parse(p.colors || '[]'); } catch (e) { parsedColors = []; }
      const parsedSizes = formatSizesForClient(p.sizes);
      const parsedImages = parseImagesForClient(p.images, p.image_url);
      return { ...p, rating, colors: parsedColors, sizes: parsedSizes, images: parsedImages };
    });

    if (min_rating) {
      const minRate = parseFloat(min_rating);
      filteredProducts = filteredProducts.filter(p => p.rating >= minRate);
    }

    if (productsCache.size > 200) {
      const oldestKeys = Array.from(productsCache.keys()).slice(0, 50);
      oldestKeys.forEach(k => productsCache.delete(k));
    }
    productsCache.set(cacheKey, { time: now, data: filteredProducts });

    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json(filteredProducts);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error_ar: 'خطأ في جلب المنتجات', error_en: 'Error fetching products', details: err.message });
  }
};

// Best Sellers: products ranked by total quantity sold
exports.getBestSellers = async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;
  const cacheKey = `best_sellers_${limit}`;
  const now = Date.now();
  const cached = productsCache.get(cacheKey);
  if (cached && (now - cached.time < PRODUCT_CACHE_TTL)) {
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.json(cached.data);
  }
  try {
    const rows = await db.allAsync(`
      SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en,
             m.name as merchant_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      WHERE (c.active = 1 OR c.active IS NULL) AND p.stock > 0
      ORDER BY p.id DESC
      LIMIT ?
    `, [limit]);

    const data = rows.map(p => {
      const rating = p.rating_count > 0 ? (p.rating_sum / p.rating_count) : 0;
      let parsedColors = [];
      try { parsedColors = JSON.parse(p.colors || '[]'); } catch (e) {}
      const parsedSizes = formatSizesForClient(p.sizes);
      const parsedImages = parseImagesForClient(p.images, p.image_url);
      return { ...p, rating, colors: parsedColors, sizes: parsedSizes, images: parsedImages };
    });

    productsCache.set(cacheKey, { time: now, data });
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json(data);
  } catch (err) {
    console.error('Best sellers error:', err);
    res.status(500).json({ error: 'Error fetching best sellers' });
  }
};

// New Arrivals Home: products added in last 14 days
exports.getNewArrivalsHome = async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;
  const cacheKey = `new_arrivals_home_${limit}`;
  const now = Date.now();
  const cached = productsCache.get(cacheKey);
  if (cached && (now - cached.time < PRODUCT_CACHE_TTL)) {
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.json(cached.data);
  }
  try {
    const rows = await db.allAsync(`
      SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en,
             m.name as merchant_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      WHERE (c.active = 1 OR c.active IS NULL) AND p.stock > 0
      ORDER BY p.id DESC
      LIMIT ?
    `, [limit]);

    const data = rows.map(p => {
      const rating = p.rating_count > 0 ? (p.rating_sum / p.rating_count) : 0;
      let parsedColors = [];
      try { parsedColors = JSON.parse(p.colors || '[]'); } catch (e) {}
      const parsedSizes = formatSizesForClient(p.sizes);
      const parsedImages = parseImagesForClient(p.images, p.image_url);
      return { ...p, rating, colors: parsedColors, sizes: parsedSizes, images: parsedImages };
    });

    productsCache.set(cacheKey, { time: now, data });
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json(data);
  } catch (err) {
    console.error('New arrivals home error:', err);
    res.status(500).json({ error: 'Error fetching new arrivals' });
  }
};

// Smart Recommendations: Similar products based on category & title keywords
exports.getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await db.getAsync('SELECT id, name_ar, name_en, category_id, price_usd FROM products WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const cleanAr = (current.name_ar || '').replace(/[^\u0621-\u064A\s]/g, ' ').trim();
    const cleanEn = (current.name_en || '').replace(/[^a-zA-Z\s]/g, ' ').trim();
    
    const stopwords = new Set(['مع', 'في', 'من', 'على', 'إلى', 'عن', 'طقم', 'عدد', 'حبة', 'قطع', 'أصلي', 'فاخر', 'ممتاز', 'جديد', 'the', 'and', 'for', 'with', 'set', 'of', 'pcs', 'in', 'to', 'a', 'an']);
    
    const words = [...cleanAr.split(/\s+/), ...cleanEn.split(/\s+/)]
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 3 && !stopwords.has(w));

    let relatedRows = [];
    
    // 1. Priority 1: Same category + keyword match
    if (words.length > 0 && current.category_id) {
      const keywordConditions = words.slice(0, 4).map(() => `(LOWER(p.name_ar) LIKE ? OR LOWER(p.name_en) LIKE ?)`).join(' OR ');
      const params = [current.id, current.category_id];
      words.slice(0, 4).forEach(w => {
        params.push(`%${w}%`, `%${w}%`);
      });
      params.push(12);

      relatedRows = await db.allAsync(`
        SELECT p.id, p.sku, p.name_ar, p.name_en, p.description_ar, p.description_en, p.price_usd, p.cost_price_usd, p.old_price_usd, 
               p.stock, p.category_id, p.merchant_id, p.is_new_arrival, p.rating_count, 
               p.rating_sum, p.colors, p.sizes, p.created_at, p.sync_batch_time,
               (CASE WHEN p.image_url LIKE 'data:image%' THEN CONCAT('/api/products/', p.id, '/image') ELSE p.image_url END) as image_url,
               (CASE WHEN p.images LIKE '%data:image%' THEN '[]' ELSE p.images END) as images,
               c.name_ar as category_name_ar, c.name_en as category_name_en, m.name as merchant_name 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN merchants m ON p.merchant_id = m.id
        WHERE p.id != ? AND p.category_id = ? AND (${keywordConditions}) AND (p.stock > 0)
        ORDER BY p.id DESC
        LIMIT ?
      `, params);
    }

    // 2. Priority 2: Same category fill
    if (relatedRows.length < 12 && current.category_id) {
      const existingIds = [current.id, ...relatedRows.map(r => r.id)];
      const needed = 12 - relatedRows.length;
      const placeholders = existingIds.map(() => '?').join(',');
      
      const catRows = await db.allAsync(`
        SELECT p.id, p.sku, p.name_ar, p.name_en, p.description_ar, p.description_en, p.price_usd, p.cost_price_usd, p.old_price_usd, 
               p.stock, p.category_id, p.merchant_id, p.is_new_arrival, p.rating_count, 
               p.rating_sum, p.colors, p.sizes, p.created_at, p.sync_batch_time,
               (CASE WHEN p.image_url LIKE 'data:image%' THEN CONCAT('/api/products/', p.id, '/image') ELSE p.image_url END) as image_url,
               (CASE WHEN p.images LIKE '%data:image%' THEN '[]' ELSE p.images END) as images,
               c.name_ar as category_name_ar, c.name_en as category_name_en, m.name as merchant_name 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN merchants m ON p.merchant_id = m.id
        WHERE p.id NOT IN (${placeholders}) AND p.category_id = ? AND (p.stock > 0)
        ORDER BY ABS(p.price_usd - ?) ASC, p.id DESC
        LIMIT ?
      `, [...existingIds, current.category_id, current.price_usd, needed]);

      relatedRows = [...relatedRows, ...catRows];
    }

    // 3. Fallback: Popular products from same merchant or store
    if (relatedRows.length < 6) {
      const existingIds = [current.id, ...relatedRows.map(r => r.id)];
      const needed = 8 - relatedRows.length;
      const placeholders = existingIds.map(() => '?').join(',');
      
      const generalRows = await db.allAsync(`
        SELECT p.id, p.sku, p.name_ar, p.name_en, p.description_ar, p.description_en, p.price_usd, p.cost_price_usd, p.old_price_usd, 
               p.stock, p.category_id, p.merchant_id, p.is_new_arrival, p.rating_count, 
               p.rating_sum, p.colors, p.sizes, p.created_at, p.sync_batch_time,
               (CASE WHEN p.image_url LIKE 'data:image%' THEN CONCAT('/api/products/', p.id, '/image') ELSE p.image_url END) as image_url,
               (CASE WHEN p.images LIKE '%data:image%' THEN '[]' ELSE p.images END) as images,
               c.name_ar as category_name_ar, c.name_en as category_name_en, m.name as merchant_name 
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN merchants m ON p.merchant_id = m.id
        WHERE p.id NOT IN (${placeholders}) AND (p.stock > 0)
        ORDER BY p.id DESC
        LIMIT ?
      `, [...existingIds, needed]);

      relatedRows = [...relatedRows, ...generalRows];
    }

    const formatted = relatedRows.map(p => {
      const rating = p.rating_count > 0 ? (p.rating_sum / p.rating_count) : 0;
      let parsedColors = [];
      try { parsedColors = JSON.parse(p.colors || '[]'); } catch (e) {}
      const parsedSizes = formatSizesForClient(p.sizes);
      const parsedImages = parseImagesForClient(p.images, p.image_url, p.id);
      return { ...p, rating, colors: parsedColors, sizes: parsedSizes, images: parsedImages };
    });

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(formatted);
  } catch (err) {
    console.error('getRelatedProducts error:', err);
    res.status(500).json({ error: 'Failed to fetch related products' });
  }
};

exports.getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await db.getAsync(`
      SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en, m.name as merchant_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      WHERE p.id = ?
    `, [id]);

    if (!product) {
      return res.status(404).json({ error_ar: 'المنتج غير موجود أو غير متاح حالياً', error_en: 'Product not found or currently unavailable' });
    }

    const rating = product.rating_count > 0 ? (product.rating_sum / product.rating_count) : 0;
    let parsedColors = [];
    try { parsedColors = JSON.parse(product.colors || '[]'); } catch (e) { parsedColors = []; }
    const parsedSizes = formatSizesForClient(product.sizes);
    const parsedImages = parseImagesForClient(product.images, product.image_url);
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json({ ...product, rating, colors: parsedColors, sizes: parsedSizes, images: parsedImages });
  } catch (err) {
    console.error('Get product by ID error:', err);
    res.status(500).json({ error_ar: 'خطأ في جلب تفاصيل المنتج', error_en: 'Error fetching product details' });
  }
};

exports.createProduct = async (req, res) => {
  const { name_ar, name_en, description_ar, description_en, price_usd, cost_price_usd, old_price_usd, category_id, merchant_id, stock, colors, sizes, images } = req.body;
  
  let imagesArray = [];
  if (images) {
    if (Array.isArray(images)) imagesArray = images;
    else {
      try { imagesArray = JSON.parse(images); } catch (e) { imagesArray = [images]; }
    }
  }

  if (req.files && req.files.length > 0) {
    req.files.forEach(f => {
      const b64 = fileToBase64(f);
      if (b64) imagesArray.push(b64);
    });
  } else if (req.file) {
    const b64 = fileToBase64(req.file);
    if (b64) imagesArray.push(b64);
  }

  if (req.body.image_url && !imagesArray.includes(req.body.image_url)) {
    imagesArray.unshift(req.body.image_url);
  }

  imagesArray = Array.from(new Set(imagesArray.filter(Boolean)));
  const primaryImageUrl = imagesArray[0] || req.body.image_url || '';
  const imagesStr = JSON.stringify(imagesArray);

  if (!name_ar || !name_en || !price_usd) {
    return res.status(400).json({ error_ar: 'الرجاء إدخال الحقول المطلوبة (الاسم والسعر)', error_en: 'Please enter required fields (name and price)' });
  }

  let cid = category_id && category_id !== 'null' ? parseInt(category_id) : null;
  const mid = merchant_id && merchant_id !== 'null' ? parseInt(merchant_id) : null;
  const oldPrice = old_price_usd && old_price_usd !== 'null' ? parseFloat(old_price_usd) : null;
  const costPrice = cost_price_usd ? parseFloat(cost_price_usd) : 0.0;
  const productStock = stock !== undefined && stock !== '' ? parseInt(stock) : 10;
  const colorsStr = typeof colors === 'string' ? colors : JSON.stringify(colors || []);
  const sizesStr = typeof sizes === 'string' ? sizes : JSON.stringify(sizes || []);

  let autoClassifiedCategory = null;

  // If added to staging draft category (103) or no category selected, automatically classify or create category
  try {
    if (!cid || cid === 103) {
      const match = await ensureProductCategory(
        { name_ar, name_en, description_ar, description_en, image_url: primaryImageUrl },
        db,
        invalidateCategoriesCache
      );
      if (match && match.category_id) {
        cid = match.category_id;
        autoClassifiedCategory = match;
      }
    }
  } catch (classErr) {
    console.warn('Auto classification error during createProduct:', classErr);
  }

  // Anti-Duplication Check: If product with same title already exists, update it instead of creating duplicate
  try {
    const normEn = (name_en || '').toLowerCase().trim();
    const normAr = (name_ar || '').toLowerCase().trim();
    
    let existingProd = null;
    if (normEn) {
      existingProd = await db.getAsync('SELECT * FROM products WHERE LOWER(TRIM(name_en)) = ? LIMIT 1', [normEn]);
    }
    if (!existingProd && normAr) {
      existingProd = await db.getAsync('SELECT * FROM products WHERE LOWER(TRIM(name_ar)) = ? LIMIT 1', [normAr]);
    }

    if (existingProd) {
      const targetCat = cid || existingProd.category_id;
      const targetMid = mid || existingProd.merchant_id;
      const targetImg = primaryImageUrl || existingProd.image_url;
      const targetStock = productStock > 0 ? productStock : existingProd.stock;

      await db.runAsync(`
        UPDATE products 
        SET name_ar = ?, name_en = ?, description_ar = ?, description_en = ?, 
            price_usd = ?, cost_price_usd = ?, old_price_usd = ?, 
            category_id = ?, merchant_id = ?, image_url = ?, images = ?, 
            stock = ?, colors = ?, sizes = ?
        WHERE id = ?
      `, [name_ar, name_en, description_ar || '', description_en || '', parseFloat(price_usd), costPrice, oldPrice, targetCat, targetMid, targetImg, imagesStr, targetStock, colorsStr, sizesStr, existingProd.id]);

      invalidateProductsCache();

      let parsedColors = [];
      try { parsedColors = JSON.parse(colorsStr); } catch (e) { parsedColors = []; }
      let parsedSizes = [];
      try { parsedSizes = JSON.parse(sizesStr); } catch (e) { parsedSizes = []; }

      return res.status(200).json({
        message_ar: `المنتج موجود مسبقاً! تم تحديث بياناته بنجاح لمنع التكرار (رقم المنتج #${existingProd.id})`,
        message_en: `Product already exists! Updated successfully to prevent duplicates (Product ID #${existingProd.id})`,
        is_duplicate_prevented: true,
        product: {
          id: existingProd.id,
          name_ar,
          name_en,
          description_ar,
          description_en,
          price_usd: parseFloat(price_usd),
          cost_price_usd: costPrice,
          old_price_usd: oldPrice,
          category_id: targetCat,
          merchant_id: targetMid,
          image_url: targetImg,
          images: imagesArray,
          stock: targetStock,
          colors: parsedColors,
          sizes: parsedSizes
        }
      });
    }
  } catch (dupErr) {
    console.warn('Anti-duplication check warning during createProduct:', dupErr);
  }

  try {
    const result = await db.runAsync(`
      INSERT INTO products (name_ar, name_en, description_ar, description_en, price_usd, cost_price_usd, old_price_usd, category_id, merchant_id, image_url, images, stock, colors, sizes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [name_ar, name_en, description_ar || '', description_en || '', parseFloat(price_usd), costPrice, oldPrice, cid, mid, primaryImageUrl, imagesStr, productStock, colorsStr, sizesStr]);

    invalidateProductsCache();

    let parsedColors = [];
    try { parsedColors = JSON.parse(colorsStr); } catch (e) { parsedColors = []; }
    let parsedSizes = [];
    try { parsedSizes = JSON.parse(sizesStr); } catch (e) { parsedSizes = []; }

    let messageAr = 'تم إضافة المنتج بنجاح';
    let messageEn = 'Product added successfully';
    if (autoClassifiedCategory) {
      if (autoClassifiedCategory.is_new) {
        messageAr = `تم إنشاء قسم جديد [ ${autoClassifiedCategory.category_name_ar} ] وإضافة المنتج إليه بنجاح!`;
        messageEn = `Created new category [ ${autoClassifiedCategory.category_name_en} ] and product assigned automatically!`;
      } else {
        messageAr = `تمت إضافة المنتج وفرزه تلقائياً إلى قسم [ ${autoClassifiedCategory.category_name_ar} ] بنجاح!`;
        messageEn = `Product added and automatically categorized under [ ${autoClassifiedCategory.category_name_en} ]!`;
      }
    }

    res.status(201).json({
      message_ar: messageAr,
      message_en: messageEn,
      auto_categorized: !!autoClassifiedCategory,
      classified_category: autoClassifiedCategory,
      product: {
        id: result.lastID,
        name_ar,
        name_en,
        description_ar,
        description_en,
        price_usd: parseFloat(price_usd),
        cost_price_usd: costPrice,
        old_price_usd: oldPrice,
        category_id: cid,
        merchant_id: mid,
        image_url: primaryImageUrl,
        images: imagesArray,
        stock: productStock,
        colors: parsedColors,
        sizes: parsedSizes
      }
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error_ar: 'خطأ في إضافة المنتج: ' + (err.message || ''), error_en: 'Error adding product: ' + (err.message || '') });
  }
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name_ar, name_en, description_ar, description_en, price_usd, cost_price_usd, old_price_usd, category_id, merchant_id, stock, colors, sizes, images, image_url } = req.body;

  try {
    const product = await db.getAsync('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error_ar: 'المنتج غير موجود', error_en: 'Product not found' });
    }

    let existingImages = [];
    try { existingImages = JSON.parse(product.images || '[]'); } catch (e) {}
    if (!Array.isArray(existingImages) || existingImages.length === 0) {
      if (product.image_url) existingImages = [product.image_url];
    }

    let imagesArray = [];
    if (images !== undefined) {
      if (Array.isArray(images)) imagesArray = images;
      else {
        try { imagesArray = JSON.parse(images); } catch (e) { imagesArray = [images]; }
      }
    } else {
      imagesArray = existingImages;
    }

    if (req.files && req.files.length > 0) {
      req.files.forEach(f => {
        const b64 = fileToBase64(f);
        if (b64) imagesArray.push(b64);
      });
    } else if (req.file) {
      const b64 = fileToBase64(req.file);
      if (b64) imagesArray.push(b64);
    }

    if (image_url && !imagesArray.includes(image_url)) {
      imagesArray.unshift(image_url);
    }

    imagesArray = Array.from(new Set(imagesArray.filter(Boolean)));
    const primaryImageUrl = imagesArray[0] || image_url || product.image_url || '';
    const imagesStr = JSON.stringify(imagesArray);

    const updatedNameAr = name_ar !== undefined ? name_ar : product.name_ar;
    const updatedNameEn = name_en !== undefined ? name_en : product.name_en;
    const updatedDescAr = description_ar !== undefined ? description_ar : (product.description_ar || '');
    const updatedDescEn = description_en !== undefined ? description_en : (product.description_en || '');
    const updatedPrice = price_usd !== undefined && price_usd !== '' ? parseFloat(price_usd) : product.price_usd;
    let cid = category_id !== undefined ? (category_id && category_id !== 'null' ? parseInt(category_id) : null) : product.category_id;
    const mid = merchant_id !== undefined ? (merchant_id && merchant_id !== 'null' ? parseInt(merchant_id) : null) : product.merchant_id;
    const oldPrice = old_price_usd !== undefined ? (old_price_usd && old_price_usd !== 'null' ? parseFloat(old_price_usd) : null) : product.old_price_usd;
    const costPrice = cost_price_usd !== undefined && cost_price_usd !== '' ? parseFloat(cost_price_usd) : product.cost_price_usd;
    const productStock = stock !== undefined && stock !== '' ? parseInt(stock) : product.stock;
    const colorsStr = colors !== undefined ? (typeof colors === 'string' ? colors : JSON.stringify(colors || [])) : product.colors;
    const sizesStr = sizes !== undefined ? (typeof sizes === 'string' ? sizes : JSON.stringify(sizes || [])) : product.sizes;

    // If category is draft/staging (103) or empty, attempt auto classification or create category
    try {
      if (!cid || cid === 103) {
        const match = await ensureProductCategory(
          { name_ar: updatedNameAr, name_en: updatedNameEn, description_ar: updatedDescAr, description_en: updatedDescEn, image_url: primaryImageUrl },
          db,
          invalidateCategoriesCache
        );
        if (match && match.category_id) {
          cid = match.category_id;
        }
      }
    } catch (e) {}

    await db.runAsync(`
      UPDATE products 
      SET name_ar = ?, name_en = ?, description_ar = ?, description_en = ?, price_usd = ?, cost_price_usd = ?, old_price_usd = ?, category_id = ?, merchant_id = ?, image_url = ?, images = ?, stock = ?, colors = ?, sizes = ?
      WHERE id = ?
    `, [updatedNameAr, updatedNameEn, updatedDescAr, updatedDescEn, updatedPrice, costPrice, oldPrice, cid, mid, primaryImageUrl, imagesStr, productStock, colorsStr, sizesStr, id]);

    invalidateProductsCache();

    let parsedColors = [];
    try { parsedColors = JSON.parse(colorsStr); } catch (e) { parsedColors = []; }
    let parsedSizes = [];
    try { parsedSizes = JSON.parse(sizesStr); } catch (e) { parsedSizes = []; }

    res.json({
      message_ar: 'تم تحديث المنتج بنجاح',
      message_en: 'Product updated successfully',
      product: {
        id: parseInt(id),
        name_ar: updatedNameAr,
        name_en: updatedNameEn,
        description_ar: updatedDescAr,
        description_en: updatedDescEn,
        price_usd: updatedPrice,
        cost_price_usd: costPrice,
        old_price_usd: oldPrice,
        category_id: cid,
        merchant_id: mid,
        image_url: primaryImageUrl,
        images: imagesArray,
        stock: productStock,
        colors: parsedColors,
        sizes: parsedSizes
      }
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error_ar: 'خطأ في تعديل المنتج: ' + (err.message || ''), error_en: 'Error updating product: ' + (err.message || '') });
  }
};

exports.bulkUpdateCategory = async (req, res) => {
  const { product_ids, category_id } = req.body;
  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return res.status(400).json({ error_ar: 'الرجاء تحديد المنتجات المراد نقلها', error_en: 'Please select products to move' });
  }
  const cid = category_id && category_id !== 'null' ? parseInt(category_id) : null;
  try {
    for (const pid of product_ids) {
      await db.runAsync('UPDATE products SET category_id = ? WHERE id = ?', [cid, pid]);
    }
    invalidateProductsCache();
    res.json({ 
      message_ar: `تم نقل ${product_ids.length} منتج إلى التصنيف الجديد بنجاح`, 
      message_en: `Successfully moved ${product_ids.length} products to new category` 
    });
  } catch (err) {
    console.error('Bulk update category error:', err);
    res.status(500).json({ error_ar: 'خطأ في نقل المنتجات', error_en: 'Error updating products category' });
  }
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await db.getAsync('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error_ar: 'المنتج غير موجود', error_en: 'Product not found' });
    }

    await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
    invalidateProductsCache();
    res.json({ message_ar: 'تم حذف المنتج بنجاح', message_en: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error_ar: 'خطأ في حذف المنتج', error_en: 'Error deleting product' });
  }
};

exports.rateProduct = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error_ar: 'التقييم يجب أن يكون بين ١ و ٥ نجوم', error_en: 'Rating must be between 1 and 5 stars' });
  }

  try {
    const product = await db.getAsync('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error_ar: 'المنتج غير موجود', error_en: 'Product not found' });
    }

    await db.runAsync(`
      UPDATE products 
      SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 
      WHERE id = ?
    `, [parseFloat(rating), id]);

    invalidateProductsCache();
    res.json({ message_ar: 'شكراً لتقييمك!', message_en: 'Thank you for your rating!' });
  } catch (err) {
    console.error('Rate product error:', err);
    res.status(500).json({ error_ar: 'خطأ أثناء تقييم المنتج', error_en: 'Error rating product' });
  }
};

exports.autoSortDrafts = async (req, res) => {
  try {
    // 1. Fetch all draft products currently in staging category (id=103 or null or draft code)
    const draftProducts = await db.allAsync(`
      SELECT p.* 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = 103 
         OR p.category_id IS NULL 
         OR c.code = 'ADMIN_STAGING_DRAFT'
         OR c.active = 0
      ORDER BY p.id DESC
    `);

    if (!draftProducts || draftProducts.length === 0) {
      return res.json({
        success: true,
        totalScanned: 0,
        sortedCount: 0,
        createdCategoriesCount: 0,
        sortedProducts: [],
        message_ar: 'لا توجد أي منتجات معلقة في مسودة الإضافة السريعة!',
        message_en: 'No pending products found in draft staging category!'
      });
    }

    const sortedProducts = [];
    let newCategoriesCreated = 0;

    for (const prod of draftProducts) {
      const match = await ensureProductCategory(prod, db, invalidateCategoriesCache);
      if (match && match.category_id && match.category_id !== 103) {
        await db.runAsync('UPDATE products SET category_id = ? WHERE id = ?', [match.category_id, prod.id]);
        if (match.is_new) newCategoriesCreated++;
        sortedProducts.push({
          id: prod.id,
          name_ar: prod.name_ar,
          name_en: prod.name_en,
          category_id: match.category_id,
          category_name_ar: match.category_name_ar,
          category_name_en: match.category_name_en,
          is_new: !!match.is_new,
          confidence: match.confidence
        });
      }
    }

    invalidateProductsCache();
    invalidateCategoriesCache();

    const messageAr = newCategoriesCreated > 0
      ? `تم فرز وتوزيع (${sortedProducts.length}) منتج بنجاح، وتم إنشاء (${newCategoriesCreated}) تصنيف جديد تلقائياً في المتجر!`
      : `تم فرز وتوزيع (${sortedProducts.length}) منتج بنجاح على أقسام المتجر!`;
    const messageEn = newCategoriesCreated > 0
      ? `Successfully categorized (${sortedProducts.length}) products, and created (${newCategoriesCreated}) new categories automatically!`
      : `Successfully categorized (${sortedProducts.length}) products into their matching categories!`;

    res.json({
      success: true,
      totalScanned: draftProducts.length,
      sortedCount: sortedProducts.length,
      createdCategoriesCount: newCategoriesCreated,
      sortedProducts,
      message_ar: messageAr,
      message_en: messageEn
    });
  } catch (err) {
    console.error('Auto sort drafts error:', err);
    res.status(500).json({ error_ar: 'خطأ في عملية الفرز التلقائي: ' + err.message, error_en: 'Error during auto sort: ' + err.message });
  }
};

function normalizeProductTitle(t) {
  if (!t) return '';
  return t.toLowerCase().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ');
}

exports.deduplicateProducts = async (req, res) => {
  try {
    const allProducts = await db.allAsync('SELECT * FROM products ORDER BY id ASC');
    const seenMap = new Map();
    const toDeleteIds = [];
    const updates = [];

    for (const prod of allProducts) {
      const normEn = normalizeProductTitle(prod.name_en);
      const normAr = normalizeProductTitle(prod.name_ar);
      const key = normEn || normAr;

      if (!key) continue;

      if (seenMap.has(key)) {
        const primary = seenMap.get(key);
        toDeleteIds.push(prod.id);

        let needsUpdate = false;
        if ((!primary.image_url || primary.image_url.length < 5) && prod.image_url) {
          primary.image_url = prod.image_url;
          needsUpdate = true;
        }
        if ((!primary.category_id || primary.category_id === 103) && prod.category_id && prod.category_id !== 103) {
          primary.category_id = prod.category_id;
          needsUpdate = true;
        }
        if (prod.stock > primary.stock) {
          primary.stock = prod.stock;
          needsUpdate = true;
        }
        if (needsUpdate) {
          updates.push(primary);
        }
      } else {
        seenMap.set(key, prod);
      }
    }

    for (const u of updates) {
      await db.runAsync(
        'UPDATE products SET image_url = ?, category_id = ?, stock = ? WHERE id = ?',
        [u.image_url, u.category_id, u.stock, u.id]
      );
    }

    for (const did of toDeleteIds) {
      try {
        await db.runAsync('DELETE FROM products WHERE id = ?', [did]);
      } catch (e) {}
    }

    invalidateProductsCache();

    res.json({
      success: true,
      scannedCount: allProducts.length,
      removedDuplicatesCount: toDeleteIds.length,
      cleanCount: allProducts.length - toDeleteIds.length,
      message_ar: toDeleteIds.length > 0 
        ? `تم فحص المتجر وإزالة (${toDeleteIds.length}) منتج مكرر بنجاح!` 
        : 'المتجر نظيف تماماً! لا يوجد أي منتجات مكررة.',
      message_en: toDeleteIds.length > 0 
        ? `Successfully removed (${toDeleteIds.length}) duplicate products!` 
        : 'No duplicate products found. Store is clean!'
    });
  } catch (err) {
    console.error('Deduplicate products error:', err);
    res.status(500).json({ error_ar: 'خطأ أثناء إزالة التكرار: ' + err.message, error_en: 'Error deduplicating products: ' + err.message });
  }
};


