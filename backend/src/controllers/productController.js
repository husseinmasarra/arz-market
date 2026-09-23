const db = require('../config/db');
const { fileToBase64 } = require('../utils/fileHelper');

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

exports.getProducts = async (req, res) => {
  const cacheKey = JSON.stringify(req.query);
  const now = Date.now();
  const cached = productsCache.get(cacheKey);
  if (cached && (now - cached.time < PRODUCT_CACHE_TTL)) {
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.json(cached.data);
  }

  const { category_id, search, min_price, max_price, min_rating, all, include_inactive, new_arrivals, out_of_stock, merchant_name } = req.query;
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

  let query = showAll ? `
    SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en, m.name as merchant_name 
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN merchants m ON p.merchant_id = m.id
    WHERE 1=1
  ` : `
    SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en, m.name as merchant_name 
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id
    LEFT JOIN merchants m ON p.merchant_id = m.id
    WHERE (c.active = 1 OR c.active IS NULL)
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
        params.push(p1, p1, p1, p1, p1, p1, p1, p2, p2);
      } else {
        query += ` AND (
          LOWER(p.name_en) LIKE ? OR 
          LOWER(p.name_ar) LIKE ? OR 
          LOWER(p.description_en) LIKE ? OR 
          LOWER(p.description_ar) LIKE ? OR 
          LOWER(COALESCE(c.name_en, '')) LIKE ? OR 
          LOWER(COALESCE(c.name_ar, '')) LIKE ? OR 
          LOWER(COALESCE(m.name, '')) LIKE ?
        )`;
        const p1 = `%${termLower}%`;
        params.push(p1, p1, p1, p1, p1, p1, p1);
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

  try {
    const products = await db.allAsync(query, params);
    
    let filteredProducts = products.map(p => {
      const rating = p.rating_count > 0 ? (p.rating_sum / p.rating_count) : 0;
      let parsedColors = [];
      try { parsedColors = JSON.parse(p.colors || '[]'); } catch (e) { parsedColors = []; }
      const parsedSizes = formatSizesForClient(p.sizes);
      return { ...p, rating, colors: parsedColors, sizes: parsedSizes };
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
    res.status(500).json({ error_ar: 'خطأ في جلب المنتجات', error_en: 'Error fetching products' });
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
             m.name as merchant_name,
             COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      WHERE (c.active = 1 OR c.active IS NULL) AND p.stock > 0
      GROUP BY p.id
      ORDER BY total_sold DESC, p.id DESC
      LIMIT ?
    `, [limit]);

    const data = rows.map(p => {
      const rating = p.rating_count > 0 ? (p.rating_sum / p.rating_count) : 0;
      let parsedColors = [];
      try { parsedColors = JSON.parse(p.colors || '[]'); } catch (e) {}
      const parsedSizes = formatSizesForClient(p.sizes);
      return { ...p, rating, colors: parsedColors, sizes: parsedSizes };
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
      return { ...p, rating, colors: parsedColors, sizes: parsedSizes };
    });

    productsCache.set(cacheKey, { time: now, data });
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json(data);
  } catch (err) {
    console.error('New arrivals home error:', err);
    res.status(500).json({ error: 'Error fetching new arrivals' });
  }
};

exports.getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await db.getAsync(`
      SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en, m.name as merchant_name 
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      WHERE p.id = ? AND (c.active = 1 OR c.active IS NULL)
    `, [id]);

    if (!product) {
      return res.status(404).json({ error_ar: 'المنتج غير موجود أو غير متاح حالياً', error_en: 'Product not found or currently unavailable' });
    }

    const rating = product.rating_count > 0 ? (product.rating_sum / product.rating_count) : 0;
    let parsedColors = [];
    try { parsedColors = JSON.parse(product.colors || '[]'); } catch (e) { parsedColors = []; }
    const parsedSizes = formatSizesForClient(product.sizes);
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json({ ...product, rating, colors: parsedColors, sizes: parsedSizes });
  } catch (err) {
    console.error('Get product by ID error:', err);
    res.status(500).json({ error_ar: 'خطأ في جلب تفاصيل المنتج', error_en: 'Error fetching product details' });
  }
};

