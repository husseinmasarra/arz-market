const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken, requireAdmin, requirePermission } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const couponController = require('../controllers/couponController');
const settingsController = require('../controllers/settingsController');
const chatController = require('../controllers/chatController');
const merchantController = require('../controllers/merchantController');
const cartController = require('../controllers/cartController');
const sitemapController = require('../controllers/sitemapController');

// --- SEO Sitemap Route ---
router.get('/sitemap.xml', sitemapController.getSitemapXml);

// --- Auth Routes ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleAuth);
router.post('/auth/apple', authController.appleAuth);
router.get('/auth/profile', authenticateToken, authController.getProfile);

// --- User Management (Admin Only) ---
router.get('/admin/users', authenticateToken, requirePermission('users'), authController.getUsers);
router.put('/admin/users/:id/permissions', authenticateToken, requirePermission('users'), authController.updateUserRoleAndPermissions);

// --- Category Routes ---
router.get('/categories', categoryController.getCategories);
router.put('/categories-reorder', authenticateToken, requirePermission('categories'), categoryController.reorderCategories);
router.post('/categories', authenticateToken, requirePermission('categories'), upload.single('category_image'), categoryController.createCategory);
router.put('/categories/:id', authenticateToken, requirePermission('categories'), upload.single('category_image'), categoryController.updateCategory);
router.delete('/categories/:id', authenticateToken, requirePermission('categories'), categoryController.deleteCategory);

// --- Product Routes ---
router.get('/products/best-sellers', productController.getBestSellers);
router.get('/products/new-arrivals-home', productController.getNewArrivalsHome);
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products/bulk-whatsapp', productController.bulkCreateProducts);
router.post('/products', authenticateToken, requirePermission('products'), upload.single('product_image'), productController.createProduct);
router.put('/products/:id', authenticateToken, requirePermission('products'), upload.single('product_image'), productController.updateProduct);
router.delete('/products/:id', authenticateToken, requirePermission('products'), productController.deleteProduct);
router.post('/products/:id/rate', productController.rateProduct);

// --- Order Routes ---
router.post('/orders', authenticateToken, orderController.createOrder);

router.get('/orders', authenticateToken, requirePermission('orders'), orderController.getOrders);
router.get('/orders/history', authenticateToken, orderController.getUserOrders);
router.get('/orders/:id', authenticateToken, orderController.getOrderById);
router.put('/orders/:id/status', authenticateToken, requirePermission('orders'), orderController.updateOrderStatus);
router.delete('/orders/:id', authenticateToken, requireAdmin, orderController.deleteOrder);

// --- Coupon Routes ---
router.get('/coupons', authenticateToken, couponController.getCoupons);
router.post('/coupons', authenticateToken, requirePermission('coupons'), couponController.createCoupon);
router.delete('/coupons/:id', authenticateToken, requirePermission('coupons'), couponController.deleteCoupon);

// --- Cart Sync & Admin Routes ---
router.post('/cart/sync', authenticateToken, cartController.syncCart);
router.get('/cart/my-cart', authenticateToken, cartController.getMyCart);
router.get('/admin/carts', authenticateToken, requireAdmin, cartController.getAdminCarts);

// --- Settings Routes ---
router.get('/settings', settingsController.getSettings);
router.put('/settings', authenticateToken, requirePermission('settings'), upload.single('logo'), settingsController.updateSettings);
router.put('/settings/banners', authenticateToken, requirePermission('settings'), upload.any(), settingsController.updateBanners);
router.post('/analytics/hit', settingsController.trackHit);
router.get('/reports', authenticateToken, requirePermission('reports'), orderController.getReports);

// --- Chat Routes ---
router.post('/chat/send', authenticateToken, chatController.sendMessage);
router.get('/chat/history', authenticateToken, chatController.getChatHistory);
router.get('/chat/users', authenticateToken, requirePermission('chat'), chatController.getChatUsers);

