const db = require('../config/db');

exports.createOrder = async (req, res) => {
  const { phone, address, items, coupon_code, payment_method, notes } = req.body;
  const userId = req.user ? req.user.id : null;
  const userName = req.user ? req.user.username : 'Guest';

  if (!userId) {
    return res.status(401).json({ 
      error_ar: 'يرجى تسجيل الدخول بالبريد الإلكتروني أو رقم الهاتف لتأكيد الطلبية ومراجعة طلباتك السابقة', 
      error_en: 'Please log in with email or phone to confirm your order and review past orders' 
    });
  }

  if (!phone || !address || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error_ar: 'الرجاء إدخال رقم الهاتف، العنوان والمنتجات', error_en: 'Please provide phone, address, and items' });
  }

  try {
    const settings = await db.getAsync('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    const exchangeRate = settings ? settings.exchange_rate : 89500;
    const baseDeliveryFee = settings ? settings.delivery_fee : 4;
    const freeDeliveryThreshold = settings ? settings.free_delivery_threshold : 50;

    let subtotalUsd = 0;
    let totalCostUsd = 0; // Cumulative cost price for the order
    const orderItemsDetails = [];

    for (const item of items) {
      const product = await db.getAsync(`
        SELECT p.*, m.name as merchant_name 
        FROM products p 
        LEFT JOIN merchants m ON p.merchant_id = m.id 
        WHERE p.id = ?
      `, [item.product_id]);
      if (!product) {
        return res.status(400).json({ error_ar: `المنتج غير موجود`, error_en: `Product not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error_ar: `عذراً، الكمية المطلوبة من ${product.name_ar} غير متوفرة. المتبقي: ${product.stock}`,
          error_en: `Sorry, requested quantity for ${product.name_en} is not available. In stock: ${product.stock}`
        });
      }

      // Resolve size-specific price
      let itemPrice = product.price_usd;
      if (item.selectedSize && product.sizes) {
        try {
          const parsedSizes = JSON.parse(product.sizes || '[]');
          const matchingSizeOption = parsedSizes.find(s => {
            const optName = typeof s === 'object' && s !== null ? (s.name || '') : String(s);
            const cleanS = optName.replace(/\s+/g, '').toUpperCase();
            const cleanSelected = String(item.selectedSize).replace(/\s+/g, '').toUpperCase();
            return cleanS.startsWith(cleanSelected) || cleanSelected.startsWith(cleanS);
          });
          if (matchingSizeOption) {
            if (typeof matchingSizeOption === 'object' && matchingSizeOption.price !== undefined && matchingSizeOption.price !== null) {
              itemPrice = Number(matchingSizeOption.price);
            } else {
              const optStr = String(matchingSizeOption);
              const priceRegex = /\(\s*[+-]?\s*\$?\s*([0-9.]+)\s*\$?_?\)/;
              const match = optStr.match(priceRegex);
              if (match) {
                const val = parseFloat(match[1]);
                const isRelative = optStr.includes('+') || optStr.includes('-');
                if (isRelative) {
                  const isNegative = optStr.includes('-');
                  itemPrice = isNegative ? (product.price_usd - val) : (product.price_usd + val);
                } else {
                  itemPrice = val;
                }
              }
            }
          }
        } catch (e) {
          console.error('Error parsing size price offset on backend:', e);
        }
      }

      const itemCost = itemPrice * item.quantity;
      const itemCostPrice = product.cost_price_usd * item.quantity;

      subtotalUsd += itemCost;
      totalCostUsd += itemCostPrice;

      orderItemsDetails.push({
        product_id: product.id,
        name_ar: product.name_ar,
        name_en: product.name_en,
        image_url: product.image_url,
        price_usd: itemPrice,
        cost_price_usd: product.cost_price_usd,
        quantity: item.quantity,
        merchant_name: product.merchant_name || '',
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
        customer_note: item.customer_note || item.customerNote || item.notes || ''
      });

      // Deduct stock
      await db.runAsync('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, product.id]);
    }

    // Handle discounts
    let discountPercent = 0;

    if (coupon_code) {
      const code = coupon_code.toUpperCase().trim();
      const coupon = await db.getAsync('SELECT * FROM coupons WHERE code = ? AND active = 1', [code]);
      if (coupon) {
        discountPercent = coupon.discount_percent;
      } else {
        return res.status(400).json({ error_ar: 'كوبون الخصم غير صحيح أو منتهي الصلاحية', error_en: 'Invalid or expired coupon code' });
      }
    }

    const discountAmountUsd = subtotalUsd * (discountPercent / 100);
    const subtotalAfterDiscountUsd = subtotalUsd - discountAmountUsd;

    const deliveryFeeUsd = subtotalAfterDiscountUsd >= freeDeliveryThreshold ? 0 : baseDeliveryFee;

    const totalUsd = subtotalAfterDiscountUsd + deliveryFeeUsd;
    const totalLbp = totalUsd * exchangeRate;
    const deliveryFeeLbp = deliveryFeeUsd * exchangeRate;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `ARZ-${dateStr}-${randomSuffix}`;

    const result = await db.runAsync(`
      INSERT INTO orders (user_id, user_name, phone, address, items, total_usd, total_lbp, total_cost_usd, delivery_fee_usd, delivery_fee_lbp, status, tracking_number, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `, [
      userId,
      userName,
      phone,
      address,
      JSON.stringify(orderItemsDetails),
      totalUsd,
      totalLbp,
      totalCostUsd,
      deliveryFeeUsd,
      deliveryFeeLbp,
      trackingNumber,
      payment_method || 'COD',
      notes || ''
    ]);


    // Clear saved cart in DB upon successful order creation
    if (userId) {
      await db.runAsync('DELETE FROM user_carts WHERE user_id = ?', [userId]).catch(() => {});
    }

    res.status(201).json({
      message_ar: 'تم تسجيل طلبيتك بنجاح!',
      message_en: 'Your order was successfully registered!',
      tracking_number: trackingNumber,
      order: {
        id: result.lastID,
        total_usd: totalUsd,
        total_lbp: totalLbp,
        delivery_fee_usd: deliveryFeeUsd,
        tracking_number: trackingNumber,
        notes: notes || ''
      }
    });

    if (global.notifyAdminOfNewOrder) {
      global.notifyAdminOfNewOrder({
        id: result.lastID,
        user_name: userName,
        total_usd: totalUsd,
        tracking_number: trackingNumber,
        notes: notes || '',
        created_at: new Date()
      });
    }

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error_ar: 'خطأ أثناء تسجيل الطلبية', error_en: 'Error placing order' });
  }
};

exports.getOrders = async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC';

  try {
    const orders = await db.allAsync(query, params);

    // Fetch supplier contact details to enrich items for dropshipping
    let supplierMap = {};
    try {
      const sources = await db.allAsync('SELECT name, phone, email, whatsapp_number, shipping_notes FROM supplier_sources');
      const merchants = await db.allAsync('SELECT name, phone, email, whatsapp_number FROM merchants');
      (sources || []).forEach(s => {
        supplierMap[s.name.toLowerCase().trim()] = {
          phone: s.phone || '',
          email: s.email || '',
          whatsapp_number: s.whatsapp_number || s.phone || '',
          shipping_notes: s.shipping_notes || ''
        };
      });
      (merchants || []).forEach(m => {
        const key = m.name.toLowerCase().trim();
        if (!supplierMap[key]) {
          supplierMap[key] = {
            phone: m.phone || '',
            email: m.email || '',
            whatsapp_number: m.whatsapp_number || m.phone || '',
            shipping_notes: ''
          };
        }
      });
    } catch (e) {
      console.error('Error loading supplier contact map:', e);
    }

    const formattedOrders = orders.map(o => {
      const parsedItems = JSON.parse(o.items || '[]');
      const enrichedItems = parsedItems.map(item => {
        const key = (item.merchant_name || '').toLowerCase().trim();
        const contact = supplierMap[key] || {};
        return {
          ...item,
          supplier_phone: contact.phone || '',
          supplier_email: contact.email || '',
          supplier_whatsapp: contact.whatsapp_number || contact.phone || '',
          supplier_shipping_notes: contact.shipping_notes || ''
        };
      });
      return {
        ...o,
        items: enrichedItems
      };
    });
    res.json(formattedOrders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error_ar: 'خطأ في جلب الطلبيات', error_en: 'Error fetching orders' });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await db.allAsync("SELECT * FROM orders WHERE user_id = ? AND status != 'archived' ORDER BY id DESC", [req.user.id]);
    const formattedOrders = orders.map(o => ({
      ...o,
      items: JSON.parse(o.items)
    }));
    res.json(formattedOrders);
  } catch (err) {
    console.error('Get user orders error:', err);
    res.status(500).json({ error_ar: 'خطأ في جلب طلبياتك السابقة', error_en: 'Error fetching order history' });
  }
};

exports.getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await db.getAsync('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error_ar: 'الطلبية غير موجودة', error_en: 'Order not found' });
    }
    res.json({
      ...order,
      items: JSON.parse(order.items)
    });
  } catch (err) {
    res.status(500).json({ error_ar: 'خطأ في جلب الطلبية', error_en: 'Error fetching order' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, supplier_fulfillment_status } = req.body;

  try {
    const order = await db.getAsync('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error_ar: 'الطلبية غير موجودة', error_en: 'Order not found' });
    }

    if (supplier_fulfillment_status) {
      await db.runAsync('UPDATE orders SET supplier_fulfillment_status = ? WHERE id = ?', [supplier_fulfillment_status, id]);
    }

    if (status) {
      if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'archived'].includes(status)) {
        return res.status(400).json({ error_ar: 'حالة الطلب غير صالحة', error_en: 'Invalid order status' });
      }

      // Cancelled status is restricted to general manager/admin only
      if (status === 'cancelled' && req.user.role !== 'admin') {
        return res.status(403).json({ 
          error_ar: 'عذراً، إلغاء الطلبيات مسموح به للمدير العام فقط وليس للموظفين', 
          error_en: 'Forbidden, only the general manager can cancel orders' 
        });
      }

      // Restore stock if status changes to cancelled
      if (status === 'cancelled' && order.status !== 'cancelled') {
        try {
          const items = JSON.parse(order.items || '[]');
          for (const item of items) {
            if (item.product_id && item.quantity) {
              await db.runAsync('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
            }
          }
        } catch (e) {
          console.error('Error restoring stock for cancelled order:', e);
        }
      }

      await db.runAsync('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    }

    res.json({ message_ar: 'تم تحديث حالة الطلبية بنجاح', message_en: 'Order status updated successfully' });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error_ar: 'خطأ في تعديل حالة الطلبية', error_en: 'Error updating order status' });
  }
};

exports.deleteOrder = async (req, res) => {
  const { id } = req.params;

  // Restrict order deletion to general manager/admin only
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error_ar: 'عذراً، أرشفة الطلبيات مسموح بها للمدير العام فقط وليس للموظفين', 
      error_en: 'Forbidden, only the general manager can archive orders' 
    });
  }

  try {
    const order = await db.getAsync('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error_ar: 'الطلبية غير موجودة', error_en: 'Order not found' });
    }

    // Restore stock if archiving from an active state
    if (order.status !== 'cancelled' && order.status !== 'archived') {
      try {
        const items = JSON.parse(order.items || '[]');
        for (const item of items) {
          if (item.product_id && item.quantity) {
            await db.runAsync('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
          }
        }
      } catch (e) {
        console.error('Error restoring stock for archived order:', e);
      }
    }

    await db.runAsync("UPDATE orders SET status = 'archived' WHERE id = ?", [id]);
    res.json({ message_ar: 'تم نقل الطلبية إلى الأرشيف بنجاح', message_en: 'Order archived successfully' });
  } catch (err) {
    res.status(500).json({ error_ar: 'خطأ في أرشفة الطلبية', error_en: 'Error archiving order' });
  }
};


exports.getReports = async (req, res) => {
  try {
    // Sales, cost of sales, and true profit summaries
    const stats = await db.getAsync(`
      SELECT 
        COUNT(CASE WHEN status != 'archived' THEN 1 END) as total_orders,
        SUM(CASE WHEN status = 'delivered' THEN total_usd ELSE 0 END) as delivered_revenue_usd,
        SUM(CASE WHEN status = 'delivered' THEN total_lbp ELSE 0 END) as delivered_revenue_lbp,
        SUM(CASE WHEN status = 'delivered' THEN total_cost_usd ELSE 0 END) as delivered_cost_usd,
        SUM(CASE WHEN status != 'delivered' AND status != 'cancelled' AND status != 'archived' THEN total_usd ELSE 0 END) as pending_revenue_usd,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
      FROM orders
    `);

    const exchangeRateRow = await db.getAsync('SELECT exchange_rate FROM settings ORDER BY id DESC LIMIT 1');
    const exchangeRate = exchangeRateRow ? exchangeRateRow.exchange_rate : 89500;

    const deliveredRevenueUsd = stats.delivered_revenue_usd || 0;
    const deliveredCostUsd = stats.delivered_cost_usd || 0;
    
    // Net profit is total selling revenue minus total cost of items sold
    const netProfitUsd = deliveredRevenueUsd - deliveredCostUsd;
    const netProfitLbp = netProfitUsd * exchangeRate;

    const isPg = db.isPostgres;
    const dateExpr = isPg ? "TO_CHAR(created_at, 'YYYY-MM-DD')" : "DATE(created_at)";
    const monthExpr = isPg ? "TO_CHAR(created_at, 'YYYY-MM')" : "strftime('%Y-%m', created_at)";

    const dailySales = await db.allAsync(`
      SELECT ${dateExpr} as date, COUNT(id) as count, SUM(total_usd) as revenue_usd, SUM(total_cost_usd) as cost_usd
      FROM orders
      WHERE status = 'delivered'
      GROUP BY ${dateExpr}
      ORDER BY date DESC
      LIMIT 30
    `);

    const monthlySales = await db.allAsync(`
      SELECT ${monthExpr} as month, COUNT(id) as count, SUM(total_usd) as revenue_usd, SUM(total_cost_usd) as cost_usd
      FROM orders
      WHERE status = 'delivered'
      GROUP BY ${monthExpr}
      ORDER BY month DESC
      LIMIT 12
    `);

    let inventory = null;
    try {
      inventory = await db.getAsync(`
        SELECT 
          COUNT(id) as total_products,
          SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(stock) as total_stock_items,
          SUM(CASE WHEN ${isPg ? "TO_CHAR(created_at, 'YYYY-MM-DD') = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')" : "DATE(created_at) = DATE('now', 'localtime')"} THEN 1 ELSE 0 END) as products_added_today
        FROM products
      `);
    } catch (e) {
      inventory = await db.getAsync(`
        SELECT 
          COUNT(id) as total_products,
          SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(stock) as total_stock_items
        FROM products
      `);
    }

    let totalViews = 0;
    let uniqueVisitors = 0;
    let newVisitorsToday = 0;
    let viewsToday = 0;

    try {
      let viewsStats = null;
      try {
        viewsStats = await db.getAsync(`
          SELECT 
            COUNT(id) as total_views,
            COUNT(DISTINCT visitor_id) as unique_visitors,
            COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE THEN visitor_id END) as new_visitors_today,
            COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as views_today
          FROM page_views
        `);
      } catch (e) {
        viewsStats = await db.getAsync(`
          SELECT 
            COUNT(id) as total_views,
            COUNT(DISTINCT visitor_id) as unique_visitors,
            COUNT(DISTINCT CASE WHEN date(created_at) = date('now') THEN visitor_id END) as new_visitors_today,
            COUNT(CASE WHEN date(created_at) = date('now') THEN 1 END) as views_today
          FROM page_views
        `);
      }

      if (viewsStats) {
        totalViews = parseInt(viewsStats.total_views || 0, 10);
        uniqueVisitors = parseInt(viewsStats.unique_visitors || 0, 10);
        newVisitorsToday = parseInt(viewsStats.new_visitors_today || 0, 10);
        viewsToday = parseInt(viewsStats.views_today || 0, 10);
      }
    } catch (e) {
      console.error('Error fetching page views stats:', e);
    }

    const settingsRow = await db.getAsync('SELECT visitor_baseline_count FROM settings WHERE id = 1').catch(() => null);
    const baseline = parseInt(settingsRow?.visitor_baseline_count || 0, 10);
    const cumulativeVisitors = baseline + uniqueVisitors;
    const cumulativeViews = baseline + totalViews;

    // Calculate supplier breakdown from delivered orders
    const deliveredOrders = await db.allAsync("SELECT items FROM orders WHERE status = 'delivered'");
    const supplierStatsMap = {};
    (deliveredOrders || []).forEach(o => {
      try {
        const items = JSON.parse(o.items || '[]');
        items.forEach(it => {
          const sName = it.merchant_name || 'عام / Direct';
          if (!supplierStatsMap[sName]) {
            supplierStatsMap[sName] = {
              name: sName,
              items_sold: 0,
              total_revenue_usd: 0,
              total_cost_usd: 0,
              profit_usd: 0
            };
          }
          const rev = Number(it.price_usd || 0) * it.quantity;
          const cost = Number(it.cost_price_usd || 0) * it.quantity;
          supplierStatsMap[sName].items_sold += it.quantity;
          supplierStatsMap[sName].total_revenue_usd += rev;
          supplierStatsMap[sName].total_cost_usd += cost;
          supplierStatsMap[sName].profit_usd += (rev - cost);
        });
      } catch (e) {}
    });
    const supplierBreakdown = Object.values(supplierStatsMap);

    res.json({
      summary: {
        total_orders: stats.total_orders || 0,
        delivered_revenue_usd: deliveredRevenueUsd,
        delivered_revenue_lbp: stats.delivered_revenue_lbp || 0,
        pending_revenue_usd: stats.pending_revenue_usd || 0,
        pending_orders: stats.pending_orders || 0,
        delivered_orders: stats.delivered_orders || 0,
        estimated_profit_usd: netProfitUsd, // Exact net profit in USD
        estimated_profit_lbp: netProfitLbp,  // Exact net profit in LBP
        total_views: cumulativeViews,
        views_today: viewsToday,
        unique_visitors: cumulativeVisitors,
        new_visitors_today: newVisitorsToday,
        visitor_baseline_count: baseline,
        total_products: inventory?.total_products || 0,
        products_added_today: inventory?.products_added_today || 0,
        out_of_stock: inventory?.out_of_stock || 0
      },
      dailySales,
      monthlySales,
      supplierBreakdown,
      inventory: {
        total_products: inventory?.total_products || 0,
        products_added_today: inventory?.products_added_today || 0,
        out_of_stock: inventory?.out_of_stock || 0,
        total_stock_items: inventory?.total_stock_items || 0
      }
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error_ar: 'خطأ في حساب التقارير والأرباح', error_en: 'Error calculating reports and earnings' });
  }
};