exports.createProduct = async (req, res) => {
  const { name_ar, name_en, description_ar, description_en, price_usd, cost_price_usd, old_price_usd, category_id, merchant_id, stock, colors, sizes } = req.body;
  const imageUrl = req.file ? fileToBase64(req.file) : (req.body.image_url || '');

  if (!name_ar || !name_en || !price_usd) {
    return res.status(400).json({ error_ar: 'الرجاء إدخال الحقول المطلوبة (الاسم والسعر)', error_en: 'Please enter required fields (name and price)' });
  }

  const cid = category_id && category_id !== 'null' ? parseInt(category_id) : null;
  const mid = merchant_id && merchant_id !== 'null' ? parseInt(merchant_id) : null;
  const oldPrice = old_price_usd && old_price_usd !== 'null' ? parseFloat(old_price_usd) : null;
  const costPrice = cost_price_usd ? parseFloat(cost_price_usd) : 0.0;
  const productStock = stock ? parseInt(stock) : 10;
  const colorsStr = typeof colors === 'string' ? colors : JSON.stringify(colors || []);
  const sizesStr = typeof sizes === 'string' ? sizes : JSON.stringify(sizes || []);

  try {
    const result = await db.runAsync(`
      INSERT INTO products (name_ar, name_en, description_ar, description_en, price_usd, cost_price_usd, old_price_usd, category_id, merchant_id, image_url, stock, colors, sizes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name_ar, name_en, description_ar, description_en, parseFloat(price_usd), costPrice, oldPrice, cid, mid, imageUrl, productStock, colorsStr, sizesStr]);

    invalidateProductsCache();

    res.status(201).json({
      message_ar: 'تم إضافة المنتج بنجاح',
      message_en: 'Product added successfully',
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
        image_url: imageUrl,
        stock: productStock,
        colors: JSON.parse(colorsStr),
        sizes: JSON.parse(sizesStr)
      }
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error_ar: 'خطأ في إضافة المنتج', error_en: 'Error adding product' });
  }
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name_ar, name_en, description_ar, description_en, price_usd, cost_price_usd, old_price_usd, category_id, merchant_id, stock, colors, sizes } = req.body;

  try {
    const product = await db.getAsync('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error_ar: 'المنتج غير موجود', error_en: 'Product not found' });
    }

    let imageUrl = product.image_url;
    if (req.file) {
      imageUrl = fileToBase64(req.file) || product.image_url;
    }

    const cid = category_id && category_id !== 'null' ? parseInt(category_id) : null;
    const mid = merchant_id && merchant_id !== 'null' ? parseInt(merchant_id) : null;
    const oldPrice = old_price_usd && old_price_usd !== 'null' ? parseFloat(old_price_usd) : null;
    const costPrice = cost_price_usd ? parseFloat(cost_price_usd) : product.cost_price_usd;
    const productStock = stock ? parseInt(stock) : product.stock;
    const colorsStr = typeof colors === 'string' ? colors : JSON.stringify(colors || []);
    const sizesStr = typeof sizes === 'string' ? sizes : JSON.stringify(sizes || []);

    await db.runAsync(`
      UPDATE products 
      SET name_ar = ?, name_en = ?, description_ar = ?, description_en = ?, price_usd = ?, cost_price_usd = ?, old_price_usd = ?, category_id = ?, merchant_id = ?, image_url = ?, stock = ?, colors = ?, sizes = ?
      WHERE id = ?
    `, [name_ar, name_en, description_ar, description_en, parseFloat(price_usd), costPrice, oldPrice, cid, mid, imageUrl, productStock, colorsStr, sizesStr, id]);

    invalidateProductsCache();

    res.json({
      message_ar: 'تم تحديث المنتج بنجاح',
      message_en: 'Product updated successfully',
      product: {
        id: parseInt(id),
        name_ar,
        name_en,
        description_ar,
        description_en,
        price_usd: parseFloat(price_usd),
        cost_price_usd: costPrice,
        old_price_usd: oldPrice,
        category_id: cid,
        merchant_id: mid,
        image_url: imageUrl,
        stock: productStock,
        colors: JSON.parse(colorsStr),
        sizes: JSON.parse(sizesStr)
      }
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error_ar: 'خطأ في تعديل المنتج', error_en: 'Error updating product' });
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