// --- Merchant Routes ---
router.get('/merchants', authenticateToken, requirePermission('merchants'), merchantController.getMerchants);
router.post('/merchants', authenticateToken, requirePermission('merchants'), merchantController.createMerchant);
router.put('/merchants/:id', authenticateToken, requirePermission('merchants'), merchantController.updateMerchant);
router.delete('/merchants/:id', authenticateToken, requirePermission('merchants'), merchantController.deleteMerchant);

// --- Supplier Sources Routes (Multi-Supplier Catalog Sync) ---
const supplierSourceController = require('../controllers/supplierSourceController');
router.get('/supplier-sources', authenticateToken, requirePermission('settings'), supplierSourceController.getSources);
router.post('/supplier-sources', authenticateToken, requirePermission('settings'), supplierSourceController.createSource);
router.put('/supplier-sources/:id', authenticateToken, requirePermission('settings'), supplierSourceController.updateSource);
router.delete('/supplier-sources/:id', authenticateToken, requirePermission('settings'), supplierSourceController.deleteSource);
router.post('/supplier-sources/:id/sync', authenticateToken, requirePermission('settings'), supplierSourceController.syncSource);

// --- DR PHONE Wholesale Sync Routes ---
const { syncDrPhoneToArzMart } = require('../utils/drphone_sync_service');
router.post('/drphone/sync', authenticateToken, requirePermission('settings'), async (req, res) => {
  try {
    const { url, passcode, markupPercent } = req.body || {};
    const result = await syncDrPhoneToArzMart({ url, passcode, markupPercent });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/drphone/status', async (req, res) => {
  try {
    const db = require('../config/db');
    const settings = await db.getAsync("SELECT supplier_catalog_url, supplier_catalog_passcode, supplier_markup_percent, last_sync_time, last_sync_status FROM settings ORDER BY id DESC LIMIT 1");
    const products = await db.getAsync("SELECT count(*) as c FROM products WHERE merchant_id = (SELECT id FROM merchants WHERE name = 'DR PHONE Wholesale')");
    const total = await db.getAsync("SELECT count(*) as c FROM products");
    const categoriesCount = await db.getAsync("SELECT count(*) as c FROM categories");
    res.json({
      merchant: 'DR PHONE Wholesale',
      drphoneProductsCount: products ? products.c : 0,
      totalStoreProducts: total ? total.c : 0,
      totalCategories: categoriesCount ? categoriesCount.c : 0,
      supplierUrl: settings ? (settings.supplier_catalog_url || 'https://drphonewholesale.online') : 'https://drphonewholesale.online',
      supplierPasscode: settings ? (settings.supplier_catalog_passcode || 'Drphone123') : 'Drphone123',
      activeMarkup: (settings && settings.supplier_markup_percent ? settings.supplier_markup_percent : 45) + '%',
      lastSyncTime: settings ? settings.last_sync_time : '',
      lastSyncStatus: settings ? settings.last_sync_status : ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Deal.com.lb Sync Routes ---
const { syncDealLebanon } = require('../utils/deal_sync_service');
router.post('/deal/sync', authenticateToken, requirePermission('settings'), async (req, res) => {
  try {
    const { markupPercent = 18 } = req.body || {};
    const result = await syncDealLebanon({ markupPercent: parseFloat(markupPercent) || 18 });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/deal/status', async (req, res) => {
  try {
    const db = require('../config/db');
    const dealMerchant = await db.getAsync("SELECT id FROM merchants WHERE name = 'Deal.com.lb'");
    const dealProducts = dealMerchant ? await db.getAsync("SELECT count(*) as c FROM products WHERE merchant_id = ?", [dealMerchant.id]) : { c: 0 };
    const total = await db.getAsync("SELECT count(*) as c FROM products");
    const categoriesCount = await db.getAsync("SELECT count(*) as c FROM categories");
    res.json({
      merchant: 'Deal.com.lb',
      dealProductsCount: dealProducts ? dealProducts.c : 0,
      totalStoreProducts: total ? total.c : 0,
      totalCategories: categoriesCount ? categoriesCount.c : 0,
      activeMarkup: '18%'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
