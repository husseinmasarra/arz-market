const db = require('../config/db');
const { fileToBase64 } = require('../utils/fileHelper');

exports.getSettings = async (req, res) => {
  try {
    const settings = await db.getAsync('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    if (!settings) {
      return res.status(404).json({ error_ar: 'الإعدادات غير متوفرة', error_en: 'Settings not available' });
    }

    // Live visitor statistics calculation
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
      console.error('Error calculating visitor stats for settings:', e);
    }

    const baseline = parseInt(settings.visitor_baseline_count || 0, 10);
    const cumulativeVisitors = baseline + uniqueVisitors;
    const cumulativeViews = baseline + totalViews;

    res.json({
      ...settings,
      hero_banners: JSON.parse(settings.hero_banners || '[]'),
      visitor_count: cumulativeVisitors,
      unique_visitors: cumulativeVisitors,
      new_visitors_today: newVisitorsToday,
      total_views: cumulativeViews,
      views_today: viewsToday,
      visitor_baseline_count: baseline,
      show_visitor_counter: settings.show_visitor_counter !== 0 ? 1 : 0,
      show_out_of_stock_on_home: settings.show_out_of_stock_on_home !== 0 ? 1 : 0
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error_ar: 'خطأ في جلب الإعدادات', error_en: 'Error fetching settings' });
  }
};

exports.updateSettings = async (req, res) => {
  const { 
    app_name, 
    exchange_rate, 
    free_delivery_threshold, 
    delivery_fee, 
    online_payment_enabled, 
    contact_email,
    supplier_catalog_url,
    supplier_catalog_passcode,
    supplier_markup_percent,
    visitor_baseline_count,
    show_visitor_counter,
    show_out_of_stock_on_home
  } = req.body;

  try {
    const settings = await db.getAsync('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    const id = settings ? settings.id : 1;

    let logoUrl = settings ? settings.logo_url : '';
    if (req.file) {
      logoUrl = fileToBase64(req.file) || (settings ? settings.logo_url : '');
    }

    const appName = app_name || (settings ? settings.app_name : 'Arz-Mart');
    const exRate = exchange_rate ? parseFloat(exchange_rate) : (settings ? settings.exchange_rate : 89500);
    const freeThreshold = free_delivery_threshold !== undefined ? parseFloat(free_delivery_threshold) : (settings ? settings.free_delivery_threshold : 50);
    const delFee = delivery_fee !== undefined ? parseFloat(delivery_fee) : (settings ? settings.delivery_fee : 4);
    const payEnabled = online_payment_enabled !== undefined ? parseInt(online_payment_enabled) : (settings ? settings.online_payment_enabled : 0);
    const contactEmail = contact_email !== undefined ? contact_email : (settings ? settings.contact_email : 'info@arz-mart.com');
    const supplierUrl = supplier_catalog_url !== undefined ? supplier_catalog_url : (settings?.supplier_catalog_url || 'https://drphonewholesale.online');
    const supplierPass = supplier_catalog_passcode !== undefined ? supplier_catalog_passcode : (settings?.supplier_catalog_passcode || 'Drphone123');
    const supplierMarkup = supplier_markup_percent !== undefined ? parseFloat(supplier_markup_percent) : (settings?.supplier_markup_percent || 45);
    const baselineCount = visitor_baseline_count !== undefined ? parseInt(visitor_baseline_count, 10) : (settings?.visitor_baseline_count || 0);
    const showCounter = show_visitor_counter !== undefined ? parseInt(show_visitor_counter, 10) : (settings?.show_visitor_counter !== undefined ? settings.show_visitor_counter : 1);
    const showOutOfStock = show_out_of_stock_on_home !== undefined ? parseInt(show_out_of_stock_on_home, 10) : (settings?.show_out_of_stock_on_home !== undefined ? settings.show_out_of_stock_on_home : 1);

    if (settings) {
      await db.runAsync(`
        UPDATE settings 
        SET app_name = ?, logo_url = ?, exchange_rate = ?, free_delivery_threshold = ?, delivery_fee = ?, online_payment_enabled = ?, contact_email = ?,
            supplier_catalog_url = ?, supplier_catalog_passcode = ?, supplier_markup_percent = ?,
            visitor_baseline_count = ?, show_visitor_counter = ?, show_out_of_stock_on_home = ?
        WHERE id = ?
      `, [appName, logoUrl, exRate, freeThreshold, delFee, payEnabled, contactEmail, supplierUrl, supplierPass, supplierMarkup, baselineCount, showCounter, showOutOfStock, id]);
    } else {
      await db.runAsync(`
        INSERT INTO settings (app_name, logo_url, exchange_rate, free_delivery_threshold, delivery_fee, online_payment_enabled, contact_email, hero_banners, supplier_catalog_url, supplier_catalog_passcode, supplier_markup_percent, visitor_baseline_count, show_visitor_counter, show_out_of_stock_on_home)
        VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?)
      `, [appName, logoUrl, exRate, freeThreshold, delFee, payEnabled, contactEmail, supplierUrl, supplierPass, supplierMarkup, baselineCount, showCounter, showOutOfStock]);
    }

    res.json({
      message_ar: 'تم تحديث الإعدادات بنجاح',
      message_en: 'Settings updated successfully',
      settings: {
        app_name: appName,
        logo_url: logoUrl,
        exchange_rate: exRate,
        free_delivery_threshold: freeThreshold,
        delivery_fee: delFee,
        online_payment_enabled: payEnabled,
        contact_email: contactEmail,
        supplier_catalog_url: supplierUrl,
        supplier_catalog_passcode: supplierPass,
        supplier_markup_percent: supplierMarkup,
        visitor_baseline_count: baselineCount,
        show_visitor_counter: showCounter
      }
    });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error_ar: 'خطأ أثناء تحديث الإعدادات', error_en: 'Error updating settings' });
  }
};

