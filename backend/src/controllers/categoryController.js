const db = require('../config/db');
const { fileToBase64 } = require('../utils/fileHelper');

let categoriesCache = null;
let categoriesCacheTime = 0;
const CATEGORY_CACHE_TTL = 60 * 1000; // 60s

function invalidateCategoriesCache() {
  categoriesCache = null;
  categoriesCacheTime = 0;
}
exports.invalidateCategoriesCache = invalidateCategoriesCache;

exports.getCategories = async (req, res) => {
  const now = Date.now();
  if (categoriesCache && (now - categoriesCacheTime < CATEGORY_CACHE_TTL)) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json(categoriesCache);
  }

  try {
    const categories = await db.allAsync(`
      SELECT c.*, p.name_ar as parent_name_ar, p.name_en as parent_name_en 
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ORDER BY COALESCE(c.sort_order, 0) ASC, c.id DESC
    `);
    categoriesCache = categories;
    categoriesCacheTime = now;
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error_ar: 'خطأ في جلب التصنيفات', error_en: 'Error fetching categories' });
  }
};

exports.createCategory = async (req, res) => {
  const { name_ar, name_en, parent_id, code, active, sort_order } = req.body;
  const imageUrl = req.file ? fileToBase64(req.file) : '';

  if (!name_ar || !name_en) {
    return res.status(400).json({ error_ar: 'الرجاء إدخال اسم التصنيف باللغتين', error_en: 'Please enter category name in both languages' });
  }

  const pid = parent_id && parent_id !== 'null' ? parseInt(parent_id) : null;
  const cActive = active !== undefined ? (parseInt(active) === 0 ? 0 : 1) : 1;
  const cSortOrder = sort_order !== undefined ? parseInt(sort_order) : 0;
  const cCode = code || '';

  try {
    const result = await db.runAsync(
      'INSERT INTO categories (name_ar, name_en, parent_id, image_url, active, sort_order, code) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name_ar, name_en, pid, imageUrl, cActive, cSortOrder, cCode]
    );
    invalidateCategoriesCache();
    res.status(201).json({
      message_ar: 'تم إضافة التصنيف بنجاح',
      message_en: 'Category added successfully',
      category: {
        id: result.lastID,
        name_ar,
        name_en,
        parent_id: pid,
        image_url: imageUrl,
        active: cActive,
        sort_order: cSortOrder,
        code: cCode
      }
    });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error_ar: 'خطأ في إضافة التصنيف', error_en: 'Error adding category' });
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name_ar, name_en, parent_id, active, sort_order, code } = req.body;

  try {
    const category = await db.getAsync('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({ error_ar: 'التصنيف غير موجود', error_en: 'Category not found' });
    }

    const updatedNameAr = (name_ar !== undefined && name_ar !== null) ? name_ar : category.name_ar;
    const updatedNameEn = (name_en !== undefined && name_en !== null) ? name_en : category.name_en;
    
    let pid = category.parent_id;
    if (parent_id !== undefined) {
      pid = (parent_id && parent_id !== 'null') ? parseInt(parent_id) : null;
    }

    // Don't allow setting parent to itself
    if (pid === parseInt(id)) {
      return res.status(400).json({ error_ar: 'لا يمكن تعيين التصنيف كأب لنفسه', error_en: 'Category cannot be its own parent' });
    }

    let imageUrl = category.image_url;
    if (req.file) {
      imageUrl = fileToBase64(req.file) || category.image_url;
    }

    const updatedActive = active !== undefined ? (parseInt(active) === 0 ? 0 : 1) : (category.active !== undefined ? category.active : 1);
    const updatedSortOrder = sort_order !== undefined ? parseInt(sort_order) : (category.sort_order || 0);
    const updatedCode = code !== undefined ? code : (category.code || '');

    await db.runAsync(
      'UPDATE categories SET name_ar = ?, name_en = ?, parent_id = ?, image_url = ?, active = ?, sort_order = ?, code = ? WHERE id = ?',
      [updatedNameAr, updatedNameEn, pid, imageUrl, updatedActive, updatedSortOrder, updatedCode, id]
    );

    invalidateCategoriesCache();
    res.json({
      message_ar: 'تم تحديث التصنيف بنجاح',
      message_en: 'Category updated successfully',
      category: {
        id: parseInt(id),
        name_ar: updatedNameAr,
        name_en: updatedNameEn,
        parent_id: pid,
        image_url: imageUrl,
        active: updatedActive,
        sort_order: updatedSortOrder,
        code: updatedCode
      }
    });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error_ar: 'خطأ في تعديل التصنيف', error_en: 'Error updating category' });
  }
};

exports.reorderCategories = async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error_ar: 'بيانات الترتيب غير صحيحة', error_en: 'Invalid order data' });
  }

  try {
    for (const item of order) {
      if (item.id !== undefined && item.sort_order !== undefined) {
        await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
      }
    }
    invalidateCategoriesCache();
    res.json({ message_ar: 'تم حفظ الترتيب بنجاح', message_en: 'Order updated successfully' });
  } catch (err) {
    console.error('Reorder categories error:', err);
    res.status(500).json({ error_ar: 'خطأ في حفظ الترتيب', error_en: 'Error updating order' });
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await db.getAsync('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({ error_ar: 'التصنيف غير موجود', error_en: 'Category not found' });
    }

    // Delete category
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
    // Set parent_id to null for sub-categories
    await db.runAsync('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [id]);
    invalidateCategoriesCache();

    res.json({ message_ar: 'تم حذف التصنيف بنجاح', message_en: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error_ar: 'خطأ في حذف التصنيف', error_en: 'Error deleting category' });
  }
};
