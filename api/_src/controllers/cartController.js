const db = require('../config/db');

// Sync user cart from frontend (Authenticated user)
exports.syncCart = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ error_ar: 'يجب تسجيل الدخول لمزامنة السلة', error_en: 'Login required to sync cart' });
    }

    const { items, total_usd } = req.body;
    const cartItems = Array.isArray(items) ? items : [];
    const itemsCount = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
    const totalUsd = Number(total_usd) || 0;
    const itemsJson = JSON.stringify(cartItems);

    if (itemsCount === 0) {
      // If cart is empty, remove the record
      await db.runAsync('DELETE FROM user_carts WHERE user_id = ?', [userId]);
      return res.json({ success: true, message: 'Cart cleared' });
    }

    // Upsert into user_carts
    await db.runAsync(`
      INSERT INTO user_carts (user_id, items, total_usd, items_count, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE
      SET items = EXCLUDED.items,
          total_usd = EXCLUDED.total_usd,
          items_count = EXCLUDED.items_count,
          updated_at = CURRENT_TIMESTAMP
    `, [userId, itemsJson, totalUsd, itemsCount]);

    res.json({ success: true, message: 'Cart synced successfully' });
  } catch (err) {
    console.error('[CartSync Error]:', err);
    res.status(500).json({ error_ar: 'فشل مزامنة السلة', error_en: 'Failed to sync cart' });
  }
};

// Get current user's saved cart (e.g. on login if local cart is empty)
exports.getMyCart = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ error_ar: 'يجب تسجيل الدخول', error_en: 'Unauthorized' });
    }

    const cart = await db.getAsync('SELECT * FROM user_carts WHERE user_id = ?', [userId]);
    if (!cart) {
      return res.json({ items: [], total_usd: 0, items_count: 0 });
    }

    let parsedItems = [];
    try {
      parsedItems = JSON.parse(cart.items || '[]');
    } catch (e) {
      parsedItems = [];
    }

    res.json({
      items: parsedItems,
      total_usd: cart.total_usd,
      items_count: cart.items_count,
      updated_at: cart.updated_at
    });
  } catch (err) {
    console.error('[GetMyCart Error]:', err);
    res.status(500).json({ error_ar: 'خطأ في جلب السلة', error_en: 'Error fetching cart' });
  }
};

// Admin view all active carts
exports.getAdminCarts = async (req, res) => {
  try {
    const carts = await db.allAsync(`
      SELECT 
        c.id,
        c.user_id,
        c.items,
        c.total_usd,
        c.items_count,
        c.updated_at,
        u.username,
        u.full_name,
        u.phone,
        u.email
      FROM user_carts c
      JOIN users u ON c.user_id = u.id
      WHERE c.items_count > 0
      ORDER BY c.updated_at DESC
    `);

    const formattedCarts = (carts || []).map(c => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(c.items || '[]');
      } catch (e) {
        parsedItems = [];
      }
      return {
        ...c,
        items: parsedItems
      };
    });

    res.json(formattedCarts);
  } catch (err) {
    console.error('[GetAdminCarts Error]:', err);
    res.status(500).json({ error_ar: 'خطأ في جلب سلات الزبائن', error_en: 'Error fetching customer carts' });
  }
};