exports.updateBanners = async (req, res) => {
  const { banners } = req.body; // Expect JSON array of banner configurations

  try {
    const settings = await db.getAsync('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    if (!settings) {
      return res.status(404).json({ error_ar: 'الإعدادات غير موجودة', error_en: 'Settings not found' });
    }

    let bannerArray = [];
    try {
      bannerArray = typeof banners === 'string' ? JSON.parse(banners) : banners;
    } catch (e) {
      return res.status(400).json({ error_ar: 'صيغة البانرات غير صالحة', error_en: 'Invalid banners format' });
    }

    // If new files are uploaded, map them to respective banner configurations
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // e.g., fieldname could specify ID or index like banner_image_someid or banner_image_0
        const match = file.fieldname.match(/banner_image_(.+)/);
        if (match) {
          const key = match[1];
          // Try to find by unique banner ID first
          let banner = bannerArray.find(b => b.id === key);
          if (banner) {
            banner.image = fileToBase64(file) || banner.image;
          } else {
            // Fallback: try to match by index if key is numeric
            const index = parseInt(key, 10);
            if (!isNaN(index) && bannerArray[index]) {
              bannerArray[index].image = fileToBase64(file) || bannerArray[index].image;
            } else {
              // Delete unused uploaded files
              fileToBase64(file);
            }
          }
        }
      });
    }

    await db.runAsync(
      'UPDATE settings SET hero_banners = ? WHERE id = ?',
      [JSON.stringify(bannerArray), settings.id]
    );

    res.json({
      message_ar: 'تم تحديث البانرات الإعلانية بنجاح',
      message_en: 'Hero banners updated successfully',
      banners: bannerArray
    });
  } catch (err) {
    console.error('Update banners error:', err);
    res.status(500).json({ error_ar: 'خطأ أثناء تحديث البانرات الإعلانية', error_en: 'Error updating banners' });
  }
};

exports.trackHit = async (req, res) => {
  const { visitor_id, url } = req.body;
  if (!visitor_id) {
    return res.status(400).json({ error: 'visitor_id is required' });
  }
  try {
    await db.runAsync('INSERT INTO page_views (visitor_id, url) VALUES (?, ?)', [visitor_id, url || '']);
    res.json({ success: true });
  } catch (err) {
    console.error('Error tracking page hit:', err);
    res.status(500).json({ error: 'Database error' });
  }
};
