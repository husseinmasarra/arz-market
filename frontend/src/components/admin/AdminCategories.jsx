import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Edit3, Image, GripVertical, Save, ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';

export default function AdminCategories() {
  const { lang, apiBase, apiHost } = useApp();
  const { token } = useAuth();

  const [categories, setCategories] = useState([]);
  const [orderedCategories, setOrderedCategories] = useState([]);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Expanded parents in tree view
  const [expandedParents, setExpandedParents] = useState({});

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // ESC closes form
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && isEditing) resetForm(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isEditing]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${apiBase}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        setOrderedCategories(data);
        setOrderChanged(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // Build tree
  const topLevel = orderedCategories.filter(c => !c.parent_id);
  const childMap = {};
  orderedCategories.forEach(c => {
    if (c.parent_id) {
      if (!childMap[c.parent_id]) childMap[c.parent_id] = [];
      childMap[c.parent_id].push(c);
    }
  });

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnter = (e, index) => {
    dragOverItem.current = index;
    e.preventDefault();
  };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;
    const newOrder = [...topLevel];
    const dragged = newOrder.splice(dragItem.current, 1)[0];
    newOrder.splice(dragOverItem.current, 0, dragged);
    const children = orderedCategories.filter(c => c.parent_id);
    setOrderedCategories([...newOrder, ...children]);
    setOrderChanged(true);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const order = orderedCategories.map((c, idx) => ({ id: c.id, sort_order: idx }));
      const res = await fetch(`${apiBase}/categories-reorder`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
      if (res.ok) { setOrderChanged(false); await fetchCategories(); }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleFileChange = (e) => { setSelectedFile(e.target.files[0]); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameAr || !nameEn) return;
    const formData = new FormData();
    formData.append('name_ar', nameAr);
    formData.append('name_en', nameEn);
    formData.append('parent_id', parentId || 'null');
    if (selectedFile) formData.append('category_image', selectedFile);
    const url = isEditing ? `${apiBase}/categories/${editingId}` : `${apiBase}/categories`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      if (res.ok) { resetForm(); fetchCategories(); }
    } catch (err) { console.error('Submit category error:', err); }
  };

  const handleEdit = (category) => {
    setIsEditing(true);
    setEditingId(category.id);
    setNameAr(category.name_ar);
    setNameEn(category.name_en);
    setParentId(category.parent_id || '');
    setSelectedFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا التصنيف؟' : 'Delete this category?')) return;
    try {
      const res = await fetch(`${apiBase}/categories/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) fetchCategories();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setIsEditing(false); setEditingId(null);
    setNameAr(''); setNameEn(''); setParentId(''); setSelectedFile(null);
  };

  const toggleExpanded = (id) => setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));

  const renderRow = (c, isChild = false, dragIndex = null) => {
    const imageUrl = c.image_url
      ? (c.image_url.startsWith('http') || c.image_url.startsWith('data:') ? c.image_url : `${apiHost}${c.image_url}`)
      : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=50&q=80';
    const hasChildren = !isChild && childMap[c.id]?.length > 0;
    const isExpanded = expandedParents[c.id];
    const childCount = childMap[c.id]?.length || 0;

    return (
      <React.Fragment key={c.id}>
        <tr
          draggable={!isChild}
          onDragStart={!isChild ? (e) => handleDragStart(e, dragIndex) : undefined}
          onDragEnter={!isChild ? (e) => handleDragEnter(e, dragIndex) : undefined}
          onDragOver={!isChild ? handleDragOver : undefined}
          onDrop={!isChild ? handleDrop : undefined}
          style={{
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.9rem',
            backgroundColor: isChild ? 'rgba(0,0,0,0.03)' : 'transparent',
            cursor: !isChild ? 'grab' : 'default',
          }}
        >
          <td style={{ padding: '8px', width: '36px', textAlign: 'center' }}>
            {isChild
              ? <span style={{ color: 'var(--text-light)', fontSize: '0.8rem', paddingInlineStart: '8px' }}>└</span>
              : <GripVertical size={16} style={{ color: 'var(--text-light)' }} />}
          </td>
          <td style={{ padding: '8px' }}>
            <img src={imageUrl} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain', backgroundColor: 'white', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
          </td>
          <td style={{ padding: '8px', fontWeight: isChild ? '500' : '700' }}>
            {hasChildren ? (
              <button onClick={() => toggleExpanded(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: '700', padding: 0 }}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {isExpanded ? <FolderOpen size={14} color="#2563eb" /> : <Folder size={14} color="#2563eb" />}
                {lang === 'ar' ? c.name_ar : c.name_en}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: '400' }}>({childCount})</span>
              </button>
            ) : (
              <span style={{ paddingInlineStart: isChild ? '8px' : '20px' }}>
                {lang === 'ar' ? c.name_ar : c.name_en}
              </span>
            )}
          </td>
          <td style={{ padding: '8px', fontSize: '0.8rem' }}>
            {c.parent_id
              ? <span style={{ color: 'var(--text-light)' }}>{lang === 'ar' ? c.parent_name_ar : c.parent_name_en}</span>
              : <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.75rem' }}>✓ رئيسي</span>}
          </td>
          <td style={{ padding: '8px', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.8rem' }}>
            {c.sort_order ?? '-'}
          </td>
          <td style={{ padding: '8px', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => handleEdit(c)} style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}><Edit3 size={16} /></button>
              <button onClick={() => handleDelete(c.id)} style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && childMap[c.id].map(child => renderRow(child, true))}
      </React.Fragment>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Form */}
      <div className="dashboard-card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px' }}>
          {isEditing ? (lang === 'ar' ? '✏️ تعديل التصنيف' : '✏️ Edit Category') : (lang === 'ar' ? '➕ إضافة تصنيف جديد' : '➕ Add New Category')}
        </h4>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label className="input-label">الاسم (العربية) *</label>
            <input type="text" required className="input-field" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: هواتف وإكسسوارات" />
          </div>
          <div>
            <label className="input-label">Name (English) *</label>
            <input type="text" required className="input-field" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Phones & Accessories" />
          </div>
          <div>
            <label className="input-label">التصنيف الرئيسي (اختياري — للتصنيفات الفرعية فقط)</label>
            <select className="input-field" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">-- تصنيف رئيسي مستقل --</option>
              {categories.filter(c => !c.parent_id && c.id !== editingId).map(c => (
                <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Image size={14} /><span>صورة التصنيف</span></label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="input-field" style={{ padding: '6px' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="submit" style={{ padding: '10px 24px', backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
              {isEditing ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (lang === 'ar' ? 'إضافة التصنيف' : 'Add Category')}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} style={{ padding: '10px 24px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Order changed banner */}
      {orderChanged && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '10px', padding: '12px 20px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '0.95rem' }}>
            🔄 {lang === 'ar' ? 'تم تغيير الترتيب — اضغط حفظ لتطبيقه' : 'Order changed — click Save to apply'}
          </span>
          <button onClick={handleSaveOrder} disabled={savingOrder} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: savingOrder ? 'not-allowed' : 'pointer' }}>
            <Save size={16} />
            {savingOrder ? '...' : (lang === 'ar' ? 'حفظ الترتيب' : 'Save Order')}
          </button>
        </div>
      )}

      {/* Tree Table */}
      <div className="dashboard-card" style={{ overflowX: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '800' }}>
            {lang === 'ar' ? `قائمة التصنيفات (${categories.length} تصنيف)` : `Categories (${categories.length} total)`}
          </h4>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>🖱️ اسحب وأفلت الصفوف لتغيير الترتيب</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-light)', fontSize: '0.82rem' }}>
              <th style={{ padding: '10px', width: '36px' }}></th>
              <th style={{ padding: '10px', textAlign: 'start' }}>أيقونة</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>التصنيف</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>النوع</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>الترتيب</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>العمليات</th>
            </tr>
          </thead>
          <tbody>
            {topLevel.map((c, idx) => renderRow(c, false, idx))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
