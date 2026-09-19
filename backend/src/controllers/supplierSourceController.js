const db = require('../config/db');
const { syncDrPhoneToArzMart } = require('../utils/drphone_sync_service');

exports.getSources = async (req, res) => {
  try {
    const sources = await db.allAsync(`
      SELECT s.*, 
        COALESCE(
          (SELECT COUNT(*) FROM products p 
           WHERE p.merchant_id = (SELECT id FROM merchants m WHERE m.name = s.name LIMIT 1)
          ), 0
        ) as products_count
      FROM supplier_sources s
      ORDER BY s.is_default DESC, s.id ASC
    `);
    res.json(sources);
  } catch (err) {
    console.error('getSources error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createSource = async (req, res) => {
  const { name, url, passcode, markup_percent, sync_type } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error_ar: 'الاسم والرابط مطلوبان', error_en: 'Name and URL are required' });
  }

  try {
    let cleanUrl = url.trim().replace(/\/+$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const cleanName = name.trim();
    const cleanPass = (passcode || '').trim();
    const markup = Number(markup_percent) >= 0 ? Number(markup_percent) : 45;
    const type = sync_type || 'drphone_catalog';

    const result = await db.runAsync(
      "INSERT INTO supplier_sources (name, url, passcode, markup_percent, sync_type, is_default) VALUES (?, ?, ?, ?, ?, 0)",
      [cleanName, cleanUrl, cleanPass, markup, type]
    );

    // Ensure merchant exists
    const existingMerchant = await db.getAsync("SELECT id FROM merchants WHERE name = ?", [cleanName]);
    if (!existingMerchant) {
      await db.runAsync(
        "INSERT INTO merchants (name, company, email, phone) VALUES (?, ?, ?, ?)",
        [cleanName, cleanUrl, '', '']
      );
    }

    const newSource = await db.getAsync("SELECT * FROM supplier_sources WHERE id = ?", [result.lastID]);
    res.status(201).json(newSource);
  } catch (err) {
    console.error('createSource error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateSource = async (req, res) => {
  const { id } = req.params;
  const { name, url, passcode, markup_percent, sync_type } = req.body;
  try {
    const source = await db.getAsync("SELECT * FROM supplier_sources WHERE id = ?", [id]);
    if (!source) {
      return res.status(404).json({ error_ar: 'الموقع غير موجود', error_en: 'Source not found' });
    }

    let cleanUrl = url !== undefined ? url.trim().replace(/\/+$/, '') : source.url;
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const cleanName = name !== undefined ? name.trim() : source.name;
    const cleanPass = passcode !== undefined ? passcode.trim() : source.passcode;
    const markup = markup_percent !== undefined ? Number(markup_percent) : source.markup_percent;
    const type = sync_type !== undefined ? sync_type : source.sync_type;

    await db.runAsync(
      "UPDATE supplier_sources SET name = ?, url = ?, passcode = ?, markup_percent = ?, sync_type = ? WHERE id = ?",
      [cleanName, cleanUrl, cleanPass, markup, type, id]
    );

    const updated = await db.getAsync("SELECT * FROM supplier_sources WHERE id = ?", [id]);
    res.json(updated);
  } catch (err) {
    console.error('updateSource error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSource = async (req, res) => {
  const { id } = req.params;
  try {
    const source = await db.getAsync("SELECT * FROM supplier_sources WHERE id = ?", [id]);
    if (!source) {
      return res.status(404).json({ error_ar: 'الموقع غير موجود', error_en: 'Source not found' });
    }
    if (source.is_default === 1) {
      return res.status(400).json({ error_ar: 'لا يمكن حذف المصدر الافتراضي الرئيسي', error_en: 'Cannot delete default primary source' });
    }

    await db.runAsync("DELETE FROM supplier_sources WHERE id = ?", [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('deleteSource error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.syncSource = async (req, res) => {
  const { id } = req.params;
  const { passcode, markupPercent } = req.body || {};
  try {
    const source = await db.getAsync("SELECT * FROM supplier_sources WHERE id = ?", [id]);
    if (!source) {
      return res.status(404).json({ error_ar: 'الموقع غير موجود', error_en: 'Source not found' });
    }

    const effectivePass = passcode !== undefined ? passcode : source.passcode;
    const effectiveMarkup = markupPercent !== undefined ? markupPercent : source.markup_percent;

    const result = await syncDrPhoneToArzMart({
      sourceId: source.id,
      merchantName: source.name,
      url: source.url,
      passcode: effectivePass,
      markupPercent: effectiveMarkup,
      syncType: source.sync_type
    });

    res.json(result);
  } catch (err) {
    console.error('syncSource error:', err);
    res.status(500).json({ error: err.message });
  }
};
